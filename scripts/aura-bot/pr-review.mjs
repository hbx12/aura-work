// PR Review bot — reviews PR title, body, and diff using DeepSeek + repo docs.

import { chat } from "./deepseek.mjs";
import { getPullRequest, getPullRequestDiff, listPullRequestFiles } from "./github.mjs";
import { loadKnowledgeBase, buildContext, listSources } from "./knowledge.mjs";
import { upsertStickyComment } from "./sticky-comment.mjs";

const MARKER = "<!-- aura-bot:pr-review -->";
const OWNER = process.env.AURA_BOT_OWNER || "hbx12";

function getInput(name, fallback) {
  return process.env[name] || fallback;
}

async function main() {
  const prNumber = parseInt(getInput("PR_NUMBER", "0"), 10);
  if (!prNumber) {
    console.error("PR_NUMBER is required");
    process.exit(1);
  }

  console.log(`Reviewing PR #${prNumber}...`);

  const [pr, diff, files, docs] = await Promise.all([
    getPullRequest(prNumber),
    getPullRequestDiff(prNumber),
    listPullRequestFiles(prNumber),
    loadKnowledgeBase(),
  ]);

  const prAuthor = `@${pr.user?.login || "unknown"}`;
  const prTitle = pr.title || "(no title)";
  const prBody = pr.body || "(no body)";

  // Truncate diff for the prompt
  const diffSnippet = diff.length > 8000
    ? diff.slice(0, 8000) + "\n... (diff truncated)"
    : diff;

  const filesList = (files || [])
    .map((f) => `- ${f.filename} (+${f.additions}/-${f.deletions})`)
    .join("\n");

  const context = buildContext(docs, 12000);
  const sourcesChecked = listSources(docs);

  const prompt = `You are ${process.env.AURA_BOT_NAME || "aura-bot"}, a helpful bot for the ${process.env.GITHUB_REPOSITORY} repository. You review pull requests using only the repository documentation as context. Do NOT speculate beyond the docs.

## Repository Knowledge Base
${context || "(No repo docs found)"}

## PR Details
- **Title**: ${prTitle}
- **Author**: ${prAuthor}
- **Files changed**: 
${filesList}

## PR Description
${prBody}

## PR Diff (unified)
\`\`\`diff
${diffSnippet}
\`\`\`

## Instructions
Write a concise PR review. Mention ${prAuthor} at the start.
Include these sections (skip if not applicable):
### Summary
Briefly summarize what this PR does.

### Risks
Highlight any risks: breaking changes, security concerns, removals.

### Missing Tests / Docs
Note if tests or documentation updates are missing.

### Security Notes
Point out security-relevant changes (auth, secrets, input validation, etc.).

### Next Steps
Suggest next steps: tests to add, docs to update, manual QA.

### Sources Checked
${sourcesChecked}

Keep it concise. Do not approve/merge/close. Do NOT use GitHub review tools.`;

  const review = await chat([
    { role: "system", content: "You are a helpful code review assistant. Be concise and factual. Never speculate." },
    { role: "user", content: prompt },
  ]);

  const body = `${MARKER}

${review.trim()}

---
<sub>🤖 ${process.env.AURA_BOT_NAME || "aura-bot"} • Sources checked: see above</sub>`;

  const result = await upsertStickyComment(prNumber, MARKER, body);
  console.log(`PR review comment ${result} for PR #${prNumber}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
