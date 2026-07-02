// Sticky comment — create or update a single bot comment per marker per issue/PR.

import { findAuraBotComment, createIssueComment, updateIssueComment } from "./github.mjs";

/**
 * Post or update a sticky comment.
 * If a comment with the same marker exists, update it — otherwise create.
 * @param {number} issueNumber
 * @param {string} marker - unique marker like "<!-- aura-bot:pr-review -->"
 * @param {string} body - full comment body (must include the marker)
 * @returns {Promise<string>} "created" | "updated" | "skipped"
 */
export async function upsertStickyComment(issueNumber, marker, body) {
  // Ensure marker is in body
  if (!body.includes(marker.trim())) {
    body = marker + "\n\n" + body;
  }

  const existing = await findAuraBotComment(issueNumber, marker);
  if (existing) {
    // Skip if unchanged
    if (existing.body.trim() === body.trim()) {
      return "skipped";
    }
    await updateIssueComment(existing.id, body);
    return "updated";
  }

  await createIssueComment(issueNumber, body);
  return "created";
}
