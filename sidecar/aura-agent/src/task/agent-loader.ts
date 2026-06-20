import fs from "fs";
import path from "path";
import os from "os";

export interface AgentConfig {
  name: string;
  description: string;
  mode: "primary" | "subagent" | "all";
  model?: string;
  prompt?: string;
  temperature?: number;
  steps?: number;
  disable?: boolean;
  tools?: Record<string, boolean>;
  permission?: {
    edit?: "ask" | "allow" | "deny" | string;
    bash?: "ask" | "allow" | "deny" | string | Record<string, "ask" | "allow" | "deny" | string>;
    webfetch?: "ask" | "allow" | "deny" | string;
    task?: Record<string, "ask" | "allow" | "deny" | string>;
  };
  hidden?: boolean;
  color?: string;
  top_p?: number;
  [key: string]: any; // To pass additional model/provider settings
}

const DEFAULT_AGENTS: Record<string, AgentConfig> = {
  build: {
    name: "build",
    description: "أعمال تطوير كاملة مع تفعيل جميع الأدوات",
    mode: "primary",
    color: "primary",
    prompt: "You are the default development agent. You have access to all tools. Solve the user request with high quality and focus.",
  },
  plan: {
    name: "plan",
    description: "تحليل وتخطيط بدون إجراء تغييرات",
    mode: "primary",
    color: "secondary",
    permission: {
      edit: "ask",
      bash: "ask",
    },
    prompt: "You are the planning agent. Analyze the project and layout strategy. Do NOT perform mutations or run command line actions without asking.",
  },
  general: {
    name: "general",
    description: "البحث في أسئلة معقدة وتنفيذ مهام متعددة الخطوات",
    mode: "subagent",
    color: "success",
    tools: {
      todo: false,
    },
    prompt: "You are a general research and implementation subagent. Focus on analyzing, planning, and executing code edits.",
  },
  explore: {
    name: "explore",
    description: "استكشاف قواعد الشفرة وقراءة الملفات فقط",
    mode: "subagent",
    color: "info",
    tools: {
      write: false,
      edit: false,
      bash: false,
    },
    prompt: "You are a read-only codebase explorer. You CANNOT write, edit, or delete files, and you cannot run shell commands.",
  },
  scout: {
    name: "scout",
    description: "البحث في الوثائق الخارجية والتبعيات",
    mode: "subagent",
    color: "warning",
    tools: {
      write: false,
      edit: false,
      bash: false,
    },
    prompt: "You are a read-only documentation scout. You explore dependency repos, check upstream APIs, and read guides.",
  },
  compaction: {
    name: "compaction",
    description: "Context compaction system agent",
    mode: "primary",
    hidden: true,
  },
  title: {
    name: "title",
    description: "Session title generator",
    mode: "primary",
    hidden: true,
  },
  summary: {
    name: "summary",
    description: "Session summary generator",
    mode: "primary",
    hidden: true,
  },
};

function parseYaml(yamlStr: string): any {
  const lines = yamlStr.split("\n");
  const result: any = {};
  let currentSection: string | null = null;
  let currentSubsection: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;

    if (indent === 0) {
      currentSection = null;
      currentSubsection = null;
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (value === "") {
        result[key] = {};
        currentSection = key;
      } else {
        result[key] = parseValue(value);
      }
    } else if (indent === 2 && currentSection) {
      currentSubsection = null;
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (value === "") {
        result[currentSection][key] = {};
        currentSubsection = key;
      } else {
        result[currentSection][key] = parseValue(value);
      }
    } else if (indent === 4 && currentSection && currentSubsection) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, "");
      const value = line.slice(colonIdx + 1).trim();
      result[currentSection][currentSubsection][key] = parseValue(value);
    }
  }
  return result;
}

function parseValue(val: string): any {
  const clean = val.replace(/^['"]|['"]$/g, "").trim();
  if (clean.toLowerCase() === "true") return true;
  if (clean.toLowerCase() === "false") return false;
  if (!isNaN(Number(clean)) && clean !== "") return Number(clean);
  return clean;
}

function parseMarkdownConfig(content: string): { metadata: any; prompt: string } {
  const parts = content.split(/^---\s*$/m);
  if (parts.length >= 3) {
    const yamlStr = parts[1];
    const prompt = parts.slice(2).join("---").trim();
    const metadata = parseYaml(yamlStr);
    return { metadata, prompt };
  }
  return { metadata: {}, prompt: content.trim() };
}

export function loadAgents(projectPath?: string): AgentConfig[] {
  const agentsMap = new Map<string, AgentConfig>();

  // 1. Initialize with built-in default agents
  for (const [id, agent] of Object.entries(DEFAULT_AGENTS)) {
    agentsMap.set(id, { ...agent });
  }

  // 2. Read configs from local project JSON and global JSON
  const home = os.homedir();
  const configPaths = [
    path.join(home, ".config", "aura", "aura.json"),
    path.join(home, ".config", "opencode", "opencode.json"),
  ];
  if (projectPath) {
    configPaths.push(
      path.resolve(projectPath, "aura.json"),
      path.resolve(projectPath, "opencode.json"),
      path.resolve(projectPath, "aura.jsonc"),
    );
  }

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, "utf-8");
        const clean = raw.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1");
        const parsed = JSON.parse(clean);
        if (parsed && typeof parsed.agent === "object") {
          for (const [id, value] of Object.entries(parsed.agent)) {
            if (value && typeof value === "object") {
              const existing = (agentsMap.get(id) || { name: id, mode: "all", description: "" }) as AgentConfig;
              agentsMap.set(id, { ...existing, ...value });
            }
          }
        }
      } catch (err) {
        console.warn(`[agents] Failed to parse config file ${configPath}:`, err);
      }
    }
  }

  // 3. Read Markdown config files from directories
  const mdDirs = [
    path.join(home, ".config", "aura", "agents"),
    path.join(home, ".config", "opencode", "agents"),
  ];
  if (projectPath) {
    mdDirs.push(
      path.resolve(projectPath, ".aura", "agents"),
      path.resolve(projectPath, ".opencode", "agents"),
    );
  }

  for (const dir of mdDirs) {
    if (fs.existsSync(dir)) {
      try {
        const stat = fs.statSync(dir);
        if (stat.isDirectory()) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            if (file.endsWith(".md")) {
              const id = file.slice(0, -3).toLowerCase();
              const fullPath = path.join(dir, file);
              try {
                const content = fs.readFileSync(fullPath, "utf-8");
                const { metadata, prompt } = parseMarkdownConfig(content);
                const existing = (agentsMap.get(id) || { name: id, mode: "all", description: "" }) as AgentConfig;
                agentsMap.set(id, {
                  ...existing,
                  ...metadata,
                  prompt: prompt || existing.prompt,
                });
              } catch (err) {
                console.warn(`[agents] Failed to load agent file ${fullPath}:`, err);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[agents] Failed to read agents directory ${dir}:`, err);
      }
    }
  }

  // Filter out disabled agents and return the list
  return Array.from(agentsMap.values()).filter((a) => !a.disable);
}
