import { access, readFile } from "node:fs/promises";
import path from "node:path";

const repository = process.env.GITHUB_REPOSITORY;
const tag = process.env.RELEASE_TAG;
const token = process.env.GITHUB_TOKEN?.trim();
const verifyRemote = process.env.VERIFY_REMOTE === "1";
const publishRoot = path.resolve("release-publish");
const manifestPath = path.join(publishRoot, "latest.json");
const requiredPlatforms = [
  "windows-x86_64",
  "linux-x86_64",
  "darwin-x86_64",
  "darwin-aarch64",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function requestHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "Aura Work release verifier",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function assetBasename(url) {
  const pathname = new URL(url).pathname;
  const encoded = pathname.split("/").pop() ?? "";
  const basename = decodeURIComponent(encoded);
  if (!basename) throw new Error(`Updater URL does not contain an asset name: ${url}`);
  return basename;
}

async function fetchWithRetry(url, attempts = 8, delayMs = 1500) {
  let lastError = "unknown error";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: requestHeaders(),
      });

      if (response.ok) return response;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = String(error);
    }

    if (attempt < attempts) await sleep(delayMs);
  }

  throw new Error(`Request failed after ${attempts} attempts (${lastError}): ${url}`);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const expectedAssets = new Set(["latest.json"]);
const updaterUrls = new Set();

for (const platform of requiredPlatforms) {
  const entry = manifest.platforms?.[platform];

  if (!entry || typeof entry.url !== "string" || entry.url.length === 0) {
    throw new Error(`latest.json is missing a download URL for ${platform}`);
  }

  if (typeof entry.signature !== "string" || entry.signature.trim().length === 0) {
    throw new Error(`latest.json is missing an updater signature for ${platform}`);
  }

  updaterUrls.add(entry.url);
  expectedAssets.add(assetBasename(entry.url));
}

for (const name of expectedAssets) {
  await access(path.join(publishRoot, name));
  console.log(`Confirmed local release asset: ${name}`);
}

console.log(
  `Validated local updater bundle: ${requiredPlatforms.length} platforms and ${expectedAssets.size} required asset(s).`,
);

if (!verifyRemote) {
  console.log("Skipping remote smoke-check because VERIFY_REMOTE is not enabled.");
  process.exit(0);
}

if (!repository || !tag) {
  console.warn("Skipping remote smoke-check because GITHUB_REPOSITORY or RELEASE_TAG is missing.");
  process.exit(0);
}

const releaseApiUrl = `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`;
let publishedAssets = null;

try {
  const release = await (await fetchWithRetry(releaseApiUrl, 10, 2000)).json();
  publishedAssets = new Set((release.assets ?? []).map((asset) => asset.name));
} catch (error) {
  console.warn(`GitHub Release API is not ready yet; upload verification will remain advisory. ${error}`);
}

if (publishedAssets) {
  for (const name of expectedAssets) {
    if (publishedAssets.has(name)) {
      console.log(`Confirmed uploaded release asset through GitHub API: ${name}`);
    } else {
      console.warn(`GitHub Release API has not exposed required asset yet: ${name}`);
    }
  }
}

async function warnIfPublicDownloadIsDelayed(url) {
  try {
    await fetchWithRetry(url, 6, 1500);
    console.log(`Verified public updater download: ${url}`);
  } catch (error) {
    console.warn(`Public GitHub download is not ready yet; CDN propagation can take a short time. ${error}`);
  }
}

await warnIfPublicDownloadIsDelayed(
  `https://github.com/${repository}/releases/download/${tag}/latest.json`,
);

for (const url of updaterUrls) {
  await warnIfPublicDownloadIsDelayed(url);
}

console.log("Completed advisory remote updater smoke-check.");
