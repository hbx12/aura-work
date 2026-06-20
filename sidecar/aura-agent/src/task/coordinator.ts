import fs from "fs";
import path from "path";
import os from "os";
import type { ProviderCredentials } from "../types.js";
import { getAdapter } from "../providers/index.js";
import type { ProviderId } from "@aura-os/shared";
import { isFileTask } from "./extract-writes.js";
import { coerceAgentResponse } from "./coerce-response.js";
import { BLOCKED_INVALID_STRUCTURE, extractJson } from "./model-response.js";
import { getSystemPrompt, getPlannerSystemPrompt } from "./prompts/index.js";

export interface PlanStep {
  title: string;
  subtitle?: string;
  role?: string;
}

export interface TaskPlanRequest {
  prompt: string;
  projectId: string;
  projectPath?: string;
  providerId: string;
  modelId: string;
  credentials: ProviderCredentials;
}

export interface TaskIterateRequest {
  prompt: string;
  plan: PlanStep[];
  steps: unknown[];
  messages: { role: string; content: string; agentRole?: string }[];
  iteration: number;
  projectId: string;
  projectPath?: string;
  taskId?: string;
  providerId: string;
  modelId: string;
  credentials: ProviderCredentials;
  workspaceFiles?: string;
  skills?: { name: string; description: string; prompt: string }[];
  allowPlainText?: boolean;
  responseLanguage?: string;
  onChunk?: (text: string) => void;
}

// Helper function to resolve glob patterns (e.g. packages/*/AGENTS.md)
function resolveGlob(pattern: string, baseDir: string): string[] {
  const normalizedPattern = pattern.replace(/\\/g, "/");
  const parts = normalizedPattern.split("/");
  
  let currentDirs = [baseDir];
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    
    const nextDirs: string[] = [];
    
    if (part.includes("*")) {
      const isLast = i === parts.length - 1;
      const regex = new RegExp("^" + part.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
      
      for (const dir of currentDirs) {
        try {
          if (!fs.existsSync(dir)) continue;
          const stat = fs.statSync(dir);
          if (!stat.isDirectory()) continue;
          
          const entries = fs.readdirSync(dir);
          for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const entryStat = fs.statSync(fullPath);
            
            if (isLast) {
              if (entryStat.isFile() && regex.test(entry)) {
                nextDirs.push(fullPath);
              }
            } else {
              if (entryStat.isDirectory() && (part === "*" || regex.test(entry))) {
                nextDirs.push(fullPath);
              }
            }
          }
        } catch {
          // ignore error
        }
      }
      currentDirs = nextDirs;
    } else {
      for (const dir of currentDirs) {
        const fullPath = path.join(dir, part);
        if (fs.existsSync(fullPath)) {
          nextDirs.push(fullPath);
        }
      }
      currentDirs = nextDirs;
    }
  }
  
  return currentDirs.filter(p => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
}

// Fetch remote file via HTTP/HTTPS with timeout
async function fetchRemoteInstruction(url: string): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      return await res.text();
    }
  } catch (err) {
    console.warn(`[rules] Failed to fetch remote instruction from ${url}:`, err);
  }
  return undefined;
}

// Read rules based on priority and configurations
async function findProjectRules(projectPath?: string): Promise<string | undefined> {
  let projectRulesContent = "";

  // 1. Check local rule files (AURA.md, AGENTS.md, CLAUDE.md, etc.)
  let localRulesFileContent = "";
  if (projectPath) {
    const filesToTry = [
      "AURA.md",
      "AGENTS.md",
      "CLAUDE.md",
      "CONTINUE.md",
      ".cursorrules",
      ".windsurfrules",
      ".aura/rules.md",
    ];
    for (const file of filesToTry) {
      const fullPath = path.resolve(projectPath, file);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          if (content.trim()) {
            localRulesFileContent = content;
            break;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // 2. Check global rules files (in ~/.config/aura/AURA.md, ~/.config/aura/AGENTS.md, and fallbacks)
  let globalRulesFileContent = "";
  const home = os.homedir();
  const globalPathsToTry = [
    path.join(home, ".config", "aura", "AURA.md"),
    path.join(home, ".config", "aura", "AGENTS.md"),
    path.join(home, ".config", "opencode", "AGENTS.md"), // fallback
    path.join(home, ".claude", "CLAUDE.md"), // fallback
  ];
  for (const fullPath of globalPathsToTry) {
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.trim()) {
          globalRulesFileContent = content;
          break;
        }
      } catch {
        // ignore
      }
    }
  }

  // Choose project-local rule content or fallback to global rule content
  if (localRulesFileContent) {
    projectRulesContent = localRulesFileContent;
  } else if (globalRulesFileContent) {
    projectRulesContent = globalRulesFileContent;
  }

  // 3. Check for aura.json (or opencode.json as fallback) to load extra instructions
  const configInstructions: string[] = [];
  if (projectPath) {
    const configsToTry = [
      path.resolve(projectPath, "aura.json"),
      path.resolve(projectPath, "opencode.json"),
      path.resolve(projectPath, "aura.jsonc"),
    ];
    for (const configPath of configsToTry) {
      if (fs.existsSync(configPath)) {
        try {
          const raw = fs.readFileSync(configPath, "utf-8");
          // Simple JSON comment stripping if jsonc
          const clean = raw.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1");
          const parsed = JSON.parse(clean);
          if (parsed && Array.isArray(parsed.instructions)) {
            configInstructions.push(...parsed.instructions);
            break;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // Also check global configs: ~/.config/aura/aura.json or ~/.config/opencode/opencode.json
  const globalConfigsToTry = [
    path.join(home, ".config", "aura", "aura.json"),
    path.join(home, ".config", "opencode", "opencode.json"),
  ];
  for (const configPath of globalConfigsToTry) {
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.instructions)) {
          configInstructions.push(...parsed.instructions);
          break;
        }
      } catch {
        // ignore
      }
    }
  }

  // 4. Resolve instructions (could be local paths, globs, or remote URLs)
  const resolvedInstructions: string[] = [];
  for (const inst of configInstructions) {
    if (inst.startsWith("http://") || inst.startsWith("https://")) {
      const content = await fetchRemoteInstruction(inst);
      if (content) {
        resolvedInstructions.push(content);
      }
    } else if (projectPath) {
      // It's a local file path or glob pattern
      const matches = resolveGlob(inst, projectPath);
      for (const filePath of matches) {
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          if (content.trim()) {
            resolvedInstructions.push(content);
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // Merge everything together
  let finalRules = projectRulesContent;
  if (resolvedInstructions.length > 0) {
    finalRules += (finalRules ? "\n\n" : "") + resolvedInstructions.join("\n\n");
  }

  return finalRules || undefined;
}

const SUBAGENT_ROLES = [
  "coordinator",
  "research",
  "coder",
  "reviewer",
  "security",
  "data",
  "document",
  "browser",
  "computer",
] as const;

function blocked(content: string) {
  return {
    type: "blocked" as const,
    role: "coordinator",
    content,
    summary: content,
    complete: false,
  };
}

function localizedInvalidStructure(prompt: string, responseLanguage?: string) {
  const isArabic =
    responseLanguage?.toLowerCase().startsWith("arabic") || /[\u0600-\u06ff]/.test(prompt);
  return isArabic
    ? "النموذج لم يرجع إجراء أدوات صالحاً. أوقف Aura Work التنفيذ حتى لا ينشئ ملفات وهمية أو يخمن تعديلات."
    : BLOCKED_INVALID_STRUCTURE.content;
}

function fallbackPlan(prompt: string): { plan: PlanStep[]; coordinatorMessage: string } {
  const lower = prompt.toLowerCase();
  const plan: PlanStep[] = [
    {
      title: "Understand the request",
      subtitle: "Parse goal and project context",
      role: "coordinator",
    },
    {
      title: "Inspect relevant files",
      subtitle: "Read and search project files",
      role: "research",
    },
  ];

  if (lower.includes("edit") || lower.includes("fix") || lower.includes("implement") || lower.includes("code")) {
    plan.push({
      title: "Apply code changes",
      subtitle: "Propose focused edits and verify them",
      role: "coder",
    });
  }

  plan.push(
    {
      title: "Review changes",
      subtitle: "Verify correctness and regressions",
      role: "reviewer",
    },
    {
      title: "Summarize deliverables",
      subtitle: "Report files changed and next steps",
      role: "coordinator",
    },
  );

  return {
    plan,
    coordinatorMessage: `I've prepared a ${plan.length}-step plan for your task. Review and approve to begin.`,
  };
}

function summarizeMessageForContext(message: { role: string; content: string; agentRole?: string }) {
  const content = message.content.length > 1_500
    ? `${message.content.slice(0, 1_500)}\n...[truncated ${message.content.length - 1_500} chars]`
    : message.content;
  return `${message.role}${message.agentRole ? ` (${message.agentRole})` : ""}: ${content}`;
}

export async function generatePlan(req: TaskPlanRequest) {
  const adapter = getAdapter(req.providerId as ProviderId);
  const system = getPlannerSystemPrompt();

  try {
    const result = await adapter.chat(
      {
        model: req.modelId,
        messages: [
          { role: "system", content: system },
          { role: "user", content: req.prompt },
        ],
      },
      req.credentials,
    );
    const parsed = extractJson(result.text) as {
      plan?: PlanStep[];
      coordinatorMessage?: string;
    } | null;
    if (parsed?.plan?.length) {
      return {
        plan: parsed.plan,
        coordinatorMessage:
          parsed.coordinatorMessage ??
          "Plan ready. Approve to start execution.",
      };
    }
  } catch (e) {
    console.warn("[task] plan LLM failed, using fallback:", e);
  }
  return fallbackPlan(req.prompt);
}

export async function iterateTask(req: TaskIterateRequest) {
  const adapter = getAdapter(req.providerId as ProviderId);
  const planText = req.plan.map((s, i) => `${i + 1}. [${s.role ?? "coordinator"}] ${s.title}`).join("\n");
  const history = req.messages
    .slice(-8)
    .map(summarizeMessageForContext)
    .join("\n");

  const skillsXml = req.skills && req.skills.length > 0
    ? `\nAvailable Agent Skills (use the skill tool to load them if needed):\n<available_skills>\n${req.skills.map(s => `  <skill>\n    <name>${s.name}</name>\n    <description>${s.description}</description>\n  </skill>`).join("\n")}\n</available_skills>`
    : "";

  const projectRules = await findProjectRules(req.projectPath);

  const baseSystem = getSystemPrompt(
    req.providerId,
    req.modelId,
    req.iteration,
    planText,
    req.responseLanguage,
    projectRules,
  );
  const system = `${baseSystem}${skillsXml}`;

  const userContent = `Task: ${req.prompt}

Workspace files:
${req.workspaceFiles || "(none found)"}

Recent context:
${history || "(none yet)"}

Execute the next logical step. Prefer tools for file operations.
If the user asks to create, edit, or scaffold code/files, call write_file in this iteration when you have enough context.`;

  try {
    const result = await adapter.chat(
      {
        model: req.modelId,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        onChunk: req.onChunk,
      },
      req.credentials,
    );

    const coerced = coerceAgentResponse(result.text, {
      prompt: req.prompt,
      messages: req.messages,
      iteration: req.iteration,
      planLength: req.plan.length,
    });
    if (coerced) {
      if (
        coerced.type === "blocked" &&
        coerced.content === BLOCKED_INVALID_STRUCTURE.content
      ) {
        return {
          ...blocked(localizedInvalidStructure(req.prompt, req.responseLanguage)),
          usage: result.usage,
        };
      }
      return { ...coerced, usage: result.usage };
    }

    if (req.allowPlainText && !isFileTask(req.prompt)) {
      return {
        type: "complete" as const,
        role: "reviewer",
        content: result.text.trim(),
        summary: result.text.trim(),
        complete: true,
        usage: result.usage,
      };
    }
  } catch (e) {
    console.warn("[task] iterate LLM failed:", e);
  }

  return blocked(localizedInvalidStructure(req.prompt, req.responseLanguage));
}
