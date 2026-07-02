// Issue Triage — classify and reply to new issues using DeepSeek + repo docs.

import { chat } from "./deepseek.mjs";
import { getIssue, listIssueComments, createIssueComment } from "./github.mjs";
import { loadKnowledgeBase, buildContext, listSources, detectLanguage } from "./knowledge.mjs";
import { findAuraBotComment } from "./github.mjs";

const MARKER = "<!-- aura-bot:issue-triage -->";

async function main() {
  const issueNumber = parseInt(process.env.ISSUE_NUMBER || "0", 10);
  if (!issueNumber) {
    console.error("ISSUE_NUMBER is required");
    process.exit(1);
  }

  console.log(`Triaging issue #${issueNumber}...`);

  // Don't reply to self
  const existing = await findAuraBotComment(issueNumber, MARKER);
  if (existing) {
    console.log(`Already triaged issue #${issueNumber}, skipping.`);
    process.exit(0);
  }

  const [issue, docs] = await Promise.all([
    getIssue(issueNumber),
    loadKnowledgeBase(),
  ]);

  const issueTitle = issue.title || "";
  const issueBody = issue.body || "(no body)";
  const issueAuthor = `@${issue.user?.login || "unknown"}`;

  const contributorText = [issueTitle, issueBody].join("\n");
  const lang = detectLanguage(contributorText);
  const langInstruction = lang === "ar"
    ? "Reply in Arabic. The contributor wrote in Arabic."
    : "Reply in English.";

  const context = buildContext(docs, 12000);
  const sourcesChecked = listSources(docs);

  const prompt = `You are ${process.env.AURA_BOT_NAME || "aura-bot"}, a helpful bot for the ${process.env.GITHUB_REPOSITORY} repository. You triage issues using only the repository documentation as context.

${langInstruction}

## Repository Knowledge Base
${context || "(No repo docs found)"}

## Issue
- **Title**: ${issueTitle}
- **Author**: ${issueAuthor}
- **Labels**: ${(issue.labels || []).map((l) => l.name).join(", ") || "none"}

## Issue Body
${issueBody}

## Instructions
Classify this issue and reply helpfully. Mention ${issueAuthor}.
Include these sections:

### Classification
Type: bug / feature / docs / question / marketplace-submission / other
Priority: high / medium / low (guess based on severity)
Area: which part of the project this affects

### Answer
Answer the question using repository docs if possible. If you cannot find an answer in the docs, say:
"I could not find a clear answer in the repository docs. @hbx12 should confirm."

### Next Steps
Suggest what the author or maintainers should do next.

### Sources Checked
${sourcesChecked}

Be friendly and helpful. Use emoji sparingly. Keep it concise.`;

  const reply = await chat([
    { role: "system", content: `You are a helpful issue triage assistant. Be friendly and concise. Reply in the same language used by the contributor. If the contributor writes Arabic, reply in Arabic. If they write English, reply in English. If mixed, use the dominant language and keep technical terms unchanged.` },
    { role: "user", content: prompt },
  ]);

  const body = `${MARKER}

${reply.trim()}

---
<sub>🤖 ${process.env.AURA_BOT_NAME || "aura-bot"} • Sources checked: see above</sub>`;

  await createIssueComment(issueNumber, body);
  console.log(`Triaged issue #${issueNumber}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
