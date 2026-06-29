/** Detect file-related tasks — does not auto-create files from model output. */

const EXPLICIT_PATH =
  /[`"']?([\w./-]+\.(?:tsx?|jsx?|py|html|css|json|md|rs|go|java|cpp|c|h|vue|svelte|sql|yaml|yml|toml|sh|ps1))[`"']?/i;

const FILE_ACTION =
  /(?:^|[\s؟?،,.!;:])(?:create|make|write|add|build|scaffold|generate|implement|fix|edit|modify|delete|remove|انشئ|أنشئ|انشاء|إنشاء|اكتب|اكتبلي|مبرمج|برمج|عدل|عدّل|عدّللي|احذف|حذف|اضف|أضف|اعمل|يعمل|سوي|سوّ|سوی|سويلي|سوّلي|جدد|حدّث|صحح|صلح|صلّح|ظبط|اضبط|أظبط)(?=$|[\s؟?،,.!;:])/i;

const FILE_OBJECT =
  /(?:file|files|folder|folders|directory|directories|project|app|component|page|route|api|database|schema|code|bug|error|test|readme|ملف|ملفات|فايل|فايلات|مجلد|مجلدات|مشروع|تطبيق|صفحة|مكون|واجهة|كود|برنامج|دالة|مشكلة|خطأ|ثغرة|اختبار|سكربت|سكريبت|ملحق|إعدادات|كونفق|برنامچ)/i;

const CHAT_ONLY =
  /^(?:hello|hi|hey|who are you|what do you do|tell me about yourself|من\s+أنت|من\s+انت|وش\s+تسوي|ايش\s+تسوي|ماذا\s+تفعل|عرفني|تكلم(?:\s+معي)?|مرحبا|مرحباً|هلا|أهلاً|اهلان|سلام|السلام\s+عليكم|صباح\s+الخير|مساء\s+الخير|كيفك|كيف\s+الحال)/i;

function userTaskText(prompt: string): string {
  const wrapped = prompt.match(/Workspace chat request:\s*([\s\S]*?)(?:\n\s*\n|$)/i);
  if (wrapped?.[1]) return wrapped[1].trim();

  const task = prompt.match(/^Task:\s*([\s\S]*?)(?:\n\s*\n|$)/i);
  if (task?.[1]) return task[1].trim();

  return prompt.trim();
}

export function isFileTask(prompt: string): boolean {
  const text = userTaskText(prompt);
  if (!text) return false;
  if (EXPLICIT_PATH.test(text)) return true;
  if (CHAT_ONLY.test(text) && !FILE_OBJECT.test(text)) return false;
  return FILE_ACTION.test(text) && FILE_OBJECT.test(text);
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

export function extractFileWritesFromResponse(
  text: string,
  prompt: string,
): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const blockRe = /```([^\n]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(text)) !== null) {
    const header = match[1] ?? "";
    const content = (match[2] ?? "").replace(/\s+$/, "");
    if (!content.trim()) continue;
    if (header.trim().toLowerCase() === "json") continue;

    let path = headerToPath(header);
    if (!path) {
      path = inferPathFromPrompt(prompt);
    }
    if (!path) {
      const lowerPrompt = prompt.toLowerCase();
      if (
        lowerPrompt.includes("جدول") ||
        lowerPrompt.includes("table") ||
        lowerPrompt.includes("sheet") ||
        lowerPrompt.includes("spreadsheet") ||
        lowerPrompt.includes("excel") ||
        lowerPrompt.includes("csv") ||
        lowerPrompt.includes("ميزانية") ||
        lowerPrompt.includes("رواتب")
      ) {
        path = "spreadsheet.csv";
      } else {
        path = "document.md";
      }
    }
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
