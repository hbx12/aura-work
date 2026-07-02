// Comment Reply — reply to issue comments when @aura-bot is mentioned.

import { chat } from "./deepseek.mjs";
import { getIssue, listIssueComments, createIssueComment } from "./github.mjs";
import { findAuraBotComment } from "./github.mjs";
import { loadKnowledgeBase, buildContext, listSources, detectLanguage } from "./knowledge.mjs";

const MARKER = "<!-- aura-bot:comment-reply -->";
const MAX_REPLIES_PER_ISSUE = 4;
const OWNER = process.env.AURA_BOT_OWNER || "hbx12";

/**
 * Count total aura-bot comments in an issue (any marker).
 */
async function countAuraBotReplies(issueNumber) {
  const comments = await listIssueComments(issueNumber);
  return comments.filter((c) => {
    if (!c.user) return false;
    const isBot = c.user.type === "Bot" || c.user.login?.includes("bot") || c.user.login === "github-actions";
    if (!isBot) return false;
    // Match any aura-bot marker
    return /<!-- aura-bot:/.test(c.body || "");
  }).length;
}

async function main() {
  const issueNumber = parseInt(process.env.ISSUE_NUMBER || "0", 10);
  const commentBody = process.env.COMMENT_BODY || "";
  const commentAuthor = process.env.COMMENT_AUTHOR || "unknown";
  const commentId = parseInt(process.env.COMMENT_ID || "0", 10);

  if (!issueNumber || !commentBody) {
    console.error("ISSUE_NUMBER and COMMENT_BODY are required");
    process.exit(1);
  }

  console.log(`Processing comment #${commentId} on issue #${issueNumber}...`);

  // Anti-spam: don't reply to bot comments
  if (commentAuthor.includes("bot") || commentAuthor === "github-actions") {
    console.log("Comment is from a bot, skipping.");
    process.exit(0);
  }

  // Check if @aura-bot is mentioned or if it's a clear question
  const botName = process.env.AURA_BOT_NAME || "aura-bot";
  const isMentioned = commentBody.includes(`@${botName}`);
  const looksLikeQuestion = /(?:\bhow\b|\bwhat\b|\bwhy\b|\bwhere\b|\bwhen\b|\bcan (?:you|i|we)\b|\?)/i.test(commentBody);

  // Rate limit: max 4 aura-bot replies per issue, unless owner explicitly mentions the bot
  const replyCount = await countAuraBotReplies(issueNumber);
  const ownerMentionOverride = commentAuthor === OWNER && isMentioned;

  if (replyCount >= MAX_REPLIES_PER_ISSUE) {
    if (!ownerMentionOverride) {
      console.log(`Rate limit reached (${replyCount}/${MAX_REPLIES_PER_ISSUE} replies), skipping non-owner comment.`);
      process.exit(0);
    }
    console.log(`Rate limit reached but owner mention override detected (@${OWNER}) — allowing reply.`);
  }

  if (!isMentioned && !looksLikeQuestion) {
    console.log("Not a mention or question, skipping.");
    process.exit(0);
  }

  // If not mentioned but looks like a question, check if maintainer already replied
  if (!isMentioned && looksLikeQuestion) {
    const comments = await listIssueComments(issueNumber);
    // Check for replies by non-bot users after this comment
    const hasMaintainerReply = comments.some((c) => {
      if (c.user?.type === "Bot" || c.user?.login?.includes("bot")) return false;
      if (c.user?.login === commentAuthor) return false;
      const cDate = new Date(c.created_at);
      const commentDate = new Date(process.env.COMMENT_CREATED_AT || 0);
      return cDate > commentDate;
    });
    if (hasMaintainerReply) {
      console.log("Maintainer already replied, skipping.");
      process.exit(0);
    }
  }

  const [issue, docs] = await Promise.all([
    getIssue(issueNumber),
    loadKnowledgeBase(),
  ]);

  const lang = detectLanguage(commentBody);
  const langInstruction = lang === "ar"
    ? "Reply in Arabic. The contributor wrote in Arabic."
    : "Reply in English.";

  const context = buildContext(docs, 8000);
  const sourcesChecked = listSources(docs);

  const prompt = `You are ${botName}, a helpful bot for the ${process.env.GITHUB_REPOSITORY} repository. You reply to comments using only repository documentation.

${langInstruction}

## Repository Knowledge Base
${context || "(No repo docs found)"}

## Issue Context
- **Title**: ${issue.title}
- **Original body**: ${(issue.body || "").slice(0, 2000)}

## Comment by @${commentAuthor}
${commentBody}

## Instructions
Reply to this comment helpfully. Mention @${commentAuthor}.
If you can answer from the docs, do so. If not, say:
"I could not find a clear answer in the repository docs. @hbx12 should confirm."

Include:
### Sources Checked
${sourcesChecked}

Be friendly and concise.`;

  const reply = await chat([
    { role: "system", content: `You are a helpful assistant replying to GitHub comments. Be concise. Reply in the same language used by the contributor. If the contributor writes Arabic, reply in Arabic. If they write English, reply in English. If mixed, use the dominant language and keep technical terms unchanged.` },
    { role: "user", content: prompt },
  ]);

  const body = `${MARKER}

${reply.trim()}

---
<sub>🤖 ${botName} • Sources checked: see above</sub>`;

  await createIssueComment(issueNumber, body);
  console.log(`Replied to comment #${commentId} on issue #${issueNumber}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
