import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const releaseRoot = path.resolve("release-artifacts");
const version = process.env.RELEASE_VERSION?.replace(/^v/, "");
const tag = process.env.RELEASE_TAG ?? (version ? `v${version}` : undefined);
const repository = process.env.GITHUB_REPOSITORY;

if (!version || !tag || !repository) {
  throw new Error("RELEASE_VERSION, RELEASE_TAG, and GITHUB_REPOSITORY are required.");
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }

  return files;
}

const files = await walk(releaseRoot);
const normalized = (file) => file.replaceAll("\\", "/");
const hasSignature = (file) => files.includes(`${file}.sig`);
const assetUrl = (file) =>
  `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(path.basename(file))}`;

async function platformEntry(file) {
  if (!file || !hasSignature(file)) return null;

  return {
    signature: (await readFile(`${file}.sig`, "utf8")).trim(),
    url: assetUrl(file),
  };
}

const windowsBundle = files.find(
  (file) => normalized(file).includes("/nsis/") && file.endsWith("-setup.exe") && hasSignature(file),
);
const linuxBundle = files.find((file) => file.endsWith(".AppImage") && hasSignature(file));
const macBundle = files.find((file) => file.endsWith(".app.tar.gz") && hasSignature(file));

const windows = await platformEntry(windowsBundle);
const linux = await platformEntry(linuxBundle);
const mac = await platformEntry(macBundle);

if (!windows || !linux || !mac) {
  throw new Error(
    `Missing signed updater artifacts. windows=${Boolean(windows)} linux=${Boolean(linux)} mac=${Boolean(mac)}`,
  );
}

const latest = {
  version,
  notes: `Aura Work ${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": windows,
    "linux-x86_64": linux,
    "darwin-x86_64": mac,
    "darwin-aarch64": mac,
  },
};

await writeFile("latest.json", `${JSON.stringify(latest, null, 2)}\n`, "utf8");
console.log(`Generated latest.json for Aura Work ${version}.`);
