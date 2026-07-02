// GitHub API helper for aura-bot
// Uses the built-in GITHUB_TOKEN and native Node 20 fetch.

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_API = process.env.GITHUB_API_URL || "https://api.github.com";

function headers() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function gh(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${GITHUB_API}/repos/${GITHUB_REPOSITORY}${path}`;
  const res = await fetch(url, {
    headers: headers(),
    ...opts,
  });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} ${url}: ${JSON.stringify(json)}`);
  }
  return json;
}

/** Get a single issue. */
export async function getIssue(issueNumber) {
  return gh(`/issues/${issueNumber}`);
}

/** List comments on an issue. */
export async function listIssueComments(issueNumber, opts = {}) {
  const perPage = opts.per_page || 100;
  return gh(`/issues/${issueNumber}/comments?per_page=${perPage}&sort=created&direction=desc`);
}

/** Create an issue comment. */
export async function createIssueComment(issueNumber, body) {
  return gh(`/issues/${issueNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

/** Update an existing issue comment. */
export async function updateIssueComment(commentId, body) {
  return gh(`/issues/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
}

/** Get a pull request. */
export async function getPullRequest(prNumber) {
  return gh(`/pulls/${prNumber}`);
}

/** List PR review comments. */
export async function listReviewComments(prNumber, opts = {}) {
  const perPage = opts.per_page || 100;
  return gh(`/pulls/${prNumber}/comments?per_page=${perPage}&sort=created&direction=desc`);
}

/** List PR files (diff stats). */
export async function listPullRequestFiles(prNumber, opts = {}) {
  const perPage = opts.per_page || 100;
  return gh(`/pulls/${prNumber}/files?per_page=${perPage}`);
}

/** Get raw diff for a PR (text/plain). */
export async function getPullRequestDiff(prNumber) {
  const url = `${GITHUB_API}/repos/${GITHUB_REPOSITORY}/pulls/${prNumber}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3.diff",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} fetching PR diff`);
  }
  return res.text();
}

/** List repository issues. */
export async function listIssues(opts = {}) {
  const state = opts.state || "open";
  const perPage = opts.per_page || 100;
  const sort = opts.sort || "updated";
  const direction = opts.direction || "desc";
  const since = opts.since || "";
  const labels = opts.labels || "";
  let q = `is:issue repo:${GITHUB_REPOSITORY} state:${state}`;
  if (labels) q += ` label:"${labels}"`;
  const params = new URLSearchParams({ q, sort, order: direction, per_page: String(perPage) });
  const url = `${GITHUB_API}/search/issues?${params}`;
  // Search endpoint is different, needs /search/issues
  const res = await fetch(url, {
    headers: headers(),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(`GitHub search API ${res.status}: ${JSON.stringify(json)}`);
  }
  return res.json();
}

/** List open pull requests. */
export async function listPullRequests(opts = {}) {
  const state = opts.state || "open";
  const perPage = opts.per_page || 100;
  let q = `is:pr repo:${GITHUB_REPOSITORY} state:${state}`;
  const params = new URLSearchParams({ q, sort: "updated", order: "desc", per_page: String(perPage) });
  const url = `${GITHUB_API}/search/issues?${params}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(`GitHub search API ${res.status}: ${JSON.stringify(json)}`);
  }
  return res.json();
}

/**
 * Find an existing aura-bot comment on an issue/PR by marker.
 * @param {number} issueNumber
 * @param {string} marker - e.g. "<!-- aura-bot:pr-review -->"
 * @returns {Promise<{id: number, body: string}|null>}
 */
export async function findAuraBotComment(issueNumber, marker) {
  const comments = await listIssueComments(issueNumber);
  const trimmed = marker.trim();
  for (const c of comments) {
    // Only match aura-bot[bot] comments
    if (c.user?.type === "Bot" && c.user?.login?.includes("aura-bot")) {
      if (c.body && c.body.includes(trimmed)) {
        return { id: c.id, body: c.body };
      }
    }
  }
  return null;
}

/** Get repository file content by path. */
export async function getFileContent(filePath, ref = "main") {
  return gh(`/contents/${filePath}?ref=${ref}`).catch(() => null);
}

/** List files in a directory using the Git trees API. */
export async function listDirectoryFiles(dirPath, ref = "main") {
  // Remove trailing slash
  const clean = dirPath.replace(/\/$/, "");
  try {
    const tree = await gh(`/git/trees/${ref}?recursive=1`);
    return (tree.tree || [])
      .filter((f) => f.type === "blob" && f.path.startsWith(clean + "/"))
      .map((f) => f.path);
  } catch {
    return [];
  }
}
