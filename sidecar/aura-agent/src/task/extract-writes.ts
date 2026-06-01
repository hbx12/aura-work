/** Turn markdown code fences in model output into write_file tool targets. */

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

const EXT_BY_LANG: Record<string, string> = {
  typescript: "ts",
  ts: "ts",
  tsx: "tsx",
  javascript: "js",
  js: "js",
  jsx: "jsx",
  python: "py",
  py: "py",
  html: "html",
  css: "css",
  json: "json",
  rust: "rs",
  go: "go",
  java: "java",
  cpp: "cpp",
  c: "c",
  markdown: "md",
  md: "md",
  shell: "sh",
  bash: "sh",
  sql: "sql",
};

function extFromHeader(header: string): string {
  const lang = header.split(/[:\s]/)[0]?.toLowerCase() ?? "";
  return EXT_BY_LANG[lang] ?? "txt";
}

export function extractFileWritesFromResponse(
  text: string,
  prompt: string,
): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const blockRe = /```([^\n]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = blockRe.exec(text)) !== null) {
    const header = match[1] ?? "";
    const content = (match[2] ?? "").replace(/\s+$/, "");
    if (!content.trim()) continue;
    if (header.trim().toLowerCase() === "json") continue;

    let path = headerToPath(header);
    if (!path) {
      const inferred = inferPathFromPrompt(prompt);
      if (inferred && idx === 0) path = inferred;
    }
    if (!path) {
      const ext = extFromHeader(header);
      path = idx === 0 ? `index.${ext}` : `file-${idx + 1}.${ext}`;
    }
    files.push({ path, content });
    idx += 1;
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
