// Discussion Triage — classify and reply to new discussions.

import { chat } from "./deepseek.mjs";
import { getDiscussion, listDiscussionComments, createDiscussionComment } from "./github.mjs";
import { loadKnowledgeBase, buildContext, listSources, detectLanguage } from "./knowledge.mjs";

const MARKER = "<!-- aura-bot:discussion-triage -->";
const MAX_REPLIES_PER_DISCUSSION = 4;

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
  const botName = process.env.AURA_BOT_NAME || "aura-bot";
  if (!discussionNumber) {
    console.error("DISCUSSION_NUMBER is required");
    process.exit(1);
  }

  const [discussion, docs] = await Promise.all([
    getDiscussion(discussionNumber),
    loadKnowledgeBase(),
  ]);

  if (!discussion?.id) {
    console.error(`Discussion #${discussionNumber} not found`);
    process.exit(1);
  }

  const replyCount = await countAuraBotDiscussionReplies(discussionNumber);
  if (replyCount >= MAX_REPLIES_PER_DISCUSSION) {
    console.log(`Rate limit reached (${replyCount}/${MAX_REPLIES_PER_DISCUSSION}), skipping triage.`);
    process.exit(0);
  }

  const existingComments = await listDiscussionComments(discussionNumber);
  const alreadyTriaged = existingComments.some((c) => (c.body || "").includes(MARKER));
  if (alreadyTriaged) {
    console.log(`Discussion #${discussionNumber} already triaged, skipping.`);
    process.exit(0);
  }

  const discussionAuthor = `@${discussion.author?.login || "unknown"}`;
  const lang = detectLanguage(`${discussion.title || ""}\n${discussion.body || ""}`);
  const langInstruction = lang === "ar"
    ? "Reply in Arabic. The contributor wrote in Arabic."
    : "Reply in English.";

  const context = buildContext(docs, 12000);
  const sourcesChecked = listSources(docs);

  const prompt = `You are ${botName}, a helpful bot for the ${process.env.GITHUB_REPOSITORY} repository. You triage GitHub Discussions using only repository documentation as context.

${langInstruction}

## Discussion
- **Title**: ${discussion.title || ""}
- **Author**: ${discussionAuthor}
- **Body**:
${discussion.body || "(no body)"}

## Repository Knowledge Base
${context || "(No repo docs found)"}

## Instructions
Reply with:
### Classification
Type: question / idea / support / docs / other
Area: affected part of repository

### Answer
Answer from repository docs only. If unsure, say:
"I could not find a clear answer in the repository docs. @hbx12 should confirm."

### Next Steps
Practical next steps for contributor/maintainer.

### Sources Checked
${sourcesChecked}

Safety rules:
- Do not pretend to be Habib.
- Do not make merge/release promises.
- Do not invent answers outside repo docs.
- If unsure, mention @hbx12.

Keep it concise, direct, and maintainer-like. Mention ${discussionAuthor} at the start.`;

  const reply = await chat([
    {
      role: "system",
      content: "You are a helpful discussion triage assistant. Be concise and factual. Reply in the same language used by the contributor. If the contributor writes Arabic, reply in Arabic. If they write English, reply in English. If mixed, use the dominant language and keep technical terms unchanged.",
    },
    { role: "user", content: prompt },
  ]);

  const body = `${MARKER}

${reply.trim()}

---
<sub>🤖 ${botName} • Sources checked: see above</sub>`;

  await createDiscussionComment(discussion.id, body);
  console.log(`Triaged discussion #${discussionNumber}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
