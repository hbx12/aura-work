// Discussion Reply — reply to discussion comments when asked.

import { chat } from "./deepseek.mjs";
import { getDiscussion, listDiscussionComments, createDiscussionComment } from "./github.mjs";
import { loadKnowledgeBase, buildContext, listSources, detectLanguage } from "./knowledge.mjs";

const MARKER = "<!-- aura-bot:discussion-reply -->";
const MAX_REPLIES_PER_DISCUSSION = 4;
const OWNER = process.env.AURA_BOT_OWNER || "hbx12";

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function countAuraBotDiscussionReplies(discussionNumber) {
  const comments = await listDiscussionComments(discussionNumber);
  return comments.filter((c) => {
    const authorLogin = c.author?.login || "";
    const authorType = c.author?.__typename || "";
    const isBot = authorType === "Bot" || authorLogin.includes("bot") || authorLogin === "github-actions";
    if (!isBot) return false;
    return /<!-- aura-bot:/.test(c.body || "");
  }).length;
}

async function main() {
  const discussionNumber = parseInt(process.env.DISCUSSION_NUMBER || "0", 10);
  const commentBody = process.env.COMMENT_BODY || "";
  const commentAuthor = process.env.COMMENT_AUTHOR || "unknown";
  const commentCreatedAt = process.env.COMMENT_CREATED_AT || "";
  const botName = process.env.AURA_BOT_NAME || "aura-bot";

  if (!discussionNumber || !commentBody) {
    console.error("DISCUSSION_NUMBER and COMMENT_BODY are required");
    process.exit(1);
  }

  if (commentAuthor.includes("bot") || commentAuthor === "github-actions") {
    console.log("Comment is from a bot, skipping.");
    process.exit(0);
  }

  const botNamePattern = new RegExp(`(^|\\s)@?${escapeRegex(botName)}(\\b|\\s|$)`, "i");
  const isMentioned = botNamePattern.test(commentBody);
  const looksLikeQuestion = /(?:\bhow\b|\bwhat\b|\bwhy\b|\bwhere\b|\bwhen\b|\bcan (?:you|i|we)\b|[?؟])/i.test(commentBody);

  const replyCount = await countAuraBotDiscussionReplies(discussionNumber);
  const ownerMentionOverride = commentAuthor === OWNER && isMentioned;
  if (replyCount >= MAX_REPLIES_PER_DISCUSSION && !ownerMentionOverride) {
    console.log(`Rate limit reached (${replyCount}/${MAX_REPLIES_PER_DISCUSSION}), skipping reply.`);
    process.exit(0);
  }

  if (!isMentioned && !looksLikeQuestion) {
    console.log("Not a mention or clear question, skipping.");
    process.exit(0);
  }

  const comments = await listDiscussionComments(discussionNumber);
  if (!isMentioned && looksLikeQuestion) {
    const commentDate = new Date(commentCreatedAt || 0);
    const hasMaintainerReply = comments.some((c) => {
      const authorLogin = c.author?.login || "";
      const authorType = c.author?.__typename || "";
      if (authorType === "Bot" || authorLogin.includes("bot")) return false;
      if (authorLogin === commentAuthor) return false;
      return new Date(c.createdAt) > commentDate;
    });
    if (hasMaintainerReply) {
      console.log("Maintainer already replied, skipping.");
      process.exit(0);
    }
  }

  const [discussion, docs] = await Promise.all([
    getDiscussion(discussionNumber),
    loadKnowledgeBase(),
  ]);

  if (!discussion?.id) {
    console.error(`Discussion #${discussionNumber} not found`);
    process.exit(1);
  }

  const lang = detectLanguage(commentBody);
  const langInstruction = lang === "ar"
    ? "Reply in Arabic. The contributor wrote in Arabic."
    : "Reply in English.";
  const context = buildContext(docs, 8000);
  const sourcesChecked = listSources(docs);

  const prompt = `You are ${botName}, a helpful bot for the ${process.env.GITHUB_REPOSITORY} repository. You reply to GitHub Discussion comments using only repository documentation.

${langInstruction}

## Discussion Context
- **Title**: ${discussion.title || ""}
- **Original body**: ${(discussion.body || "").slice(0, 2000)}

## Comment by @${commentAuthor}
${commentBody}

## Repository Knowledge Base
${context || "(No repo docs found)"}

## Instructions
Reply helpfully and mention @${commentAuthor}.
If you can answer from docs, do so. If not, say:
"I could not find a clear answer in the repository docs. @hbx12 should confirm."

### Sources Checked
${sourcesChecked}

Safety rules:
- Do not pretend to be Habib.
- Do not make merge/release promises.
- Do not invent answers outside repo docs.
- If unsure, mention @hbx12.

Keep it concise, direct, and professional.`;

  const reply = await chat([
    {
      role: "system",
      content: "You are a helpful assistant replying to GitHub discussions. Be concise and factual. Reply in the same language used by the contributor. If the contributor writes Arabic, reply in Arabic. If they write English, reply in English. If mixed, use the dominant language and keep technical terms unchanged.",
    },
    { role: "user", content: prompt },
  ]);

  const body = `${MARKER}

${reply.trim()}

---
<sub>🤖 ${botName} • Sources checked: see above</sub>`;

  await createDiscussionComment(discussion.id, body);
  console.log(`Replied in discussion #${discussionNumber}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
