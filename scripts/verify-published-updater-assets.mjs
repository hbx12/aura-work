const tag = process.env.RELEASE_TAG;
const repository = process.env.GITHUB_REPOSITORY;

if (!tag || !repository) {
  throw new Error("RELEASE_TAG and GITHUB_REPOSITORY are required.");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, attempts = 8) {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Aura Work release verifier" },
    });
    lastStatus = response.status;
    if (response.ok) return response;
    if (attempt < attempts) await sleep(1500);
  }
  throw new Error(`Published release asset is not reachable (${lastStatus}): ${url}`);
}

const latestUrl = `https://github.com/${repository}/releases/download/${tag}/latest.json`;
const latest = await (await fetchWithRetry(latestUrl)).json();

const urls = new Set(
  Object.values(latest.platforms ?? {})
    .map((entry) => entry?.url)
    .filter((url) => typeof url === "string" && url.length > 0),
);

if (urls.size === 0) {
  throw new Error("latest.json does not contain updater download URLs.");
}

for (const url of urls) {
  await fetchWithRetry(url);
  console.log(`Verified updater asset: ${url}`);
}

console.log(`Verified latest.json and ${urls.size} updater download asset(s).`);
