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
import { loadAgents, type AgentConfig } from "./agent-loader.js";

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
  activeAgent?: string;
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

  // 3. Check Aura project config to load extra instructions.
  const configInstructions: string[] = [];
  if (projectPath) {
    const configsToTry = [
      path.resolve(projectPath, "aura.json"),
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

  // Also check global Aura config.
  const globalConfigsToTry = [
    path.join(home, ".config", "aura", "aura.json"),
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
  "dispatch",
  "coordinator",
  "research",
  "coder",
  "reviewer",
  "security",
  "data",
  "document",
  "spreadsheet",
  "presentation",
  "pdf",
  "image",
  "design",
  "automation",
  "database",
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

function classifyWorkspaceIntent(prompt: string): {
  mode: typeof SUBAGENT_ROLES[number] | "mixed";
  artifactType: string;
  expectedDeliverable: string;
  needsClarification: boolean;
} {
  const lower = prompt.toLowerCase();
  const hasArabic = /[\u0600-\u06ff]/.test(prompt);
  const includesAny = (terms: string[]) => terms.some((term) => lower.includes(term.toLowerCase()));

  if (includesAny(["جدول", "شيت", "excel", "ميزانية", "مصاريف", "إيرادات", "مبيعات", "فورملا", "csv"])) {
    return { mode: "spreadsheet", artifactType: "csv/xlsx", expectedDeliverable: "spreadsheet artifact", needsClarification: false };
  }
  if (includesAny(["ملف نص", "وورد", "word", "خطاب", "عقد", "تقرير رسمي", "سيرة ذاتية", "policy", "document"])) {
    return { mode: "document", artifactType: "md/docx", expectedDeliverable: "document artifact", needsClarification: false };
  }
  if (includesAny(["عرض", "بوربوينت", "شرائح", "presentation", "slides", "pitch deck"])) {
    return { mode: "presentation", artifactType: "md/pptx", expectedDeliverable: "presentation outline", needsClarification: prompt.length < 80 };
  }
  if (includesAny(["pdf", "لخص الملف", "استخرج الجداول"])) {
    return { mode: "pdf", artifactType: "md/csv", expectedDeliverable: "PDF-derived report", needsClarification: false };
  }
  if (includesAny(["صورة", "بانر", "لوقو", "أيقونة", "بوستر", "إعلان", "image", "logo", "banner"])) {
    return { mode: "image", artifactType: "svg/png brief", expectedDeliverable: "visual artifact", needsClarification: prompt.length < 80 };
  }
  if (includesAny(["ابحث", "قارن", "latest", "أسعار", "شروط", "قوانين", "research", "compare"])) {
    return { mode: "research", artifactType: "md", expectedDeliverable: "cited report", needsClarification: false };
  }
  if (includesAny(["data", "داتا", "تحليل", "رسوم", "dashboard", "json", "dataset"])) {
    return { mode: "data", artifactType: "csv/md", expectedDeliverable: "data analysis report", needsClarification: false };
  }
  if (includesAny(["قاعدة بيانات", "sql", "postgres", "sqlite", "supabase", "neon"])) {
    return { mode: "database", artifactType: "query/report", expectedDeliverable: "database report", needsClarification: true };
  }
  if (includesAny(["ذكّرني", "جدولة", "راقب", "كل يوم", "أرسل", "automation", "schedule", "monitor"])) {
    return { mode: "automation", artifactType: "workflow", expectedDeliverable: "scheduled workflow", needsClarification: true };
  }
  if (includesAny(["افتح موقع", "عب النموذج", "اضغط", "browser", "form", "website"])) {
    return { mode: "browser", artifactType: "browser workflow", expectedDeliverable: "verified browser action", needsClarification: true };
  }

  return {
    mode: includesAny(["edit", "fix", "implement", "code", "bug", "build"]) ? "coder" : "coordinator",
    artifactType: hasArabic ? "ملف أو رد مناسب" : "appropriate response or artifact",
    expectedDeliverable: hasArabic ? "ناتج مناسب للطلب" : "appropriate deliverable",
    needsClarification: false,
  };
}

function fallbackPlan(prompt: string): { plan: PlanStep[]; coordinatorMessage: string } {
  const lower = prompt.toLowerCase();
  const intent = classifyWorkspaceIntent(prompt);
  const plan: PlanStep[] = [
    {
      title: "Classify intent",
      subtitle: `Mode: ${intent.mode}; output: ${intent.artifactType}; deliverable: ${intent.expectedDeliverable}`,
      role: intent.mode === "mixed" ? "dispatch" : "coordinator",
    },
    {
      title: "Inspect relevant files",
      subtitle: "Read and search project files",
      role: intent.mode === "coordinator" ? "research" : intent.mode,
    },
  ];

  if (intent.needsClarification) {
    plan.unshift({
      title: "Clarify requirements",
      subtitle: "Ask only for details that materially affect the artifact, risk, audience, format, or external action.",
      role: "coordinator",
    });
  }

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
    coordinatorMessage: intent.needsClarification
      ? `I classified this as ${intent.mode}. Before execution, confirm the missing format/audience/scope details that affect the result.`
      : `I classified this as ${intent.mode} and prepared a ${plan.length}-step artifact-first plan. Review and approve to begin.`,
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

// Helper function to check if a tool is permitted
function isToolPermitted(toolName: string, args: any, agent: AgentConfig): { permitted: boolean; reason?: string } {
  if (agent.tools) {
    for (const [pattern, enabled] of Object.entries(agent.tools)) {
      if (!enabled) {
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        if (regex.test(toolName)) {
          return { permitted: false, reason: `Tool '${toolName}' is disabled by agent tools policy.` };
        }
      }
    }
  }

  if (agent.permission) {
    if (["write_file", "replace_in_file", "delete_file"].includes(toolName)) {
      if (agent.permission.edit === "deny") {
        return { permitted: false, reason: `File modifications are denied by agent permissions.` };
      }
    }
    
    if (toolName === "browse_url") {
      if (agent.permission.webfetch === "deny") {
        return { permitted: false, reason: `Web browsing is denied by agent permissions.` };
      }
    }

    if (toolName === "run_shell" && agent.permission.bash) {
      const cmd = (args.command || "").trim();
      if (typeof agent.permission.bash === "string") {
        if (agent.permission.bash === "deny") {
          return { permitted: false, reason: `Shell command execution is denied by agent permissions.` };
        }
      } else if (typeof agent.permission.bash === "object") {
        let decision: string | null = null;
        for (const [pattern, value] of Object.entries(agent.permission.bash)) {
          const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
          if (regex.test(cmd)) {
            decision = value as string;
          }
        }
        if (decision === "deny") {
          return { permitted: false, reason: `Shell command '${cmd}' is denied by agent permissions.` };
        }
      }
    }

    if (toolName === "task" || toolName === "plugin_tool" || toolName === "mcp_tool") {
      const subagentName = args.role || args.name || args.toolId || "";
      if (agent.permission.task) {
        let decision: string | null = null;
        for (const [pattern, value] of Object.entries(agent.permission.task)) {
          const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
          if (regex.test(subagentName)) {
            decision = value as string;
          }
        }
        if (decision === "deny") {
          return { permitted: false, reason: `Summoning subagent/task '${subagentName}' is denied by agent permissions.` };
        }
      }
    }
  }

  return { permitted: true };
}

export async function iterateTask(req: TaskIterateRequest) {
  const agents = loadAgents(req.projectPath);
  const activeAgentId = req.activeAgent || "build";
  const agentConfig = agents.find(a => a.name === activeAgentId) || agents.find(a => a.name === "build") || {
    name: "build",
    description: "Development agent",
    mode: "primary" as const
  };

  const modelId = agentConfig.model || req.modelId;
  const providerId = agentConfig.model ? agentConfig.model.split("/")[0] : req.providerId;
  const adapter = getAdapter(providerId as ProviderId);

  // Extract model/provider options
  const customParams: Record<string, any> = {};
  for (const [key, value] of Object.entries(agentConfig)) {
    if (["name", "description", "mode", "model", "prompt", "temperature", "steps", "maxSteps", "disable", "tools", "permission", "hidden", "color", "top_p"].includes(key)) {
      continue;
    }
    customParams[key] = value;
  }

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
    providerId,
    modelId,
    req.iteration,
    planText,
    req.responseLanguage,
    projectRules,
    agentConfig,
  );
  let system = `${baseSystem}${skillsXml}`;

  if (agentConfig.prompt) {
    system = `${system}\n\nACTIVE AGENT SYSTEM PROMPT FOR "${agentConfig.name}":\n${agentConfig.prompt}`;
  }

  const stepsLimit = agentConfig.steps ?? agentConfig.maxSteps;
  if (stepsLimit && req.iteration >= stepsLimit) {
    system += `\n\n[WARNING: STEPS LIMIT REACHED. You have reached the maximum execution steps of ${stepsLimit}. You must NOT call any more tools. Summarize your work and list remaining recommendations, then output 'complete' or 'blocked'.]`;
  }

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
        model: modelId,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        onChunk: req.onChunk,
        temperature: agentConfig.temperature,
        topP: agentConfig.top_p,
        ...customParams,
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

      // Enforce tool permissions gating in sidecar
      if (coerced.type === "tool_calls") {
        for (const call of coerced.toolCalls) {
          const check = isToolPermitted(call.name, call.arguments, agentConfig);
          if (!check.permitted) {
            return {
              type: "blocked" as const,
              role: "coordinator",
              content: check.reason || "Tool execution blocked by agent policy.",
              summary: check.reason || "Tool execution blocked by agent policy.",
              complete: false,
              usage: result.usage,
            };
          }
        }
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
