import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const releaseRoot = path.resolve("release-artifacts");
const publishRoot = path.resolve("release-publish");
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

const allowedSuffixes = [
  ".app.tar.gz.sig",
  ".app.tar.gz",
  ".AppImage.sig",
  ".AppImage",
  ".exe.sig",
  ".exe",
  ".deb",
  ".dmg",
];

const isPublishAsset = (file) => allowedSuffixes.some((suffix) => file.endsWith(suffix));
const sourceFiles = (await walk(releaseRoot)).filter(isPublishAsset);

await rm(publishRoot, { recursive: true, force: true });
await mkdir(publishRoot, { recursive: true });

const seen = new Set();
const files = [];

for (const source of sourceFiles) {
  const basename = path.basename(source);
  if (seen.has(basename)) {
    throw new Error(`Duplicate release asset basename: ${basename}`);
  }
  seen.add(basename);
  const destination = path.join(publishRoot, basename);
  await copyFile(source, destination);
  files.push(destination);
}

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

const windows = await platformEntry(files.find((file) => file.endsWith("-setup.exe") && hasSignature(file)));
const linux = await platformEntry(files.find((file) => file.endsWith(".AppImage") && hasSignature(file)));
const mac = await platformEntry(files.find((file) => file.endsWith(".app.tar.gz") && hasSignature(file)));

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

await writeFile(path.join(publishRoot, "latest.json"), `${JSON.stringify(latest, null, 2)}\n`, "utf8");
console.log(`Staged ${files.length} assets and generated latest.json for Aura Work ${version}.`);
