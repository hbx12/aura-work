import { readFile } from "node:fs/promises";

const tag = process.env.RELEASE_TAG;
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN?.trim();

if (!tag || !repository) {
  throw new Error("RELEASE_TAG and GITHUB_REPOSITORY are required.");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function headers() {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "Aura Work release verifier",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchWithRetry(url, attempts = 12, delayMs = 2000) {
  let lastError = "unknown error";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: headers(),
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

function assetBasename(url) {
  const pathname = new URL(url).pathname;
  const encoded = pathname.split("/").pop() ?? "";
  return decodeURIComponent(encoded);
}

const localManifest = JSON.parse(await readFile("release-publish/latest.json", "utf8"));
const updaterUrls = new Set(
  Object.values(localManifest.platforms ?? {})
    .map((entry) => entry?.url)
    .filter((url) => typeof url === "string" && url.length > 0),
);

if (updaterUrls.size === 0) {
  throw new Error("latest.json does not contain updater download URLs.");
}

const releaseApiUrl = `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`;
const release = await (await fetchWithRetry(releaseApiUrl)).json();
const publishedAssets = new Set((release.assets ?? []).map((asset) => asset.name));
const expectedAssets = new Set(["latest.json"]);

for (const url of updaterUrls) {
  expectedAssets.add(assetBasename(url));
}

for (const name of expectedAssets) {
  if (!publishedAssets.has(name)) {
    throw new Error(`GitHub Release is missing required updater asset: ${name}`);
  }
  console.log(`Confirmed uploaded release asset through GitHub API: ${name}`);
}

async function warnIfPublicDownloadIsDelayed(url) {
  try {
    await fetchWithRetry(url, 8, 1500);
    console.log(`Verified public updater download: ${url}`);
  } catch (error) {
    console.warn(`Public GitHub CDN download is not ready yet; upload exists and will propagate shortly. ${error}`);
  }
}

await warnIfPublicDownloadIsDelayed(
  `https://github.com/${repository}/releases/download/${tag}/latest.json`,
);

for (const url of updaterUrls) {
  await warnIfPublicDownloadIsDelayed(url);
}

console.log(`Verified GitHub Release API upload state for ${expectedAssets.size} required updater asset(s).`);
