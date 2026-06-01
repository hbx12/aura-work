/** Detect file-related tasks — does not auto-create files from model output. */

const CREATE_HINT =
  /\b(create|make|write|add|build|scaffold|generate|implement|fix|edit|code|program|انش|إنش|سوي|اعمل|اكتب|برمج|عدّل|عدل|سوّ|سوی)\b/i;

export function isFileTask(prompt: string): boolean {
  return CREATE_HINT.test(prompt) || /[`"']([\w./-]+\.\w+)[`"']/.test(prompt);
}

export function inferPathFromPrompt(prompt: string): string | null {
  const patterns = [
    /(?:file|ملف|فايل)\s+[`"']?([\w./-]+\.\w+)/i,
    /[`"']([\w./-]+\.\w+)[`"']/,
    /\b([\w./-]+\.(?:tsx?|jsx?|py|html|css|json|md|rs|go|java|cpp|c|h|vue|svelte|sql|yaml|yml|toml|sh|ps1))\b/i,
  ];
  for (const p of patterns) {
    const m = prompt.match(p);
    if (m?.[1]) return m[1].replace(/^\.\//, "");
  }
  return null;
}

function headerToPath(header: string): string | null {
  const h = header.trim();
  if (!h) return null;
  if (h.includes(":")) {
    const after = h.split(":").slice(1).join(":").trim();
    const m = after.match(/([\w./-]+\.\w+)/);
    if (m?.[1]) return m[1].replace(/^\.\//, "");
  }
  const m = h.match(/([\w./-]+\.\w+)/);
  return m?.[1]?.replace(/^\.\//, "") ?? null;
}

/** Legacy helper — only returns writes when the model names an explicit path in a fence header. */
export function extractFileWritesFromResponse(
  text: string,
  _prompt: string,
): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const blockRe = /```([^\n]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(text)) !== null) {
    const header = match[1] ?? "";
    const content = (match[2] ?? "").replace(/\s+$/, "");
    if (!content.trim()) continue;
    if (header.trim().toLowerCase() === "json") continue;

    const path = headerToPath(header);
    if (!path) continue;
    files.push({ path, content });
  }

  return files;
}

export function stripCodeFences(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function briefWriteStatus(paths: string[]): string {
  if (paths.length === 0) return "Working on your files…";
  if (paths.length === 1) return `Creating \`${paths[0]}\`…`;
  return `Creating ${paths.length} files (${paths.map((p) => `\`${p}\``).join(", ")})…`;
}
