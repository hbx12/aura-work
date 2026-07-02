// Knowledge module — loads repository Markdown docs to use as bot context.
// Only reads from whitelisted knowledge sources, never executes PR code.

import { getFileContent, listDirectoryFiles } from "./github.mjs";

const KNOWLEDGE_FILES = [
  "README.md",
  "README.ar.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "LICENSE",
  "NOTICE",
  "ROADMAP.md",
  "CHANGELOG.md",
];

const KNOWLEDGE_DIRS = [
  "docs",
  "registry",
];

/**
 * Load all whitelisted Markdown knowledge files.
 * @returns {Promise<Map<string, string>>} filePath → content
 */
export async function loadKnowledgeBase() {
  const docs = new Map();

  // Load top-level files
  for (const file of KNOWLEDGE_FILES) {
    const res = await getFileContent(file);
    if (res && res.content) {
      const text = Buffer.from(res.content, "base64").toString("utf-8");
      docs.set(file, text);
    }
  }

  // Load docs/ and registry/ Markdown files
  for (const dir of KNOWLEDGE_DIRS) {
    const files = await listDirectoryFiles(dir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const res = await getFileContent(file);
      if (res && res.content) {
        const text = Buffer.from(res.content, "base64").toString("utf-8");
        docs.set(file, text);
      }
    }
  }

  return docs;
}

/**
 * Build a context string from loaded knowledge files.
 * Truncates each file to fit within token limits.
 * @param {Map<string, string>} docs
 * @param {number} [maxTotalChars=12000] max total characters
 * @returns {string}
 */
export function buildContext(docs, maxTotalChars = 12000) {
  const parts = [];
  let total = 0;

  // Sorted file names for consistent output
  const sorted = [...docs.keys()].sort();
  for (const file of sorted) {
    const content = docs.get(file);
    const header = `\n--- ${file} ---\n`;
    const available = maxTotalChars - total - header.length;
    if (available <= 0) break;
    const snippet = content.length > available ? content.slice(0, available) + "\n... (truncated)" : content;
    parts.push(header + snippet);
    total += header.length + snippet.length;
  }

  return parts.join("");
}

/**
 * Build a short inventory of available knowledge files.
 * @param {Map<string, string>} docs
 * @returns {string}
 */
export function listSources(docs) {
  const sorted = [...docs.keys()].sort();
  return sorted.map((f) => `- ${f}`).join("\n");
}
