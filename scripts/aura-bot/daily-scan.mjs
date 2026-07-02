// Daily Project Health Scan — checks open issues/PRs and reports on project health.

import { chat } from "./deepseek.mjs";
import { listIssues, listPullRequests, listIssueComments, createIssueComment, updateIssueComment, findAuraBotComment } from "./github.mjs";
import { loadKnowledgeBase, buildContext, detectLanguage } from "./knowledge.mjs";

const REPORT_TITLE = "Aura Bot Daily Project Health Report";
const MARKER = "<!-- aura-bot:daily-report -->";
const HOURS_24 = 24 * 60 * 60 * 1000;

async function findOrCreateReportIssue() {
  const result = await listIssues({ state: "open", per_page: 100 });
  for (const item of (result.items || [])) {
    if (item.title === REPORT_TITLE) {
      return item.number;
    }
  }
  return null;
}

async function main() {
  console.log("Running daily project health scan...");

  const [openIssues, openPRs, docs] = await Promise.all([
    listIssues({ state: "open", per_page: 100 }),
    listPullRequests({ state: "open", per_page: 100 }),
    loadKnowledgeBase(),
  ]);

  const now = new Date();
  const cutoff = new Date(now.getTime() - HOURS_24);

  // Find unanswered items older than 24 hours
  const unanswered = [];
  for (const issue of (openIssues.items || [])) {
    if (issue.user?.type === "Bot") continue;
    const created = new Date(issue.created_at);
    if (created > cutoff) continue;

    const comments = await listIssueComments(issue.number, { per_page: 30 });
    const hasMaintainerReply = comments.some(
      (c) => c.user?.type !== "Bot" && c.user?.login !== issue.user?.login
    );
    if (!hasMaintainerReply) {
      unanswered.push({ type: "issue", number: issue.number, title: issue.title, created: issue.created_at });
    }
  }

  for (const pr of (openPRs.items || [])) {
    if (pr.user?.type === "Bot") continue;
    const created = new Date(pr.created_at);
    if (created > cutoff) continue;

    const comments = await listIssueComments(pr.number, { per_page: 30 });
    const hasMaintainerReply = comments.some(
      (c) => c.user?.type !== "Bot" && c.user?.login !== pr.user?.login
    );
    if (!hasMaintainerReply) {
      unanswered.push({ type: "PR", number: pr.number, title: pr.title, created: pr.created_at });
    }
  }

  const context = buildContext(docs, 8000);

  // Detect dominant language from unanswered item titles
  const allTitles = unanswered.map((i) => i.title).join("\n");
  const dominantLang = detectLanguage(allTitles);
  const langInstruction = dominantLang === "ar"
    ? "Reply in Arabic. Most unanswered items are in Arabic."
    : "Reply in English.";

  const prompt = `You are ${process.env.AURA_BOT_NAME || "aura-bot"} for the ${process.env.GITHUB_REPOSITORY} repository.

${langInstruction}

## Project Status
- Open issues: ${openIssues.total_count || 0}
- Open PRs: ${openPRs.total_count || 0}

## Unanswered items (>24 hours old)
${unanswered.length === 0 ? "None — all items have maintainer attention. 🎉" : unanswered.map((i) => `- [${i.type}] #${i.number} ${i.title} (${i.created})`).join("\n")}

## Repository Knowledge
${context || "(No docs)"}

## Instructions
Write a concise daily health report. Include:

### Summary
Brief overall health summary.

### Unanswered Items
${unanswered.length === 0 ? "None." : "List each with a brief note."}

### Recommendations
Actionable suggestions based on docs: stale items to close, docs to update, etc.

Be concise. Do not create panic. Use emoji sparingly.`;

  const report = await chat([
    { role: "system", content: `You are a project health reporter. Be factual and concise. Reply in the same language used by the contributor. If the contributor writes Arabic, reply in Arabic. If they write English, reply in English. If mixed, use the dominant language and keep technical terms unchanged.` },
    { role: "user", content: prompt },
  ]);

  const body = `${MARKER}

${report.trim()}

---
<sub>🤖 ${process.env.AURA_BOT_NAME || "aura-bot"} • Generated ${now.toISOString().split("T")[0]}</sub>`;

  const existingNumber = await findOrCreateReportIssue();

  if (existingNumber) {
    // Find existing report comment and update it
    const existingComment = await findAuraBotComment(existingNumber, MARKER);
    if (existingComment) {
      await updateIssueComment(existingComment.id, body);
      console.log(`Updated daily report comment on issue #${existingNumber}`);
    } else {
      await createIssueComment(existingNumber, body);
      console.log(`Posted daily report comment on issue #${existingNumber}`);
    }
  } else {
    console.log("No daily report issue found. Create one via GitHub UI with title:", REPORT_TITLE);
    console.log("Report body would be:\n", body.slice(0, 500));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
