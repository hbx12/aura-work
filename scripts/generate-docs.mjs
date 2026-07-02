#!/usr/bin/env node
/**
 * Aura Work — Docs Generator
 * Scans the actual codebase and generates beautiful HTML documentation pages.
 * Run: node scripts/generate-docs.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DOCS_DIR = join(ROOT, "docs");
const DOCS_PAGES_DIR = join(DOCS_DIR, "docs");

// ─── Data Sources ───────────────────────────────────────────────────────────────

function readJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function getVersion() {
  const pkg = readJSON(join(ROOT, "package.json"));
  return pkg.version;
}

function getDescription() {
  const pkg = readJSON(join(ROOT, "package.json"));
  return pkg.description;
}

function getSkills() {
  const dir = join(ROOT, "registry", "skills");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const skill = readJSON(join(dir, f));
      return {
        id: skill.id || f.replace(".json", ""),
        name: skill.name || f.replace(".json", ""),
        summary: skill.summary || "",
        description: skill.description || "",
        categories: skill.categories || [],
        tags: skill.tags || [],
        risk: skill.risk || "low",
        tools: skill.tools || [],
        publisher: skill.publisher?.name || "Unknown",
      };
    });
}

function getLanguages() {
  const dir = join(ROOT, "packages", "i18n", "locales");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort();
}

function getLanguageNames() {
  // Native names for each locale
  const names = {
    en: "English",
    ar: "العربية",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    pt: "Português",
    "zh-CN": "简体中文",
    "zh-TW": "繁體中文",
    ja: "日本語",
    ko: "한국어",
    hi: "हिन्दी",
    id: "Bahasa Indonesia",
    tr: "Türkçe",
    ru: "Русский",
    it: "Italiano",
    nl: "Nederlands",
    pl: "Polski",
    vi: "Tiếng Việt",
    th: "ไทย",
    fa: "فارسی",
  };
  return names;
}

function getThemes() {
  return [
    "light", "dark", "amoled", "blue", "high-contrast",
    "cyberpunk", "forest", "pastel", "sunset", "sepia",
    "nord", "dracula", "matrix", "sakura", "sakura-dark",
    "coffee", "ocean", "luxury", "emerald-luxury", "rose-luxury",
    "velvet-luxury", "bronze-luxury", "platinum-luxury", "crimson-luxury",
    "sapphire-luxury", "amethyst-luxury", "amber-luxury",
    "obsidian-gold", "pearl-noir", "jade-silk", "arctic-glass",
    "royal-indigo", "copper-olive", "moonlit-rose", "carbon-teal",
  ];
}

function getThemePreviews() {
  return {
    light: { bg: "#faf9f5", fg: "#28241d", accent: "#c2683f" },
    dark: { bg: "#1e1b16", fg: "#ece7dc", accent: "#cf7a52" },
    amoled: { bg: "#000000", fg: "#f4f4f4", accent: "#3ddc97" },
    blue: { bg: "#f8fbfd", fg: "#172531", accent: "#2563eb" },
    "high-contrast": { bg: "#000000", fg: "#ffffff", accent: "#ffd166" },
    cyberpunk: { bg: "#0a0a1a", fg: "#00ffc8", accent: "#ff00ff" },
    forest: { bg: "#0f1a0f", fg: "#c8dcc8", accent: "#4a9e4a" },
    pastel: { bg: "#f5f0f5", fg: "#3d343d", accent: "#b38cb3" },
    sunset: { bg: "#1a1210", fg: "#f5d0b8", accent: "#e8744a" },
    sepia: { bg: "#f5f0e8", fg: "#3d3528", accent: "#a67c52" },
    nord: { bg: "#2e3440", fg: "#d8dee9", accent: "#88c0d0" },
    dracula: { bg: "#282a36", fg: "#f8f8f2", accent: "#bd93f9" },
    matrix: { bg: "#001500", fg: "#00ff41", accent: "#00ff41" },
    sakura: { bg: "#fdf5f7", fg: "#2d1c24", accent: "#e88ba8" },
    "sakura-dark": { bg: "#1a1115", fg: "#f0dbe3", accent: "#e88ba8" },
    coffee: { bg: "#f5efe6", fg: "#2c2420", accent: "#a67c52" },
    ocean: { bg: "#f0f5fa", fg: "#1c2838", accent: "#3b82f6" },
    luxury: { bg: "#0c0806", fg: "#f5e6d3", accent: "#d4a853" },
    "emerald-luxury": { bg: "#060f0a", fg: "#d4ecd4", accent: "#3ddc84" },
    "rose-luxury": { bg: "#0f0608", fg: "#f5d4dc", accent: "#e85a7a" },
    "velvet-luxury": { bg: "#0a0a14", fg: "#e0d4f5", accent: "#8b5cf6" },
    "bronze-luxury": { bg: "#0f0b06", fg: "#f5e0c8", accent: "#cd7f32" },
    "platinum-luxury": { bg: "#0a0a0f", fg: "#e8e8f0", accent: "#e8e8f0" },
    "crimson-luxury": { bg: "#0f0606", fg: "#f5d4d4", accent: "#dc2626" },
    "sapphire-luxury": { bg: "#06080f", fg: "#d4d4f5", accent: "#3b82f6" },
    "amethyst-luxury": { bg: "#0a0610", fg: "#e0d4f5", accent: "#a855f7" },
    "amber-luxury": { bg: "#0f0c06", fg: "#f5e8c8", accent: "#f59e0b" },
    "obsidian-gold": { bg: "#060608", fg: "#f0e6c8", accent: "#d4a853" },
    "pearl-noir": { bg: "#0a0a0f", fg: "#f0eeea", accent: "#c0b8a8" },
    "jade-silk": { bg: "#060f0c", fg: "#d4ecd4", accent: "#34d399" },
    "arctic-glass": { bg: "#f0f5fa", fg: "#1c2a3a", accent: "#7dd3fc" },
    "royal-indigo": { bg: "#080612", fg: "#e0d4f5", accent: "#6366f1" },
    "copper-olive": { bg: "#0f0a06", fg: "#e8dcc8", accent: "#b87333" },
    "moonlit-rose": { bg: "#0f060c", fg: "#f0dce8", accent: "#f472b6" },
    "carbon-teal": { bg: "#060c0c", fg: "#d4ecec", accent: "#14b8a6" },
  };
}

function getSidecars() {
  return [
    {
      id: "aura-agent",
      name: "Agent Core",
      desc: "Multi-agent orchestration engine managing task lifecycle, sub-agent delegation, LLM routing, and coordinated multi-step execution with planning, review, and execution phases.",
      path: "sidecar/aura-agent/",
      lang: "TypeScript",
    },
    {
      id: "aura-bridge",
      name: "Bridge Server",
      desc: "HTTP API bridge for pairing external clients (CLI, browser extension, Office add-ins). Enables remote task creation, status polling, and session management from outside the desktop app.",
      path: "sidecar/aura-bridge/",
      lang: "TypeScript",
    },
    {
      id: "aura-browser-helper",
      name: "Browser Helper",
      desc: "Headless Chromium browser automation with URL sanitization, profile isolation, content extraction, and safety guards. Used for research tasks and web browsing.",
      path: "sidecar/aura-browser-helper/",
      lang: "TypeScript",
    },
    {
      id: "aura-cloud-sync",
      name: "Cloud Sync",
      desc: "End-to-end encrypted sync service that synchronizes projects, tasks, and settings across devices. Includes dispatch polling for remote task execution.",
      path: "sidecar/aura-cloud-sync/",
      lang: "TypeScript",
    },
    {
      id: "aura-computer-use",
      name: "Computer Use",
      desc: "Desktop automation engine with screen capture, input simulation, window management, and blocklist-based safety filters. Powers the computer-use agent capability.",
      path: "sidecar/aura-computer-use/",
      lang: "TypeScript",
    },
    {
      id: "aura-vm-helper",
      name: "VM Helper",
      desc: "Isolated sandbox environment spawner. Manages VM lifecycle, filesystem mounts, command execution, and output redaction for safe code execution in an isolated guest OS.",
      path: "sidecar/aura-vm-helper/",
      lang: "TypeScript",
    },
    {
      id: "aura-plugins-helper",
      name: "Plugins Helper",
      desc: "Plugin and MCP server lifecycle manager. Handles discovery, installation, manifest parsing, capability registration, and communication with third-party tools.",
      path: "sidecar/aura-plugins-helper/",
      lang: "TypeScript",
    },
    {
      id: "aura-agent",
      name: "Prompt System",
      desc: "Structured prompt template system with specialized roles (planner, executor, reviewer, safety) and quality gates for consistent agent behavior.",
      path: "sidecar/aura-agent/src/task/prompts/",
      lang: "TypeScript",
    },
  ];
}

function getProviders() {
  return [
    {
      id: "aura-cloud",
      name: "Aura Cloud Models",
      desc: "Hosted models via aura.work API. Includes Aura Fast (text+tools), Aura Coder (reasoning), and Aura Premium (vision+reasoning). Requires Aura Cloud sign-in.",
      models: ["aura-fast", "aura-coder", "aura-premium"],
      color: "#c48b5c",
      local: false,
    },
    {
      id: "anthropic",
      name: "Anthropic",
      desc: "Claude Sonnet 4 and Claude 3.5 Haiku. Best-in-class reasoning, code generation, and vision capabilities. API key required.",
      models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
      color: "#c2683f",
      local: false,
    },
    {
      id: "openai",
      name: "OpenAI",
      desc: "GPT-4o and GPT-4o mini. Industry-standard language models with broad tool-calling support. Also supports GitHub Copilot Codex accounts.",
      models: ["gpt-4o", "gpt-4o-mini"],
      color: "#1a7f64",
      local: false,
    },
    {
      id: "gemini",
      name: "Google Gemini",
      desc: "Gemini 2.0 Flash. Google's fast, multimodal model with native vision capabilities. Free tier available via API key.",
      models: ["gemini-2.0-flash"],
      color: "#3a6fc4",
      local: false,
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      desc: "DeepSeek V3. Cost-effective open-weight model with strong reasoning and code generation. API key required.",
      models: ["deepseek-chat"],
      color: "#4b5bb0",
      local: false,
    },
    {
      id: "ollama",
      name: "Ollama",
      desc: "Fully local model runner. Run Llama 3.2, Mistral, CodeLlama, and hundreds of other models on your own hardware. Zero cloud dependency.",
      models: ["llama3.2+"],
      color: "#7a5c8e",
      local: true,
    },
    {
      id: "openai-compatible",
      name: "Custom Endpoint",
      desc: "Any OpenAI-compatible API endpoint. Connect to local inference servers, self-hosted proxies, or any provider with an OpenAI-compatible chat completions API.",
      models: ["Dynamic"],
      color: "#645d4e",
      local: true,
    },
    {
      id: "minimax",
      name: "Minimax",
      desc: "Minimax abab6.5s. Chinese AI provider with competitive language model performance. API key required.",
      models: ["abab6.5s-chat"],
      color: "#e05c2b",
      local: false,
    },
    {
      id: "qwen",
      name: "Qwen",
      desc: "Qwen Plus (DashScope). Alibaba's flagship LLM with strong multilingual capabilities including Chinese and English.",
      models: ["qwen-plus"],
      color: "#4f35b3",
      local: false,
    },
    {
      id: "lmstudio",
      name: "LM Studio",
      desc: "Local model server (http://127.0.0.1:1234). Run any GGUF model from Hugging Face with OpenAI-compatible API. Zero configuration needed.",
      models: ["Dynamic"],
      color: "#1988a2",
      local: true,
    },
  ];
}

function getRoutingPolicies() {
  return [
    {
      id: "quality-first",
      title: "Quality-first",
      subtitle: "Best model for the job. Default.",
      desc: "The routing engine selects the most capable model available across all enabled providers. Optimizes for result quality over cost. Best for complex coding tasks, research, and critical work.",
    },
    {
      id: "cost-first",
      title: "Cost-first",
      subtitle: "Cheapest model that can do the task.",
      desc: "Routes to the most affordable model that meets the minimum capability requirements (text, tool-calling, etc.). Ideal for bulk processing, routine tasks, and experimentation.",
    },
    {
      id: "privacy-first",
      title: "Privacy-first",
      subtitle: "Prefer local; redact secrets before cloud.",
      desc: "Prioritizes local models (Ollama, LM Studio) for sensitive tasks. When cloud models must be used, sensitive data is automatically redacted. Best for confidential projects.",
    },
    {
      id: "local-only",
      title: "Local-only",
      subtitle: "Ollama/LM Studio only. No cloud requests.",
      desc: "Strict air-gapped mode. Only local models are used. All data stays on your machine. Network requests to cloud providers are blocked entirely.",
    },
    {
      id: "manual",
      title: "Manual model",
      subtitle: "Use the model you pick per provider.",
      desc: "Full manual control. You select exactly which model to use for each provider. The routing engine defers to your choice without any automatic model selection.",
    },
  ];
}

function getPermissionProfiles() {
  return [
    {
      id: "read-only",
      name: "Read-only files",
      desc: "File read access to all paths. Agents can analyze code, search files, and read documentation — but cannot write or execute anything.",
      grants: [{ category: "file", action: "read", target: "*" }],
    },
    {
      id: "safe-automation",
      name: "Safe automation",
      desc: "Read and write file access plus shell read access. Agents can edit code, create files, and inspect shell output — full development workflow without execution.",
      grants: [
        { category: "file", action: "read", target: "*" },
        { category: "file", action: "write", target: "*" },
        { category: "shell", action: "read", target: "*" },
      ],
    },
    {
      id: "research",
      name: "Research (read + browse)",
      desc: "File read access plus browser automation. Agents can search the web, browse documentation, and analyze local files — but cannot write or execute.",
      grants: [
        { category: "file", action: "read", target: "*" },
        { category: "browser", action: "browse", target: "*" },
      ],
    },
  ];
}

// ─── CSS Templates ──────────────────────────────────────────────────────────────

function getBaseCSS() {
  return `
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{--font-mono:"JetBrains Mono",ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace;--font-sans:"Inter","IBM Plex Sans",system-ui,-apple-system,sans-serif;--font-display:"Outfit","IBM Plex Sans",system-ui,sans-serif;--color-bg:#faf9f5;--color-bg-weak:#f5f3ec;--color-bg-card:#ffffff;--color-bg-strong:#1e1b16;--color-text:#5c5544;--color-text-weak:#938a76;--color-text-strong:#28241d;--color-text-inverted:#faf9f5;--color-border:#e7e1d3;--color-border-weak:rgba(40,36,29,0.08);--color-accent:#c2683f;--color-accent-warm:#cf7a52;--color-accent-subtle:rgba(194,104,63,0.11);--color-plum:#7a5c8e;--color-success:#4f7d47;--color-warning:#a9761f;--color-danger:#b8482f;--shadow-sm:0 1px 2px rgba(54,46,32,0.06);--shadow-md:0 4px 16px rgba(54,46,32,0.09);--shadow-lg:0 16px 40px rgba(54,46,32,0.13);--shadow-xl:0 24px 60px rgba(54,46,32,0.16)}
@media(prefers-color-scheme:dark){:root{--color-bg:#161310;--color-bg-weak:#1e1b16;--color-bg-card:#25221c;--color-bg-strong:#ece7dc;--color-text:#a89e8b;--color-text-weak:#756c5b;--color-text-strong:#ece7dc;--color-text-inverted:#161310;--color-border:#322d25;--color-border-weak:rgba(236,231,220,0.08);--color-accent:#cf7a52;--color-accent-warm:#c2683f;--color-accent-subtle:rgba(207,122,82,0.16);--color-plum:#b794cc;--shadow-sm:0 1px 2px rgba(0,0,0,0.45);--shadow-md:0 4px 14px rgba(0,0,0,0.50);--shadow-lg:0 14px 38px rgba(0,0,0,0.60);--shadow-xl:0 20px 50px rgba(0,0,0,0.65)}}
html{scroll-behavior:smooth;scroll-padding-top:5rem}
body{font-family:var(--font-sans);background:var(--color-bg);color:var(--color-text);line-height:1.7;-webkit-font-smoothing:antialiased}
.page{max-width:1200px;margin:0 auto;padding:0 2rem}
@media(max-width:48rem){.page{padding:0 1rem}}

/* Header */
header{position:sticky;top:0;z-index:100;background:rgba(250,249,245,0.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--color-border-weak);padding:0 2rem}
@media(prefers-color-scheme:dark){header{background:rgba(22,19,16,0.88)}}
.header-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:3.5rem}
.logo{display:flex;align-items:center;gap:8px;text-decoration:none;font-family:var(--font-mono);font-weight:600;color:var(--color-text-strong);font-size:1rem}
.logo-mark{display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:var(--color-accent);color:#fff;border-radius:4px;font-size:.875rem;font-weight:700}
header nav ul{display:flex;align-items:center;gap:1.5rem;list-style:none}
header nav a{text-decoration:none;font-size:.8125rem;color:var(--color-text);font-weight:500;transition:color .15s}
header nav a:hover{color:var(--color-text-strong)}
header nav a.active{color:var(--color-accent)}

/* Hero */
.hero{padding:5rem 0 3rem;text-align:center}
.hero h1{font-family:var(--font-display);font-size:3.25rem;font-weight:700;color:var(--color-text-strong);letter-spacing:-.03em;line-height:1.1;margin-bottom:1.25rem}
.hero h1 span{background:linear-gradient(135deg,var(--color-accent),var(--color-plum));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero .subtitle{font-size:1.125rem;color:var(--color-text);max-width:32rem;margin:0 auto 2rem;line-height:1.7}
.hero .meta-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;background:var(--color-accent-subtle);border:1px solid var(--color-accent);border-radius:100px;font-family:var(--font-mono);font-size:.75rem;color:var(--color-accent);margin-bottom:1.5rem}
@media(max-width:48rem){.hero h1{font-size:2rem}.hero{padding:3rem 0 2rem}}

/* Section styles */
.section{padding:4rem 0;border-bottom:1px solid var(--color-border-weak)}
.section:last-child{border-bottom:none}
.section-label{font-family:var(--font-mono);font-size:.6875rem;text-transform:uppercase;letter-spacing:.1em;color:var(--color-text-weak);margin-bottom:.75rem;display:flex;align-items:center;gap:8px}
.section-label::before{content:'';display:inline-block;width:24px;height:1px;background:var(--color-border)}
.section h2{font-family:var(--font-display);font-size:2rem;font-weight:700;color:var(--color-text-strong);letter-spacing:-.02em;margin-bottom:.75rem}
.section h2 .count{font-family:var(--font-mono);font-size:1rem;font-weight:400;color:var(--color-text-weak);letter-spacing:0}
.section>p{max-width:40rem;margin-bottom:2.5rem;font-size:1rem;color:var(--color-text);line-height:1.8}

/* Cards grid */
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1px;background:var(--color-border-weak);border:1px solid var(--color-border-weak);border-radius:8px;overflow:hidden}
.card{background:var(--color-bg-card);padding:1.5rem;transition:all .25s ease;position:relative}
.card:hover{background:var(--color-bg-weak);transform:translateY(-2px)}
.card .card-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.125rem;font-weight:700;color:#fff;margin-bottom:.75rem;font-family:var(--font-mono)}
.card h3{font-size:.9375rem;font-weight:600;color:var(--color-text-strong);margin-bottom:.375rem;font-family:var(--font-sans)}
.card .card-sub{font-size:.75rem;color:var(--color-text-weak);font-family:var(--font-mono);margin-bottom:.5rem}
.card p{font-size:.8125rem;color:var(--color-text);line-height:1.6}
.card .tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:.75rem}
.card .tags span{padding:2px 8px;font-size:.625rem;font-family:var(--font-mono);background:var(--color-bg-weak);border:1px solid var(--color-border-weak);border-radius:4px;color:var(--color-text-weak)}

/* Full-width detail cards */
.detail-card{background:var(--color-bg-card);border:1px solid var(--color-border-weak);border-radius:8px;padding:2rem;margin-bottom:1.5rem;transition:all .25s ease}
.detail-card:hover{border-color:var(--color-accent);box-shadow:var(--shadow-md)}
.detail-card h3{font-size:1.125rem;font-weight:600;color:var(--color-text-strong);margin-bottom:.5rem;display:flex;align-items:center;gap:8px}
.detail-card .meta{font-family:var(--font-mono);font-size:.75rem;color:var(--color-text-weak);margin-bottom:.75rem;display:flex;gap:1rem;flex-wrap:wrap}
.detail-card .meta span{display:flex;align-items:center;gap:4px}
.detail-card p{font-size:.875rem;color:var(--color-text);line-height:1.7;margin-bottom:.75rem}
.detail-card ul{padding-left:1.25rem;font-size:.8125rem;color:var(--color-text);line-height:1.8}
.detail-card code{font-family:var(--font-mono);font-size:.75rem;background:var(--color-bg-weak);padding:2px 6px;border-radius:3px;border:1px solid var(--color-border-weak)}

/* Table styles */
.table-wrap{overflow-x:auto;border:1px solid var(--color-border-weak);border-radius:8px}
table{width:100%;border-collapse:collapse;font-size:.8125rem}
thead{background:var(--color-bg-weak)}
th{padding:.75rem 1rem;text-align:left;font-weight:600;color:var(--color-text-strong);font-family:var(--font-mono);font-size:.6875rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--color-border-weak)}
td{padding:.75rem 1rem;color:var(--color-text);border-bottom:1px solid var(--color-border-weak);vertical-align:top}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--color-bg-weak)}

/* Stats bar */
.stats-bar{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;background:var(--color-border-weak);border-radius:8px;overflow:hidden;margin-bottom:3rem}
.stat-card{background:var(--color-bg-card);padding:1.5rem;text-align:center}
.stat-card .num{font-size:2rem;font-weight:700;color:var(--color-text-strong);font-family:var(--font-display);letter-spacing:-.02em}
.stat-card .lbl{font-size:.6875rem;color:var(--color-text-weak);text-transform:uppercase;letter-spacing:.08em;margin-top:2px;font-family:var(--font-mono)}

/* Theme swatch grid */
.theme-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.theme-swatch{border:1px solid var(--color-border-weak);border-radius:8px;overflow:hidden;transition:all .25s ease;cursor:default}
.theme-swatch:hover{transform:translateY(-3px);box-shadow:var(--shadow-md)}
.theme-swatch .swatch-preview{height:60px;display:flex;align-items:center;justify-content:center;gap:8px;padding:8px}
.theme-swatch .swatch-preview span{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.3)}
.theme-swatch .swatch-info{padding:10px 12px;background:var(--color-bg-card)}
.theme-swatch .swatch-info h4{font-size:.8125rem;font-weight:600;color:var(--color-text-strong);font-family:var(--font-mono)}
.theme-swatch .swatch-info p{font-size:.6875rem;color:var(--color-text-weak);margin-top:2px}

/* Language badges */
.lang-grid{display:flex;flex-wrap:wrap;gap:8px}
.lang-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:var(--color-bg-card);border:1px solid var(--color-border-weak);border-radius:6px;font-size:.8125rem;color:var(--color-text-strong);text-decoration:none;transition:all .2s;font-family:var(--font-mono)}
.lang-badge:hover{border-color:var(--color-accent);color:var(--color-accent);transform:translateY(-1px)}
.lang-badge .rtl-mark{padding:1px 4px;font-size:.5625rem;background:var(--color-accent-subtle);color:var(--color-accent);border-radius:3px;font-weight:600}

/* Provider dot */
.provider-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}

/* Footer */
footer{padding:2rem 0;display:flex;justify-content:space-between;align-items:center;font-size:.75rem;color:var(--color-text-weak);border-top:1px solid var(--color-border-weak);margin-top:3rem}
@media(max-width:48rem){footer{flex-direction:column;gap:.75rem;text-align:center}}
footer a{color:var(--color-text-weak);text-decoration:underline}
footer a:hover{color:var(--color-text-strong)}
footer .links{display:flex;gap:1.25rem}

/* Animations */
.fade-in{opacity:0;transform:translateY(20px);transition:opacity .6s ease,transform .6s ease}
.fade-in.visible{opacity:1;transform:translateY(0)}
.delay-1{transition-delay:.1s}
.delay-2{transition-delay:.2s}
.delay-3{transition-delay:.3s}
.delay-4{transition-delay:.4s}

/* Lang dropdown */
.lang-dropdown{display:none;position:absolute;right:0;top:100%;background:var(--color-bg-card);border:1px solid var(--color-border-weak);border-radius:8px;padding:8px 0;min-width:200px;z-index:200;box-shadow:var(--shadow-lg)}
.lang-dropdown.open{display:block}
.lang-dropdown a{display:flex;padding:6px 16px;font-size:.8125rem;text-decoration:none;color:var(--color-text);transition:background .12s}
.lang-dropdown a:hover{background:var(--color-bg-weak);color:var(--color-text-strong)}
.lang-dropdown a.active{color:var(--color-text-strong);font-weight:600}

/* Theme Toggle */
.theme-toggle{background:none;border:none;color:var(--color-text-weak);cursor:pointer;padding:6px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:all .15s}
.theme-toggle:hover{color:var(--color-text-strong);background:var(--color-bg-weak)}
.theme-toggle .sun{display:none}
.theme-toggle .moon{display:block}
:root.dark .theme-toggle .sun{display:block}
:root.dark .theme-toggle .moon{display:none}
@media(prefers-color-scheme:dark){
  :root:not(.light) .theme-toggle .sun{display:block}
  :root:not(.light) .theme-toggle .moon{display:none}
}

/* Sidebar Layout */
.layout{display:flex;max-width:1200px;margin:0 auto;padding:2rem 0 4rem;gap:3rem}
@media(max-width:48rem){.layout{flex-direction:column;padding:1rem 0;gap:1.5rem}}
.sidebar{width:240px;flex-shrink:0}
@media(max-width:48rem){.sidebar{width:100%}}
.sidebar-nav{display:flex;flex-direction:column;gap:4px;position:sticky;top:5.5rem}
@media(max-width:48rem){.sidebar-nav{position:static;flex-direction:row;flex-wrap:wrap;gap:4px}}
.sidebar-nav a{display:block;padding:6px 12px;border-radius:6px;font-size:.8125rem;font-weight:500;color:var(--color-text);text-decoration:none;transition:all .12s;font-family:var(--font-mono)}
.sidebar-nav a:hover{background:var(--color-bg-weak);color:var(--color-text-strong)}
.sidebar-nav a.active{background:var(--color-accent-subtle);color:var(--color-accent);font-weight:600}
.sidebar-nav .sec{padding:14px 12px 4px;font-size:.625rem;text-transform:uppercase;letter-spacing:.1em;color:var(--color-text-weak);font-family:var(--font-mono);font-weight:600}
@media(max-width:48rem){.sidebar-nav .sec{display:none}.sidebar-nav a{display:inline-block;padding:4px 10px;font-size:.75rem}}
.content{flex:1;min-width:0}

/* Sidebar Search */
.sidebar-search{padding:0 12px 12px}
.sidebar-search input{width:100%;padding:8px 12px;border:1px solid var(--color-border-weak);border-radius:6px;background:var(--color-bg-card);color:var(--color-text-strong);font-family:var(--font-mono);font-size:.75rem;outline:none;transition:border-color .15s}
.sidebar-search input:focus{border-color:var(--color-accent)}

/* Copy Code Snippets Button */
.copy-code-btn{position:absolute;top:8px;right:8px;padding:4px 8px;font-size:.6875rem;font-family:var(--font-mono);background:var(--color-bg-card);border:1px solid var(--color-border-weak);border-radius:4px;color:var(--color-text-weak);cursor:pointer;opacity:0;transition:opacity .2s,background .15s}
pre:hover .copy-code-btn{opacity:1}
.copy-code-btn:hover{background:var(--color-bg-weak);color:var(--color-text-strong)}

/* Interactive Skills Filtering */
.skills-filter{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}
.filter-btn{padding:6px 12px;font-size:.75rem;font-family:var(--font-mono);background:var(--color-bg-card);border:1px solid var(--color-border-weak);border-radius:6px;color:var(--color-text-weak);cursor:pointer;transition:all .15s;border:1px solid var(--color-border-weak)}
.filter-btn:hover{background:var(--color-bg-weak);color:var(--color-text-strong)}
.filter-btn.active{background:var(--color-accent);color:#fff;border-color:var(--color-accent)}

/* Responsive table toggle for mobile */
@media(max-width:48rem){.card-grid{grid-template-columns:1fr}.stats-bar{grid-template-columns:repeat(3,1fr)}}
`;
}

// ─── Layout Template ────────────────────────────────────────────────────────────

function getSidebarHTML(currentPage) {
  const items = [
    { type: "section", title: "Getting Started" },
    { type: "link", href: "overview.html", id: "overview", title: "Overview" },
    { type: "link", href: "quickstart.html", id: "quickstart", title: "Quick Start" },
    { type: "section", title: "Core" },
    { type: "link", href: "architecture.html", id: "architecture", title: "Architecture" },
    { type: "link", href: "providers.html", id: "providers", title: "Providers" },
    { type: "link", href: "cli.html", id: "cli", title: "CLI" },
    { type: "link", href: "permissions.html", id: "permissions", title: "Permissions" },
    { type: "link", href: "routing.html", id: "routing", title: "Routing" },
    { type: "link", href: "skills.html", id: "skills", title: "Skills" },
    { type: "link", href: "mcp.html", id: "mcp", title: "MCP" },
    { type: "link", href: "sidecars.html", id: "sidecars", title: "Sidecars" },
    { type: "section", title: "Customize" },
    { type: "link", href: "languages.html", id: "languages", title: "Languages" },
    { type: "link", href: "themes.html", id: "themes", title: "Themes" }
  ];

  return `<aside class="sidebar">
    <div class="sidebar-search">
      <input type="text" placeholder="Search docs..." oninput="filterSidebar(this.value)">
    </div>
    <nav class="sidebar-nav">
      ${items.map(item => {
        if (item.type === "section") {
          return `<div class="sec">${item.title}</div>`;
        }
        const isActive = currentPage === item.id;
        return `<a href="${item.href}" ${isActive ? 'class="active"' : ''}>${item.title}</a>`;
      }).join("\n")}
    </nav>
  </aside>`;
}

function pageHeader(title, activePage, pageId = "docs") {
  const isDocs = activePage === "docs";
  const enHref = pageId === "hub" ? "docs.html" : `${pageId}.html`;
  const arHref = pageId === "hub" ? "docs.ar.html" : `${pageId}.ar.html`;
  return `<header>
  <div class="header-inner">
    <a href="../index.html" class="logo">
      <span class="logo-mark">A</span>
      Aura Work
    </a>
    <nav>
      <ul>
        <li><a href="https://aura-work.shop/" >Home</a></li>
        <li><a href="https://aura-work.shop/docs/docs.html" ${isDocs ? 'class="active"' : ''}>Docs</a></li>
        <li><a href="https://github.com/hbx12/aura-work">GitHub</a></li>
        <li style="position:relative;display:flex;align-items:center;gap:1rem">
          <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme" type="button">
            <svg class="sun" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            <svg class="moon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <div style="position:relative">
            <a href="#" class="lang-trigger" onclick="event.preventDefault();document.getElementById('lm').classList.toggle('open')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              EN
            </a>
            <div id="lm" class="lang-dropdown">
              <a href="${enHref}">English</a>
              <a href="${arHref}">العربية</a>
            </div>
          </div>
        </li>
      </ul>
    </nav>
  </div>
</header>`;
}

function pageFooter() {
  return `<footer>
  <div>&copy; 2026 Aura Work contributors &nbsp;&middot;&nbsp; <a href="https://github.com/hbx12/aura-work/blob/main/LICENSE">Apache 2.0</a></div>
  <div class="links">
    <a href="https://github.com/hbx12/aura-work">GitHub</a>
    <a href="https://github.com/hbx12/aura-work/blob/main/CODE_OF_CONDUCT.md">Code of Conduct</a>
    <a href="https://github.com/hbx12/aura-work/security/policy">Security</a>
  </div>
</footer>`;
}

function wrapPage(titleHTML, bodyContent, pageId = "docs") {
  const isHub = pageId === "hub";
  const mainContent = isHub
    ? bodyContent
    : `<div class="layout">
        ${getSidebarHTML(pageId)}
        <main class="content">
          ${bodyContent}
        </main>
       </div>`;

  return `<!DOCTYPE html>
<html lang="en" data-page="aura-work">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleHTML} — Aura Work Docs</title>
<meta name="description" content="Aura Work documentation — ${titleHTML}">
<meta property="og:title" content="${titleHTML} — Aura Work">
<meta property="og:description" content="${titleHTML} — Aura Work documentation">
<meta property="og:url" content="https://aura-work.shop/">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${getBaseCSS()}</style>
<style>
  /* Page-specific enhancements */
  .hero {
    padding: 4rem 0 2.5rem;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 60%;
    height: 200%;
    background: radial-gradient(ellipse at center, var(--color-accent-subtle) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero h1 {
    position: relative;
    z-index: 1;
  }
  .hero .subtitle {
    position: relative;
    z-index: 1;
  }
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: .75rem;
    color: var(--color-text-weak);
    text-decoration: none;
    margin-bottom: 1.5rem;
    transition: color .15s;
  }
  .back-link:hover { color: var(--color-accent); }
  .section:first-of-type { padding-top: 2rem; }
  .local-badge {
    display: inline-block;
    padding: 1px 6px;
    font-size: .5625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .05em;
    border-radius: 3px;
    font-family: var(--font-mono);
  }
  .local-badge.yes { background: rgba(79,125,71,0.12); color: var(--color-success); }
  .local-badge.no { background: rgba(184,72,47,0.10); color: var(--color-danger); }
</style>
<script>
  (function() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else if (saved === 'light') {
      document.documentElement.classList.add('light');
    }
  })();
</script>
</head>
<body>
<div class="page">
${pageHeader("Docs", "docs", pageId)}
${isHub ? '<main>' : ''}
${isHub ? '' : `<a href="docs.html" class="back-link">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
  Back to Docs Hub
</a>`}
${mainContent}
${isHub ? '</main>' : ''}
${pageFooter()}
</div>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Intersection observer for fade-in animations
    var o = new IntersectionObserver(function(e) {
      e.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          o.unobserve(e.target);
        }
      });
    }, { threshold: .1 });
    document.querySelectorAll('.fade-in').forEach(function(e) { o.observe(e); });

    // Copy code button injection
    document.querySelectorAll('pre').forEach(pre => {
      const btn = document.createElement('button');
      btn.className = 'copy-code-btn';
      btn.textContent = 'Copy';
      btn.onclick = function() {
        navigator.clipboard.writeText(pre.querySelector('code').textContent).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = 'Copy', 2000);
        });
      };
      pre.style.position = 'relative';
      pre.appendChild(btn);
    });
  });

  // Dropdown dismissal
  document.addEventListener('click', function(e) {
    var m = document.getElementById('lm');
    if (m && !e.target.closest('.lang-trigger') && !e.target.closest('#lm')) {
      m.classList.remove('open');
    }
  });

  // Theme toggle handler
  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    document.documentElement.classList.remove('light');
    if (!isDark) document.documentElement.classList.add('light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  // Sidebar search filter
  function filterSidebar(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.sidebar-nav a').forEach(a => {
      const text = a.textContent.toLowerCase();
      if (text.includes(q)) {
        a.style.display = '';
      } else {
        a.style.display = 'none';
      }
    });
  }

  // Skills filter helper
  function filterSkills(cat) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.detail-card').forEach(card => {
      if (cat === 'all') {
        card.style.display = '';
      } else {
        const cats = card.getAttribute('data-category').split(',');
        if (cats.includes(cat)) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      }
    });
  }
</script>
</body>
</html>`;
}

// ─── Docs Hub Page ──────────────────────────────────────────────────────────────

function generateDocsHub() {
  const version = getVersion();
  const skills = getSkills();
  const languages = getLanguages();
  const themes = getThemes();
  const providers = getProviders();
  const sidecars = getSidecars();
  const routes = getRoutingPolicies();

  const sections = [
    { href: "overview.html", title: "Overview", desc: "What is Aura Work and why it exists", icon: "◆", color: "#c2683f" },
    { href: "quickstart.html", title: "Quick Start", desc: "Install, configure, run your first task", icon: "▶", color: "#1a7f64" },
    { href: "providers.html", title: `Providers (${providers.length})`, desc: `${providers.length} AI model providers with auto-discovery`, icon: "◆", color: "#c48b5c" },
    { href: "routing.html", title: `Routing (${routes.length} policies)`, desc: `Intelligent ${routes.length}-policy model routing engine`, icon: "↗", color: "#4b5bb0" },
    { href: "skills.html", title: `Skills (${skills.length})`, desc: `${skills.length} pre-built agent skills in the registry`, icon: "⚡", color: "#7a5c8e" },
    { href: "sidecars.html", title: `Sidecars (${sidecars.length})`, desc: `${sidecars.length} modular background service daemons`, icon: "▤", color: "#1988a2" },
    { href: "languages.html", title: `Languages (${languages.length})`, desc: `${languages.length} human languages with RTL support`, icon: "🌐", color: "#3a6fc4" },
    { href: "themes.html", title: `Themes (${themes.length})`, desc: `${themes.length} hand-crafted visual themes`, icon: "◐", color: "#a855f7" },
    { href: "permissions.html", title: "Permissions", desc: "3 permission profiles: read-only, safe-automation, research", icon: "🔒", color: "#e05c2b" },
    { href: "architecture.html", title: "Architecture", desc: "Tauri 2 + React 19 + Rust multi-process architecture", icon: "◈", color: "#645d4e" },
    { href: "cli.html", title: "CLI", desc: "Command-line bridge client for remote control", icon: "⌘", color: "#1a7f64" },
    { href: "mcp.html", title: "MCP", desc: "Model Context Protocol for third-party tool integration", icon: "⇌", color: "#c2683f" },
  ];

  const hero = `<div class="hero">
    <div class="meta-badge">v${version}</div>
    <h1>Documentation</h1>
    <p class="subtitle">Everything you need to understand, extend, and contribute to Aura Work — the open-source multi-provider desktop AI agent platform.</p>
  </div>`;

  const statsBar = `<div class="stats-bar">
    ${[
      { num: version, lbl: "Version" },
      { num: providers.length, lbl: "Providers" },
      { num: skills.length, lbl: "Skills" },
      { num: sidecars.length, lbl: "Sidecars" },
      { num: languages.length, lbl: "Languages" },
      { num: themes.length, lbl: "Themes" },
    ].map((s, i) => `<div class="stat-card fade-in delay-${i+1}"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>`).join("\n")}
  </div>`;

  const cards = sections.map((s, i) => `<a href="${s.href}" class="fade-in delay-${(i % 6) + 1}" style="text-decoration:none;display:block">
    <div class="detail-card" style="cursor:pointer">
      <h3><span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:${s.color};color:#fff;font-size:.75rem;font-family:var(--font-mono);flex-shrink:0">${s.icon}</span> ${s.title}</h3>
      <p>${s.desc}</p>
    </div>
  </a>`).join("\n");

  return wrapPage("Documentation Hub", hero + `<section class="section">${statsBar}<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">${cards}</div></section>`, "hub");
}

// ─── Overview Page ──────────────────────────────────────────────────────────────

function generateOverview() {
  const version = getVersion();
  const desc = getDescription();
  const body = `<div class="hero">
    <h1><span>Overview</span></h1>
    <p class="subtitle">What is Aura Work and why it exists.</p>
  </div>
  <section class="section">
    <p>Aura Work is a <strong>multi-provider desktop AI agent platform</strong> built for developers who want <strong>local-first, permission-gated, self-hostable</strong> AI assistance. It supports 10 AI providers out of the box, with an intelligent routing engine that picks the right model for each task.</p>
    <p>Unlike cloud-only tools, Aura Work keeps your data on your machine. It uses a plugin architecture with sandboxed execution, encrypted credential storage, and granular permission controls. The platform is designed for developers who want full control over their AI tools — no data leaves your device unless you explicitly choose to sync.</p>
    
    <h2 style="margin-top:2rem">Why Aura Work?</h2>
    <p>Most AI coding tools are either cloud-only (sending your code to external servers) or limited to a single provider. Aura Work solves both problems:</p>
    <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>Multi-provider</strong> — use OpenAI, Anthropic, Gemini, DeepSeek, Ollama, and more from one interface</li>
      <li><strong>Local-first</strong> — your data stays on your machine, encrypted with device-bound keys</li>
      <li><strong>Permission-gated</strong> — every action requires explicit approval (or pre-configured profiles)</li>
      <li><strong>Self-hostable</strong> — run your own cloud sync server, no dependency on our infrastructure</li>
      <li><strong>Extensible</strong> — add capabilities via skills, MCP servers, and plugins</li>
    </ul>

    <div class="detail-card">
      <h3>🎯 Core Capabilities</h3>
      <p>Aura Work is more than just a chat interface. It's a full development environment with:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Task Engine</strong> — multi-step task execution with planning, execution, and review phases</li>
        <li><strong>File Operations</strong> — read, write, search, and manage files with permission controls</li>
        <li><strong>Git Integration</strong> — status, diff, commit, branch management directly from the agent</li>
        <li><strong>Browser Automation</strong> — browse websites, extract data, fill forms with Puppeteer</li>
        <li><strong>Computer Use</strong> — control desktop applications via screenshots and mouse/keyboard</li>
        <li><strong>VM Sandbox</strong> — execute shell commands in isolated WSL2 or container environments</li>
        <li><strong>Cloud Sync</strong> — E2EE sync across devices with self-hostable server</li>
        <li><strong>Scheduled Tasks</strong> — automate recurring tasks with cron-like scheduling</li>
        <li><strong>18 Built-in Skills</strong> — documents, spreadsheets, PDFs, research, design, and more</li>
        <li><strong>MCP Support</strong> — connect to any MCP server for unlimited extensibility</li>
      </ul>
    </div>
  </section>
  <section class="section">
    <div class="section-label">Key Facts</div>
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">v${version}</div><div class="lbl">Current version</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">Tauri 2</div><div class="lbl">Desktop framework</div></div>
      <div class="stat-card fade-in delay-3"><div class="num">React 19</div><div class="lbl">UI framework</div></div>
      <div class="stat-card fade-in delay-4"><div class="num">Rust</div><div class="lbl">Core backend</div></div>
    </div>
    <h2 style="margin-top:2rem">Architecture at a glance</h2>
    <div class="detail-card">
      <h3>🖥️ Desktop App</h3>
      <p>Tauri 2 shell hosting the React 19 frontend. Manages windows, system tray, native menus, and IPC with sidecar processes. The Rust backend handles performance-critical operations and system integration.</p>
      <p style="margin-top:.75rem">The desktop app provides 14 main pages: Dashboard, Tasks, Files, Git, Terminal, Providers, Plugins, Browser, Computer Use, Scheduled Tasks, Memory, Audit Log, Cloud, and Extensions.</p>
    </div>
    <div class="detail-card">
      <h3>⚙️ Sidecar Services</h3>
      <p>8 independent Node.js daemons for agent execution, browser automation, VM sandboxing, cloud sync, computer-use, and more. Each sidecar runs in its own process space with its own lifecycle, communicating via IPC or HTTP.</p>
      <p style="margin-top:.75rem">Sidecars: Agent (47821), VM Helper (47822), Browser Helper (47823), Plugins Helper (47824), Cloud Sync (47825), Bridge (47826), Computer Use (47828), Cloud Server (47830).</p>
    </div>
    <div class="detail-card">
      <h3>🤖 Agent Engine</h3>
      <p>Multi-agent orchestration with specialized roles: <strong>Planner</strong> decomposes tasks into steps, <strong>Executor</strong> runs each step, <strong>Reviewer</strong> validates output, and <strong>Safety</strong> enforces boundaries. Supports custom tools and MCP servers.</p>
      <p style="margin-top:.75rem">The agent can use any combination of built-in tools, skills, MCP servers, and plugins to complete tasks. It automatically selects the best tool for each step based on the task requirements.</p>
    </div>
    <div class="detail-card">
      <h3>🔀 Routing Engine</h3>
      <p>Smart model router across 10 providers with 5 routing policies: <strong>quality-first</strong> (best model for the task), <strong>cost-first</strong> (cheapest option), <strong>privacy-first</strong> (local-only), <strong>local-only</strong> (Ollama/LM Studio), or <strong>manual</strong> (you choose).</p>
      <p style="margin-top:.75rem">The routing engine analyzes each task's type, sensitivity, and required capabilities to select the optimal provider and model. It can also fall back to alternative providers if the primary one fails.</p>
    </div>
  </section>
  <section class="section">
    <div class="section-label">How It Works</div>
    <h2>Workflow</h2>
    <p>When you type a prompt in Aura Work, here's what happens:</p>
    <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2.5">
      <li><strong>1. Task Creation</strong> — Your prompt becomes a task in the SQLite database</li>
      <li><strong>2. Planning</strong> — The Planner agent analyzes the task and creates a step-by-step plan</li>
      <li><strong>3. Routing</strong> — The routing engine selects the best provider/model based on your policy</li>
      <li><strong>4. Permission Check</strong> — Each step is checked against your permission profile</li>
      <li><strong>5. Execution</strong> — The Executor agent runs each step, calling tools as needed</li>
      <li><strong>6. Review</strong> — The Reviewer agent validates the output for correctness and safety</li>
      <li><strong>7. Completion</strong> — Results are displayed and logged to the audit trail</li>
    </ol>
    <p style="margin-top:1.5rem">High-impact actions (file writes, shell commands, browser automation) require explicit approval in <code>ask-first</code> mode. You can configure auto-approval for trusted operations in Settings → Permissions.</p>
  </section>
  <section class="section">
    <div class="section-label">Security & Privacy</div>
    <h2>Your data stays yours</h2>
    <p>Aura Work is built with security as a first-class concern:</p>
    <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>API keys never leave your device</strong> — stored in an encrypted vault using device-bound keys (DPAPI on Windows, Keychain on macOS, Secret Service on Linux)</li>
      <li><strong>No telemetry by default</strong> — no usage data is collected unless you opt in</li>
      <li><strong>E2EE cloud sync</strong> — if you use Aura Cloud, data is encrypted with XChaCha20-Poly1305 before leaving your device</li>
      <li><strong>Audit logging</strong> — every action is recorded with actor, category, action, target, risk level, and result</li>
      <li><strong>Permission system</strong> — granular control over what the agent can access (files, shell, browser, network)</li>
    </ul>
  </section>`;
  return wrapPage("Overview", body, "overview");
}

// ─── Providers Page ─────────────────────────────────────────────────────────────

function generateProviders() {
  const providers = getProviders();
  const localCount = providers.filter(p => p.local).length;
  const cloudCount = providers.length - localCount;
  const body = `<div class="hero">
    <h1><span>AI Providers</span></h1>
    <p class="subtitle">Connect to ${providers.length} different AI providers — cloud-hosted models or fully local.</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${providers.length}</div><div class="lbl">Total Providers</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">${cloudCount}</div><div class="lbl">Cloud Providers</div></div>
      <div class="stat-card fade-in delay-3"><div class="num">${localCount}</div><div class="lbl">Local Providers</div></div>
    </div>
    <p>Aura Work supports <strong>${providers.length} AI providers</strong> covering both cloud-hosted and local (Ollama, LM Studio, Custom Endpoint) models. Each provider has its own adapter that handles authentication, model discovery, and chat completions. Providers marked as <strong>local</strong> never send data off your machine.</p>
    
    <h2 style="margin-top:2rem">What are Providers?</h2>
    <p>Providers are the bridge between Aura Work and AI models. Each provider implements a standard interface that handles:</p>
    <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>Authentication</strong> — API keys, OAuth tokens, or local connections</li>
      <li><strong>Model discovery</strong> — automatically detecting available models</li>
      <li><strong>Chat completions</strong> — sending prompts and receiving responses</li>
      <li><strong>Usage tracking</strong> — counting tokens and estimating costs</li>
    </ul>

    <div class="detail-card">
      <h3>☁️ Cloud Providers</h3>
      <p>Cloud providers host models on their infrastructure. You need an API key to use them:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>Provider</th><th>Best For</th><th>Pricing</th></tr></thead>
        <tbody>
          <tr><td><strong>OpenAI</strong></td><td>General purpose, code generation</td><td>Pay per token</td></tr>
          <tr><td><strong>Anthropic</strong></td><td>Complex reasoning, long context</td><td>Pay per token</td></tr>
          <tr><td><strong>Google Gemini</strong></td><td>Multimodal, large context windows</td><td>Pay per token</td></tr>
          <tr><td><strong>DeepSeek</strong></td><td>Code-focused, cost-effective</td><td>Pay per token</td></tr>
          <tr><td><strong>Minimax</strong></td><td>Chinese language tasks</td><td>Pay per token</td></tr>
          <tr><td><strong>Qwen</strong></td><td>Chinese language, reasoning</td><td>Pay per token</td></tr>
          <tr><td><strong>Aura Cloud</strong></td><td>Managed service with E2EE sync</td><td>Subscription</td></tr>
        </tbody>
      </table>
    </div>

    <div class="detail-card">
      <h3>🏠 Local Providers</h3>
      <p>Local providers run models on your own hardware. No API keys, no internet required, complete privacy:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>Provider</th><th>Setup</th><th>Best For</th></tr></thead>
        <tbody>
          <tr><td><strong>Ollama</strong></td><td><code>ollama pull llama3</code></td><td>Easy local model management</td></tr>
          <tr><td><strong>LM Studio</strong></td><td>Download from lmstudio.ai</td><td>GUI for model management</td></tr>
          <tr><td><strong>Custom Endpoint</strong></td><td>Any OpenAI-compatible API</td><td>Self-hosted models, proxies</td></tr>
        </tbody>
      </table>
      <p style="margin-top:.75rem">Local providers are ideal for privacy-sensitive work, offline environments, and cost savings (no per-token charges).</p>
    </div>

    <div class="detail-card">
      <h3>🔧 Setting Up Providers</h3>
      <p>To add a provider:</p>
      <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> Go to <strong>Settings → Providers</strong></li>
        <li><strong>2.</strong> Click on the provider you want to add</li>
        <li><strong>3.</strong> Enter your API key (for cloud providers)</li>
        <li><strong>4.</strong> Click <strong>"Validate"</strong> to test the connection</li>
        <li><strong>5.</strong> Select which models you want to use</li>
        <li><strong>6.</strong> Configure optional settings (base URL, max tokens, etc.)</li>
      </ol>
      <p style="margin-top:.75rem">For local providers, just install the software (Ollama/LM Studio) and Aura Work will auto-discover available models.</p>
    </div>

    ${providers.map((p, i) => `<div class="detail-card fade-in delay-${(i % 4) + 1}">
      <h3><span style="display:inline-flex;width:10px;height:10px;border-radius:50%;background:${p.color};flex-shrink:0"></span> ${p.name}</h3>
      <div class="meta">
        <span>${p.models.length} model${p.models.length > 1 ? 's' : ''}: ${p.models.join(", ")}</span>
        <span class="local-badge ${p.local ? 'yes' : 'no'}">${p.local ? 'Local' : 'Cloud'}</span>
      </div>
      <p>${p.desc}</p>
    </div>`).join("\n")}
  </section>
  <section class="section">
    <div class="section-label">Architecture</div>
    <h2>How providers work</h2>
    <p>Each provider implements a <code>ProviderAdapter</code> interface with <code>listModels()</code>, <code>validateCredentials()</code>, and <code>chat()</code> methods. The system auto-discovers available models on connection and caches them. OpenAI-compatible providers share a single adapter implementation.</p>
    
    <div class="detail-card">
      <h3>🔑 Credential Security</h3>
      <p>API keys are encrypted using the device-bound vault before storage. The vault uses:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Windows</strong> — DPAPI (Data Protection API)</li>
        <li><strong>macOS</strong> — Keychain</li>
        <li><strong>Linux</strong> — Secret Service (GNOME Keyring / KWallet)</li>
      </ul>
      <p style="margin-top:.75rem">Credentials are never logged, never exposed to the agent, and never included in audit entries. The vault supports biometric unlock on supported platforms.</p>
    </div>

    <div class="detail-card">
      <h3>📊 Usage Tracking</h3>
      <p>Every task records detailed usage information:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Input tokens</strong> — tokens sent to the model</li>
        <li><strong>Output tokens</strong> — tokens received from the model</li>
        <li><strong>Estimated cost</strong> — calculated from the pricing cache</li>
        <li><strong>Model used</strong> — which provider and model handled the task</li>
      </ul>
      <p style="margin-top:.75rem">View usage statistics in the Dashboard or export them for billing. The audit log maintains a permanent record of all provider interactions.</p>
    </div>

    <div class="detail-card">
      <h3>🔄 Fallback & Retry</h3>
      <p>If a provider fails, Aura Work can automatically retry with an alternative:</p>
      <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> Primary provider fails (rate limit, timeout, error)</li>
        <li><strong>2.</strong> System checks for fallback providers in your configuration</li>
        <li><strong>3.</strong> If fallback exists, retries with the alternative provider</li>
        <li><strong>4.</strong> If no fallback, notifies you and asks for manual intervention</li>
      </ol>
      <p style="margin-top:.75rem">Configure fallback providers in Settings → Providers → Fallback Chain.</p>
    </div>

    <div class="detail-card">
      <h3>💡 Cost Optimization Tips</h3>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Use the cost-first routing policy</strong> for routine tasks</li>
        <li><strong>Set up Ollama</strong> for development and testing (free)</li>
        <li><strong>Use DeepSeek</strong> for code tasks (cheaper than OpenAI/Anthropic)</li>
        <li><strong>Monitor usage</strong> in the Dashboard to identify expensive patterns</li>
        <li><strong>Set token limits</strong> per task to prevent runaway costs</li>
      </ul>
    </div>
  </section>`;
  return wrapPage("Providers", body, "providers");
}

// ─── Routing Page ────────────────────────────────────────────────────────────────

function generateRouting() {
  const policies = getRoutingPolicies();
  const body = `<div class="hero">
    <h1><span>Routing Engine</span></h1>
    <p class="subtitle">Intelligent model routing across ${policies.length} policies — pick the right model for every task automatically.</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      ${policies.map((p, i) => `<div class="stat-card fade-in delay-${i+1}"><div class="num">${p.id.split("-")[0]}</div><div class="lbl">${p.title}</div></div>`).join("\n")}
    </div>
    <p>The routing engine is the brain of Aura Work's provider selection. It evaluates each task based on its type, sensitivity, required capabilities, and your configured policy to select the optimal model. This ensures you always get the best results while controlling costs and privacy.</p>
    
    <h2 style="margin-top:2rem">How Routing Works</h2>
    <p>When you send a prompt, the routing engine:</p>
    <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2.5">
      <li><strong>1. Analyzes the task</strong> — determines if it's coding, research, document work, data analysis, browser automation, etc.</li>
      <li><strong>2. Checks capabilities</strong> — does the task need vision? Tool calling? Long context? Reasoning?</li>
      <li><strong>3. Evaluates sensitivity</strong> — is the data normal, sensitive, or secret-risk?</li>
      <li><strong>4. Applies your policy</strong> — quality-first, cost-first, privacy-first, local-only, or manual</li>
      <li><strong>5. Selects the model</strong> — picks the best provider + model combination</li>
      <li><strong>6. Returns a decision</strong> — includes the selected model, estimated cost, and confidence</li>
    </ol>

    <div class="detail-card">
      <h3>📊 Task Types</h3>
      <p>The routing engine recognizes these task types:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>Type</th><th>Description</th><th>Best Providers</th></tr></thead>
        <tbody>
          <tr><td><code>coding</code></td><td>Code generation, refactoring, debugging</td><td>Anthropic, DeepSeek, OpenAI</td></tr>
          <tr><td><code>research</code></td><td>Information gathering, analysis</td><td>OpenAI, Gemini, Anthropic</td></tr>
          <tr><td><code>document</code></td><td>Writing, editing, formatting</td><td>OpenAI, Anthropic, Gemini</td></tr>
          <tr><td><code>data</code></td><td>Data analysis, spreadsheet work</td><td>OpenAI, Gemini, DeepSeek</td></tr>
          <tr><td><code>browser</code></td><td>Web browsing, form filling</td><td>OpenAI, Anthropic (vision)</td></tr>
          <tr><td><code>review</code></td><td>Code review, feedback</td><td>Anthropic, OpenAI</td></tr>
          <tr><td><code>security</code></td><td>Security analysis, vulnerability detection</td><td>Anthropic, OpenAI</td></tr>
          <tr><td><code>general</code></td><td>General conversation, Q&A</td><td>Any provider</td></tr>
        </tbody>
      </table>
    </div>

    ${policies.map((p, i) => `<div class="detail-card fade-in delay-${(i % 5) + 1}">
      <h3>${p.title}</h3>
      <div class="meta"><span>${p.subtitle}</span></div>
      <p>${p.desc}</p>
    </div>`).join("\n")}
  </section>
  <section class="section">
    <div class="section-label">Configuration</div>
    <h2>Setting up routing</h2>
    <p>Configure your routing policy in <strong>Settings → Routing</strong>:</p>
    <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>1.</strong> Choose your default policy (applies to all tasks unless overridden)</li>
      <li><strong>2.</strong> Optionally set per-project policies (override for specific projects)</li>
      <li><strong>3.</strong> Configure fallback providers (what to use if primary fails)</li>
      <li><strong>4.</strong> Set cost limits (maximum tokens/cost per task)</li>
    </ol>

    <div class="detail-card">
      <h3>💡 When to Use Each Policy</h3>
      <table style="margin-top:.75rem">
        <thead><tr><th>Policy</th><th>Best For</th><th>Trade-offs</th></tr></thead>
        <tbody>
          <tr><td><strong>Quality-first</strong></td><td>Important tasks, production code, client work</td><td>Higher cost, slower</td></tr>
          <tr><td><strong>Cost-first</strong></td><td>Routine tasks, development, testing</td><td>May use weaker models</td></tr>
          <tr><td><strong>Privacy-first</strong></td><td>Sensitive data, proprietary code, personal info</td><td>Limited to local models</td></tr>
          <tr><td><strong>Local-only</strong></td><td>Offline work, air-gapped environments</td><td>Requires local hardware</td></tr>
          <tr><td><strong>Manual</strong></td><td>Learning, comparing providers, specific model needs</td><td>Slower workflow</td></tr>
        </tbody>
      </table>
    </div>

    <div class="detail-card">
      <h3>🔄 Fallback Chain</h3>
      <p>If the primary provider fails, the routing engine tries alternatives:</p>
      <pre><code>// Example fallback configuration
{
  "routing": {
    "policy": "quality-first",
    "fallback": [
      "anthropic/claude-3-5-sonnet",
      "openai/gpt-4o",
      "deepseek/deepseek-coder",
      "ollama/llama3"
    ],
    "maxRetries": 3,
    "costLimit": {
      "perTask": 0.50,
      "perDay": 10.00
    }
  }
}</code></pre>
      <p style="margin-top:.75rem">The engine tries each fallback in order until one succeeds. If all fail, it notifies you and asks for manual intervention.</p>
    </div>
  </section>`;
  return wrapPage("Routing", body, "routing");
}

// ─── Skills Page ─────────────────────────────────────────────────────────────────

function generateSkills() {
  const skills = getSkills();
  const categories = [...new Set(skills.flatMap(s => s.categories))].sort();
  const body = `<div class="hero">
    <h1><span>Skills</span></h1>
    <p class="subtitle">${skills.length} pre-built agent skills in the registry — ready to use, fully sandboxed.</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${skills.length}</div><div class="lbl">Skills</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">${categories.length}</div><div class="lbl">Categories</div></div>
      <div class="stat-card fade-in delay-3"><div class="num">${skills.filter(s=>s.risk==='low').length}</div><div class="lbl">Low Risk</div></div>
    </div>
    <p>Skills are the core extension mechanism in Aura Work. Each skill is a <strong>versioned JSON manifest</strong> that defines a specific capability the agent can use — from creating documents and spreadsheets to automating browsers and analyzing data. Skills are published to the registry at <code>registry/skills/</code> and can be installed from the marketplace.</p>
    
    <h2 style="margin-top:2rem">What is a Skill?</h2>
    <p>A skill is a self-contained agent capability that includes:</p>
    <ul style="padding-left:1.25rem;margin-bottom:1.5rem;line-height:2">
      <li><strong>Identity</strong> — unique ID, name, version, and publisher</li>
      <li><strong>Categories</strong> — tags for filtering (documents, code, data, browser, etc.)</li>
      <li><strong>Tools</strong> — the actual functions the agent can call</li>
      <li><strong>Permissions</strong> — what the skill needs access to (files, shell, browser, etc.)</li>
      <li><strong>Risk level</strong> — low, medium, or high based on required permissions</li>
      <li><strong>Install instructions</strong> — how to set up the skill</li>
    </ul>

    <div class="detail-card">
      <h3>🎯 How Skills Work</h3>
      <p>When you ask the agent to perform a task, it analyzes your request and determines which skills are needed. The agent then loads the skill manifest, checks permissions, and executes the required tools. Each tool call goes through the permission gate — if the skill needs file access or shell commands, you'll be asked to approve (unless you've set the profile to auto-allow).</p>
      <p style="margin-top:.75rem">Skills are <strong>sandboxed</strong> — they can only access what their manifest declares. A document skill can't execute shell commands unless explicitly granted. This ensures security even with third-party skills from the marketplace.</p>
    </div>

    <div class="detail-card">
      <h3>🔧 Using Skills</h3>
      <p>Skills are used automatically when you interact with the agent. For example:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>"Create a PDF report"</strong> → Agent uses the <code>aura-pdf</code> skill</li>
        <li><strong>"Analyze this spreadsheet"</strong> → Agent uses the <code>aura-spreadsheets</code> skill</li>
        <li><strong>"Browse this website and extract data"</strong> → Agent uses the <code>aura-browser-assistant</code> skill</li>
        <li><strong>"Convert this image to WebP"</strong> → Agent uses the <code>aura-file-converter</code> skill</li>
      </ul>
      <p style="margin-top:.75rem">You can also explicitly request a skill by name: <code>"Use the research skill to find information about..."</code></p>
    </div>

    <div class="detail-card">
      <h3>📋 Skill Manifest Format</h3>
      <p>Each skill is defined in a JSON file with this structure:</p>
      <pre><code>{
  "id": "aura-documents",
  "name": "Documents",
  "version": "1.0.0",
  "summary": "Create, edit, and format documents",
  "description": "Full document processing with...",
  "publisher": "aura-work",
  "categories": ["documents", "productivity"],
  "risk": "low",
  "permissions": [
    { "category": "file", "action": "write", "target": "*.md" }
  ],
  "tools": [
    {
      "name": "create_document",
      "description": "Create a new document",
      "parameters": {
        "title": { "type": "string", "required": true },
        "format": { "type": "string", "enum": ["md", "txt", "docx"] }
      }
    }
  ],
  "install": {
    "command": "npm install",
    "workingDir": "skills/documents"
  }
}</code></pre>
    </div>

    <div class="detail-card">
      <h3>🏗️ Creating Custom Skills</h3>
      <p>You can create your own skills by following these steps:</p>
      <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> Create a new JSON file in <code>registry/skills/</code></li>
        <li><strong>2.</strong> Define the skill identity (id, name, version, publisher)</li>
        <li><strong>3.</strong> Add categories and set the risk level</li>
        <li><strong>4.</strong> Declare required permissions (file, shell, browser, etc.)</li>
        <li><strong>5.</strong> Define tools with their parameters and descriptions</li>
        <li><strong>6.</strong> Add install instructions if needed</li>
        <li><strong>7.</strong> Validate with <code>node scripts/validate-marketplace-manifests.js</code></li>
        <li><strong>8.</strong> Submit a PR to the registry</li>
      </ol>
      <p style="margin-top:.75rem">See <code>registry/skills/aura-documents.json</code> for a complete example.</p>
    </div>

    <div class="detail-card">
      <h3>📊 Risk Levels Explained</h3>
      <p>Each skill has a risk level based on its required permissions:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>Level</th><th>Description</th><th>Example</th></tr></thead>
        <tbody>
          <tr><td><code>low</code></td><td>Read-only access, no side effects</td><td>Research, data analysis</td></tr>
          <tr><td><code>medium</code></td><td>File writes, network requests</td><td>Document creation, browser automation</td></tr>
          <tr><td><code>high</code></td><td>Shell execution, system access</td><td>Automation, VM operations</td></tr>
        </tbody>
      </table>
      <p style="margin-top:.75rem">High-risk skills require explicit approval in <code>ask-first</code> mode. You can configure auto-approval for specific categories in Settings → Permissions.</p>
    </div>

    <div class="detail-card">
      <h3>🏪 Marketplace</h3>
      <p>The marketplace (<code>registry/marketplace.json</code>) aggregates skills, MCP servers, and plugins. Each entry includes:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Localized descriptions</strong> — available in 20 languages</li>
        <li><strong>Icon and cover images</strong> — SVG assets in <code>registry/assets/</code></li>
        <li><strong>Version history</strong> — for updates and rollbacks</li>
        <li><strong>Publisher verification</strong> — official vs community skills</li>
        <li><strong>Compatibility info</strong> — minimum Aura Work version required</li>
      </ul>
      <p style="margin-top:.75rem">Install skills from the Plugins panel in the desktop app or use the CLI: <code>aura skill install &lt;skill-id&gt;</code></p>
    </div>
  </section>
  <section class="section">
    <div class="section-label">Filter by Category</div>
    <div class="skills-filter">
      <button class="filter-btn active" onclick="filterSkills('all')">All</button>
      ${categories.map(c => `<button class="filter-btn" onclick="filterSkills('${c}')">${c}</button>`).join(" ")}
    </div>

    <div class="section-label">All Skills</div>
    ${skills.map((s, i) => `<div class="detail-card fade-in delay-${(i % 4) + 1}" data-category="${s.categories.join(',')}">
      <h3>${s.name}</h3>
      <div class="meta">
        <span>${s.categories.join(" / ")}</span>
        <span>Risk: ${s.risk}</span>
        <span>${s.publisher}</span>
      </div>
      <p>${s.summary || s.description}</p>
      ${s.tools.length ? `<div style="margin-top:.5rem"><strong style="font-size:.75rem;font-family:var(--font-mono);color:var(--color-text-weak)">Tools:</strong> ${s.tools.map(t => `<code>${t.name}</code>`).join(" ")}</div>` : ""}
    </div>`).join("\n")}
  </section>`;
  return wrapPage("Skills", body, "skills");
}

// ─── Sidecars Page ───────────────────────────────────────────────────────────────

function generateSidecars() {
  const sidecars = getSidecars();
  const body = `<div class="hero">
    <h1><span>Sidecars</span></h1>
    <p class="subtitle">${sidecars.length} modular background services that power Aura Work's capabilities.</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${sidecars.length}</div><div class="lbl">Sidecars</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">TypeScript</div><div class="lbl">Language</div></div>
    </div>
    <p>Sidecars are <strong>independent Node.js daemon processes</strong> managed by the Tauri shell. Each sidecar runs in its own process space with its own lifecycle, communicating via IPC or HTTP. They provide sandboxed, isolated capabilities that the agent orchestrator can invoke.</p>
    
    <h2 style="margin-top:2rem">Why Sidecars?</h2>
    <p>The sidecar architecture provides several benefits:</p>
    <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>Isolation</strong> — each sidecar runs in its own process, so crashes don't affect the main app</li>
      <li><strong>Security</strong> — sidecars are sandboxed and authenticated, limiting their access</li>
      <li><strong>Extensibility</strong> — new capabilities can be added as new sidecars without modifying the core</li>
      <li><strong>Resource management</strong> — each sidecar can be started/stopped independently</li>
      <li><strong>Language flexibility</strong> — sidecars can be written in any language (currently all TypeScript)</li>
    </ul>

    <div class="detail-card">
      <h3>🔌 Communication</h3>
      <p>Sidecars communicate with the main app via:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>Method</th><th>Port</th><th>Use Case</th></tr></thead>
        <tbody>
          <tr><td><strong>HTTP API</strong></td><td>47821-47830</td><td>REST endpoints for task management, health checks</td></tr>
          <tr><td><strong>IPC</strong></td><td>N/A</td><td>Direct inter-process communication for fast operations</td></tr>
          <tr><td><strong>WebSocket</strong></td><td>47826</td><td>Real-time streaming for logs and events</td></tr>
        </tbody>
      </table>
      <p style="margin-top:.75rem">All sidecars expose a <code>GET /health</code> endpoint that returns status, version, and phase information.</p>
    </div>

    ${sidecars.map((s, i) => `<div class="detail-card fade-in delay-${(i % 4) + 1}">
      <h3>${s.name}</h3>
      <div class="meta"><span>${s.path}</span><span>${s.lang}</span></div>
      <p>${s.desc}</p>
    </div>`).join("\n")}
  </section>
  <section class="section">
    <div class="section-label">Health Monitoring</div>
    <h2>Checking sidecar status</h2>
    <p>Each sidecar exposes a health endpoint. Check all sidecars at once:</p>
    <pre><code># Check Agent sidecar health
curl http://localhost:47821/health

# Response:
{
  "phase": 7,
  "version": "0.1.0-alpha",
  "status": "ready",
  "uptime": 3600
}</code></pre>
    <p style="margin-top:.75rem">The desktop app monitors sidecar health automatically and will restart failed sidecars. You can also check status in <strong>Settings → Diagnostics</strong>.</p>

    <div class="detail-card">
      <h3>📊 Sidecar Ports</h3>
      <table style="margin-top:.75rem">
        <thead><tr><th>Sidecar</th><th>Port</th><th>Health Endpoint</th></tr></thead>
        <tbody>
          <tr><td>Agent</td><td>47821</td><td>GET /health</td></tr>
          <tr><td>VM Helper</td><td>47822</td><td>GET /health</td></tr>
          <tr><td>Browser Helper</td><td>47823</td><td>GET /health</td></tr>
          <tr><td>Plugins Helper</td><td>47824</td><td>GET /health</td></tr>
          <tr><td>Cloud Sync</td><td>47825</td><td>GET /health</td></tr>
          <tr><td>Bridge</td><td>47826</td><td>GET /health</td></tr>
          <tr><td>Computer Use</td><td>47828</td><td>GET /health</td></tr>
          <tr><td>Cloud Server</td><td>47830</td><td>GET /health</td></tr>
        </tbody>
      </table>
    </div>
  </section>
  <section class="section">
    <div class="section-label">Security Model</div>
    <h2>Sidecar authentication</h2>
    <p>All sidecars use a shared authentication system with token-based authorization:</p>
    <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>Token-based auth</strong> — each inter-process request must include a valid sidecar token</li>
      <li><strong>Runtime-loaded</strong> — tokens are generated at app startup and loaded into each sidecar</li>
      <li><strong>Request validation</strong> — every request is validated against the token</li>
      <li><strong>401 rejection</strong> — failed authentications are rejected with <code>401 Unauthorized</code></li>
    </ul>
    <p style="margin-top:.75rem">The token is stored in memory only and never persisted to disk. It's regenerated on each app launch for security.</p>

    <div class="detail-card">
      <h3>🛡️ Isolation</h3>
      <p>Each sidecar runs in its own process space with:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Separate Node.js process</strong> — no shared memory or state</li>
        <li><strong>Limited filesystem access</strong> — only the directories it needs</li>
        <li><strong>No network access by default</strong> — must be explicitly granted</li>
        <li><strong>Resource limits</strong> — CPU and memory usage is monitored</li>
      </ul>
      <p style="margin-top:.75rem">If a sidecar crashes, the main app detects it via health checks and can restart it automatically.</p>
    </div>
  </section>
  <section class="section">
    <div class="section-label">Development</div>
    <h2>Building sidecars</h2>
    <p>Sidecars are built with TypeScript and bundled with esbuild:</p>
    <pre><code># Build all sidecars
npm run build:sidecars

# Build a specific sidecar
npm run build:sidecar -w sidecar/aura-agent

# Run a sidecar in development mode
npm run sidecar  # Agent sidecar
npm run vm-helper  # VM Helper
npm run browser-helper  # Browser Helper</code></pre>
    <p style="margin-top:.75rem">Each sidecar has its own <code>package.json</code> and can have its own dependencies. They share common types from <code>packages/shared/</code>.</p>

    <div class="detail-card">
      <h3>📝 Creating a New Sidecar</h3>
      <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> Create a new directory in <code>sidecar/</code></li>
        <li><strong>2.</strong> Add <code>package.json</code> with dependencies</li>
        <li><strong>3.</strong> Implement the health endpoint: <code>GET /health</code></li>
        <li><strong>4.</strong> Implement your business logic endpoints</li>
        <li><strong>5.</strong> Add authentication using <code>sidecar-auth.ts</code></li>
        <li><strong>6.</strong> Register the sidecar in the main app's process manager</li>
        <li><strong>7.</strong> Add build script to <code>package.json</code> root</li>
      </ol>
      <p style="margin-top:.75rem">See <code>sidecar/aura-agent/</code> for a complete example.</p>
    </div>
  </section>`;
  return wrapPage("Sidecars", body, "sidecars");
}

// ─── Languages Page ──────────────────────────────────────────────────────────────

function generateLanguages() {
  const languages = getLanguages();
  const names = getLanguageNames();
  const rtlLocales = ["ar", "fa"];
  
  const langItems = languages.map(l => {
    const name = names[l] || l;
    const isRTL = rtlLocales.includes(l);
    return `<a href="https://github.com/hbx12/aura-work/blob/main/packages/i18n/locales/${l}.json" class="lang-badge fade-in" style="animation: fadeIn .4s ease forwards">${name} ${isRTL ? '<span class="rtl-mark">RTL</span>' : ''}</a>`;
  }).join("\n");

  const body = `<div class="hero">
    <h1><span>Languages</span></h1>
    <p class="subtitle">${languages.length} human languages with full RTL support for Arabic and Persian.</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${languages.length}</div><div class="lbl">Languages</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">${rtlLocales.length}</div><div class="lbl">RTL Languages</div></div>
    </div>
    <p>Aura Work is built for a <strong>global audience</strong>. The i18n system uses TypeScript source catalogs that emit Weblate-compatible JSON files. Adding a new language is a single PR away.</p>
    
    <h2 style="margin-top:2rem">Why i18n Matters</h2>
    <p>Aura Work is used by developers worldwide. By supporting 20 languages, we ensure that:</p>
    <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>Accessibility</strong> — developers can use the tool in their native language</li>
      <li><strong>Inclusivity</strong> — RTL languages (Arabic, Persian) are fully supported</li>
      <li><strong>Community</strong> — contributors can add translations for their language</li>
      <li><strong>Global reach</strong> — the tool can be used in any country</li>
    </ul>

    <div class="section-label">Supported Languages</div>
    <div class="lang-grid">${langItems}</div>
  </section>
  <section class="section">
    <div class="section-label">Architecture</div>
    <h2>How i18n works</h2>
    <p>The i18n system is built with TypeScript and follows a layered architecture:</p>
    <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2.5">
      <li><strong>1. Source Catalog</strong> — Translation strings are defined in <code>packages/i18n/src/catalog.ts</code> as a typed TypeScript object</li>
      <li><strong>2. Build Step</strong> — Running <code>npm run build:locales</code> emits JSON files to <code>packages/i18n/locales/</code></li>
      <li><strong>3. Runtime Loading</strong> — The app detects the system language on first launch and loads the appropriate JSON</li>
      <li><strong>4. Fallback</strong> — If a translation is missing, it falls back to English</li>
    </ol>

    <div class="detail-card">
      <h3>🌐 Adding a New Language</h3>
      <p>Contributing a new language is straightforward:</p>
      <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> Copy <code>packages/i18n/locales/en.json</code> to a new file (e.g., <code>hi.json</code> for Hindi)</li>
        <li><strong>2.</strong> Translate the values only — keep all keys in English</li>
        <li><strong>3.</strong> Add your locale to <code>SUPPORTED_LOCALES</code> in <code>packages/i18n/src/catalog.ts</code></li>
        <li><strong>4.</strong> Run <code>npm run build:locales -w @aura-os/i18n</code></li>
        <li><strong>5.</strong> Test your translations in the app</li>
        <li><strong>6.</strong> Submit a PR with the changes</li>
      </ol>
      <p style="margin-top:.75rem">The project uses <a href="https://weblate.org" style="color:var(--color-accent)">Weblate</a> for community translations. You can contribute translations via Weblate or directly via PR.</p>
    </div>

    <div class="detail-card">
      <h3>📐 RTL Support</h3>
      <p>Arabic and Persian use <code>dir="rtl"</code> layout. The RTL support includes:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Layout direction</strong> — entire UI flips horizontally</li>
        <li><strong>Text alignment</strong> — text aligns to the right</li>
        <li><strong>Navigation</strong> — sidebar and menus flip direction</li>
        <li><strong>Typography</strong> — IBM Plex Sans Arabic and Tajawal fonts</li>
        <li><strong>Icons</strong> — directional icons are flipped (arrows, chevrons)</li>
        <li><strong>Animations</strong> — slide animations respect RTL direction</li>
      </ul>
      <p style="margin-top:.75rem">The design system includes proper Arabic typography with built-in font substitution for mixed-language content.</p>
    </div>

    <div class="detail-card">
      <h3>🔧 Translation Keys</h3>
      <p>Translation keys follow a hierarchical structure:</p>
      <pre><code>{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome back, {{name}}",
    "stats": {
      "tasks": "Tasks",
      "projects": "Projects"
    }
  },
  "errors": {
    "network": "Network error. Please check your connection.",
    "auth": "Authentication failed. Please log in again."
  }
}</code></pre>
      <p style="margin-top:.75rem">Use dot notation to reference keys: <code>t('dashboard.stats.tasks')</code>. Variables are wrapped in double curly braces: <code>{{name}}</code>.</p>
    </div>

    <div class="detail-card">
      <h3>📝 Translation Best Practices</h3>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Keep keys in English</strong> — only translate values</li>
        <li><strong>Use placeholders</strong> — for dynamic content (e.g., <code>{{count}}</code>)</li>
        <li><strong>Consider context</strong> — some words have different translations based on context</li>
        <li><strong>Test thoroughly</strong> — check for text overflow, alignment issues</li>
        <li><strong>Use Weblate</strong> — for community translations and consistency</li>
        <li><strong>Review existing translations</strong> — check <code>en.json</code> for the complete list</li>
      </ul>
    </div>
  </section>`;
  return wrapPage("Languages", body, "languages");
}

// ─── Themes Page ─────────────────────────────────────────────────────────────────

function generateThemes() {
  const themes = getThemes();
  const previews = getThemePreviews();
  const luxuryCount = themes.filter(t => t.includes("luxury")).length;
  const body = `<div class="hero">
    <h1><span>Themes</span></h1>
    <p class="subtitle">${themes.length} hand-crafted visual themes spanning light, dark, luxury, and specialty designs.</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${themes.length}</div><div class="lbl">Total Themes</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">${luxuryCount}</div><div class="lbl">Luxury Themes</div></div>
      <div class="stat-card fade-in delay-3"><div class="num">system</div><div class="lbl">Auto mode</div></div>
    </div>
    <p>Every theme uses <strong>flat, solid colors with no gradients</strong> — a design philosophy inspired by warm, calm, coworking spaces. The design tokens are built with CSS custom properties, making themes fully composable.</p>
    
    <h2 style="margin-top:2rem">Theme Categories</h2>
    <p>Themes are organized into categories:</p>
    <table style="margin-top:.75rem">
      <thead><tr><th>Category</th><th>Description</th><th>Examples</th></tr></thead>
      <tbody>
        <tr><td><strong>Standard</strong></td><td>Clean, professional themes for daily use</td><td>light, dark, amoled</td></tr>
        <tr><td><strong>Colorful</strong></td><td>Vibrant themes with distinct color palettes</td><td>blue, forest, ocean, sunset</td></tr>
        <tr><td><strong>Luxury</strong></td><td>Premium themes with rich, sophisticated colors</td><td>luxury-gold, luxury-emerald, luxury-royal</td></tr>
        <tr><td><strong>Specialty</strong></td><td>Unique themes for specific moods or environments</td><td>cyberpunk, matrix, sakura, coffee</td></tr>
        <tr><td><strong>Accessibility</strong></td><td>High-contrast themes for better readability</td><td>high-contrast</td></tr>
        <tr><td><strong>System</strong></td><td>Auto-detects OS preference (light/dark)</td><td>system</td></tr>
      </tbody>
    </table>

    <div class="section-label">Theme Gallery</div>
    <div class="theme-grid">
      ${themes.map((t, i) => {
        const p = previews[t] || { bg: "#1e1b16", fg: "#ece7dc", accent: "#c2683f" };
        return `<div class="theme-swatch fade-in delay-${(i % 6) + 1}">
          <div class="swatch-preview" style="background:${p.bg}">
            <span style="background:${p.fg}"></span>
            <span style="background:${p.accent}"></span>
          </div>
          <div class="swatch-info">
            <h4>${t}</h4>
            <p style="color:${p.accent}">${p.accent}</p>
          </div>
        </div>`;
      }).join("\n")}
    </div>
  </section>
  <section class="section">
    <div class="section-label">Design System</div>
    <h2>Token architecture</h2>
    <p>The design system is defined in <code>packages/ui/src/tokens.css</code> with a layered architecture:</p>
    <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2.5">
      <li><strong>1. Primitives</strong> — base color ramps (sand, terracotta, green, amber, red)</li>
      <li><strong>2. Semantic tokens</strong> — purpose-driven colors (--color-bg, --color-text, --color-accent)</li>
      <li><strong>3. Component tokens</strong> — component-specific overrides (--button-bg, --card-border)</li>
    </ol>
    <p style="margin-top:.75rem">All themes share the same primitive color ramps and override only semantic tokens. This ensures consistency while allowing customization.</p>

    <div class="detail-card">
      <h3>🎨 Color Primitives</h3>
      <p>A warm, clay-based palette with:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Sand neutrals</strong> — warm grays for backgrounds and text</li>
        <li><strong>Terracotta accent</strong> — a single accent color that shifts between light/dark modes</li>
        <li><strong>Semantic greens</strong> — for success states and confirmations</li>
        <li><strong>Amber warnings</strong> — for caution states and alerts</li>
        <li><strong>Red errors</strong> — for error states and destructive actions</li>
      </ul>
      <p style="margin-top:.75rem">The accent shifts between light and dark modes while maintaining the same warm character.</p>
    </div>

    <div class="detail-card">
      <h3>📝 CSS Custom Properties</h3>
      <p>Themes use CSS custom properties for all colors:</p>
      <pre><code>:root {
  /* Backgrounds */
  --color-bg: #faf9f5;
  --color-bg-weak: #f5f3ec;
  --color-bg-card: #ffffff;
  --color-bg-strong: #1e1b16;

  /* Text */
  --color-text: #5c5544;
  --color-text-weak: #938a76;
  --color-text-strong: #28241d;

  /* Accent */
  --color-accent: #c2683f;
  --color-accent-warm: #cf7a52;
  --color-accent-subtle: rgba(194, 104, 63, 0.11);

  /* Semantic */
  --color-success: #4f7d47;
  --color-warning: #a9761f;
  --color-danger: #b8482f;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(54, 46, 32, 0.06);
  --shadow-md: 0 4px 16px rgba(54, 46, 32, 0.09);
  --shadow-lg: 0 16px 40px rgba(54, 46, 32, 0.13);
}</code></pre>
      <p style="margin-top:.75rem">Override these properties in your custom theme to change the entire look.</p>
    </div>

    <div class="detail-card">
      <h3>🔧 Creating Custom Themes</h3>
      <p>Create your own theme by following these steps:</p>
      <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> Copy an existing theme (e.g., <code>light.css</code>)</li>
        <li><strong>2.</strong> Override the CSS custom properties with your colors</li>
        <li><strong>3.</strong> Add your theme to <code>packages/ui/src/themes/</code></li>
        <li><strong>4.</strong> Register it in the theme list</li>
        <li><strong>5.</strong> Test in both light and dark modes</li>
        <li><strong>6.</strong> Submit a PR</li>
      </ol>
      <p style="margin-top:.75rem">See <code>packages/ui/src/themes/</code> for all theme files.</p>
    </div>

    <div class="detail-card">
      <h3>📱 RTL & Accessibility</h3>
      <p>The theme system includes:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>High-contrast theme</strong> — for accessibility (WCAG AA compliant)</li>
        <li><strong>Full RTL support</strong> — for Arabic and Persian</li>
        <li><strong>System preference detection</strong> — via <code>prefers-color-scheme</code></li>
        <li><strong>Reduced motion</strong> — respects <code>prefers-reduced-motion</code></li>
        <li><strong>Font scaling</strong> — supports browser font size adjustments</li>
      </ul>
      <p style="margin-top:.75rem">The <code>system</code> theme automatically matches your OS preference, switching between light and dark mode.</p>
    </div>
  </section>`;
  return wrapPage("Themes", body, "themes");
}

// ─── Permissions Page ────────────────────────────────────────────────────────────

function generatePermissions() {
  const profiles = getPermissionProfiles();
  const body = `<div class="hero">
    <h1><span>Permissions</span></h1>
    <p class="subtitle">Granular, profile-based permission system — you control what agents can access.</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${profiles.length}</div><div class="lbl">Profiles</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">ask-first</div><div class="lbl">Default mode</div></div>
    </div>
    <p>Aura Work uses a <strong>three-tier permission system</strong> to control what the agent can do. Every action is categorized (file, shell, browser, network, etc.) and checked against the active permission profile. This ensures the agent can never do anything you haven't approved.</p>
    
    <h2 style="margin-top:2rem">Why Permissions Matter</h2>
    <p>AI agents are powerful — they can read/write files, execute shell commands, browse the web, and interact with external services. Without proper controls, an agent could:</p>
    <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
      <li>Modify or delete important files</li>
      <li>Execute destructive shell commands</li>
      <li>Send data to external services</li>
      <li>Install unwanted software</li>
      <li>Make unauthorized API calls</li>
    </ul>
    <p style="margin-top:.75rem">The permission system prevents this by requiring explicit approval for high-impact actions. You stay in control at all times.</p>

    <div class="detail-card">
      <h3>🔐 Three Permission Levels</h3>
      <table style="margin-top:.75rem">
        <thead><tr><th>Level</th><th>Description</th><th>Use Case</th></tr></thead>
        <tbody>
          <tr>
            <td><code>read-only</code></td>
            <td>Agent can only read files and data. No modifications allowed.</td>
            <td>Code review, research, analysis</td>
          </tr>
          <tr>
            <td><code>ask-first</code></td>
            <td>Agent asks before each high-impact action. You approve or deny.</td>
            <td>Default mode, balanced control</td>
          </tr>
          <tr>
            <td><code>full-access</code></td>
            <td>Agent can do anything without asking. Use with caution.</td>
            <td>Trusted automation, CI/CD</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="detail-card">
      <h3>📋 Permission Categories</h3>
      <p>Actions are grouped into categories for fine-grained control:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>Category</th><th>Controls</th><th>Examples</th></tr></thead>
        <tbody>
          <tr><td><code>file</code></td><td>File read/write operations</td><td>Read source code, write new files, delete files</td></tr>
          <tr><td><code>shell</code></td><td>Shell command execution</td><td>Run npm install, execute scripts, compile code</td></tr>
          <tr><td><code>browser</code></td><td>Browser automation</td><td>Browse websites, fill forms, extract data</td></tr>
          <tr><td><code>network</code></td><td>Network requests</td><td>API calls, downloads, webhooks</td></tr>
          <tr><td><code>git</code></td><td>Git operations</td><td>Commit, push, branch, merge</td></tr>
          <tr><td><code>plugin</code></td><td>Plugin/MCP calls</td><td>Invoke MCP tools, run plugin functions</td></tr>
          <tr><td><code>computer-use</code></td><td>Desktop automation</td><td>Click, type, screenshot, app control</td></tr>
        </tbody>
      </table>
    </div>

    ${profiles.map((p, i) => `<div class="detail-card fade-in delay-${i+1}">
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <div style="margin-top:.75rem">
        <strong style="font-size:.75rem;font-family:var(--font-mono);color:var(--color-text-weak)">Grants:</strong>
        <ul>${p.grants.map(g => `<li><code>${g.category}</code> — ${g.action}: <code>${g.target}</code></li>`).join("\n")}</ul>
      </div>
    </div>`).join("\n")}
  </section>
  <section class="section">
    <div class="section-label">Configuration</div>
    <h2>Setting up permissions</h2>
    <p>Configure permissions in <strong>Settings → Permissions</strong>:</p>
    <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>1.</strong> Choose your default permission level (read-only, ask-first, or full-access)</li>
      <li><strong>2.</strong> Select a pre-built profile or create a custom one</li>
      <li><strong>3.</strong> Configure per-category permissions (file, shell, browser, etc.)</li>
      <li><strong>4.</strong> Set "always allow" or "always deny" for specific operations</li>
    </ol>

    <div class="detail-card">
      <h3>⚙️ Custom Profiles</h3>
      <p>Create custom permission profiles for different workflows:</p>
      <pre><code>{
  "name": "Development Profile",
  "description": "Full access for trusted development work",
  "permissions": {
    "file": { "read": true, "write": true, "delete": "ask" },
    "shell": { "execute": "ask", "destructive": "deny" },
    "browser": { "browse": true, "forms": "ask" },
    "git": { "commit": true, "push": "ask" },
    "plugin": { "invoke": "ask" }
  }
}</code></pre>
      <p style="margin-top:.75rem">Profiles can be per-project — use read-only for client projects and full-access for personal projects.</p>
    </div>

    <div class="detail-card">
      <h3>🚨 High-Impact Actions</h3>
      <p>These actions always require explicit approval in <code>ask-first</code> mode:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Permanent delete</strong> — deleting files or data</li>
        <li><strong>Shell execution</strong> — running commands (especially destructive ones)</li>
        <li><strong>Computer use</strong> — controlling desktop applications</li>
        <li><strong>Remote dispatch</strong> — sending tasks to Aura Cloud</li>
        <li><strong>File writes</strong> — modifying existing files</li>
        <li><strong>Git commits</strong> — creating commits or pushing</li>
        <li><strong>Browser forms</strong> — submitting forms on websites</li>
        <li><strong>Plugin/MCP calls</strong> — invoking external tools</li>
      </ul>
      <p style="margin-top:.75rem">You can set "always allow" for specific operations you trust, but this is not recommended for high-impact actions.</p>
    </div>
  </section>
  <section class="section">
    <div class="section-label">Audit Trail</div>
    <h2>Every action is logged</h2>
    <p>All permission requests, grants, and denials are recorded in the audit log with complete details:</p>
    <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>Actor</strong> — who performed the action (agent or user)</li>
      <li><strong>Category</strong> — file, shell, browser, git, plugin, etc.</li>
      <li><strong>Action</strong> — read, write, execute, commit, etc.</li>
      <li><strong>Target</strong> — file path, URL, command, etc.</li>
      <li><strong>Risk level</strong> — low, medium, high, critical</li>
      <li><strong>Decision</strong> — allow, deny, approved, pending</li>
      <li><strong>Result</strong> — success, failure, pending</li>
    </ul>
    <p style="margin-top:.75rem">View the audit log in the <strong>Audit Log</strong> page. You can filter by category, risk level, date range, and more. The audit log is append-only and cannot be modified.</p>

    <div class="detail-card">
      <h3>🔐 Encrypted Vault</h3>
      <p>Secrets, API keys, and session tokens are stored in a device-bound encrypted vault:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Encryption</strong> — ChaCha20-Poly1305 with Argon2 key derivation</li>
        <li><strong>Device-bound</strong> — keys are tied to your device (DPAPI/Keychain/Secret Service)</li>
        <li><strong>Biometric unlock</strong> — supports fingerprint/face recognition on supported platforms</li>
        <li><strong>Versioned secrets</strong> — track changes to API keys over time</li>
        <li><strong>Secure deletion</strong> — secrets are securely wiped when removed</li>
      </ul>
      <p style="margin-top:.75rem">The vault is stored at <code>%APPDATA%\\com.auraos.desktop\\vault.enc</code> on Windows, <code>~/Library/Application Support/com.auraos.desktop/vault.enc</code> on macOS, and <code>~/.config/com.auraos.desktop/vault.enc</code> on Linux.</p>
    </div>
  </section>`;
  return wrapPage("Permissions", body, "permissions");
}

// ─── Architecture Page ───────────────────────────────────────────────────────────

function generateArchitecture() {
  const body = `<div class="hero">
    <h1><span>Architecture</span></h1>
    <p class="subtitle">Tauri 2 + React 19 + Rust — a modern, multi-process desktop platform.</p>
  </div>
  <section class="section">
    <p>Aura Work is built on a <strong>multi-process architecture</strong> where the Tauri 2 shell hosts a React 19 frontend and manages 8 independent sidecar processes, each sandboxed and authenticated. This design ensures security, isolation, and extensibility.</p>
    
    <h2 style="margin-top:2rem">System Architecture</h2>
    <p>The architecture follows a layered approach:</p>
    <pre><code>┌─────────────────────────────────────────────────────────┐
│                    Desktop Shell (Tauri 2 + Rust)        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Frontend (React 19 + Vite)             │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │ │
│  │  │Tasks │ │Files │ │ Git  │ │Browse│ │Plugins│     │ │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │ │
│  └─────────────────────────────────────────────────────┘ │
│                           │ IPC                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Rust Backend (Commands)                │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │ │
│  │  │Vault │ │SQLite│ │Shell │ │ FS   │ │Process│     │ │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │ │
│  └─────────────────────────────────────────────────────┘ │
│                           │ HTTP/IPC                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Sidecar Services (Node.js)             │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │ │
│  │  │Agent │ │  VM  │ │Browse│ │Plugin│ │Cloud │     │ │
│  │  │:47821│ │:47822│ │:47823│ │:47824│ │:47825│     │ │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐                        │ │
│  │  │Bridge│ │CompU │ │CloudS│                        │ │
│  │  │:47826│ │:47828│ │:47830│                        │ │
│  │  └──────┘ └──────┘ └──────┘                        │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘</code></pre>
    
    <div class="detail-card">
      <h3>🖥️ Desktop Shell (Tauri 2 + Rust)</h3>
      <p>The outer shell built with Tauri 2 and Rust. It handles:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Window management</strong> — native windows, system tray, menus</li>
        <li><strong>IPC bridge</strong> — communication between frontend and sidecars</li>
        <li><strong>Filesystem access</strong> — secure file operations with permission checks</li>
        <li><strong>Process lifecycle</strong> — starting, stopping, and monitoring sidecars</li>
        <li><strong>Vault management</strong> — encrypted storage for API keys and secrets</li>
        <li><strong>SQLite database</strong> — local persistence for projects, tasks, settings</li>
      </ul>
      <p style="margin-top:.75rem">The Rust backend is performance-critical and security-sensitive. It handles operations that require system-level access.</p>
    </div>
    <div class="detail-card">
      <h3>🎨 Frontend (React 19 + TypeScript)</h3>
      <p>The UI layer built with React 19 and Vite. It provides:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>14 main pages</strong> — Dashboard, Tasks, Files, Git, Terminal, Providers, Plugins, Browser, Computer Use, Scheduled Tasks, Memory, Audit Log, Cloud, Extensions</li>
        <li><strong>10 settings tabs</strong> — General, Vault, VM, Cloud, Extension, Pet, Readiness, Diagnostics, Local Model, Approvals</li>
        <li><strong>Chat interface</strong> — the main interaction point with the agent</li>
        <li><strong>Monaco editor</strong> — code editing with syntax highlighting</li>
        <li><strong>Design system</strong> — 35+ themes, RTL support, responsive layout</li>
      </ul>
      <p style="margin-top:.75rem">The frontend communicates with the Rust backend via Tauri's IPC system. All commands are typed and validated.</p>
    </div>
    <div class="detail-card">
      <h3>⚙️ Agent Engine (TypeScript)</h3>
      <p>The brain of Aura Work — a multi-agent orchestration system:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Planner</strong> — decomposes tasks into step-by-step plans</li>
        <li><strong>Executor</strong> — runs each step, calling tools as needed</li>
        <li><strong>Reviewer</strong> — validates output for correctness and safety</li>
        <li><strong>Safety</strong> — enforces boundaries and permission checks</li>
      </ul>
      <p style="margin-top:.75rem">The agent supports custom tools, MCP servers, and plugins. It can use any combination of capabilities to complete tasks.</p>
    </div>
    <div class="detail-card">
      <h3>🔗 Bridge Server (TypeScript)</h3>
      <p>HTTP API for pairing external clients:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>CLI</strong> — terminal-based control via <code>aura</code> command</li>
        <li><strong>Chrome extension</strong> — browser integration for page reading</li>
        <li><strong>Office add-in</strong> — document delegation from Word/Excel</li>
      </ul>
      <p style="margin-top:.75rem">The Bridge runs on port 47826 and requires session-based authentication. It only listens on localhost for security.</p>
    </div>
  </section>
  <section class="section">
    <div class="section-label">Data Flow</div>
    <h2>How data moves</h2>
    <p>When you type a prompt, here's the complete data flow:</p>
    <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2.5">
      <li><strong>1. User Input</strong> — You type in the React chat interface</li>
      <li><strong>2. IPC Call</strong> — Frontend sends the prompt to Rust backend via Tauri IPC</li>
      <li><strong>3. Task Creation</strong> — Rust creates a task in SQLite with status "planning"</li>
      <li><strong>4. Agent Orchestration</strong> — Rust calls the Agent sidecar (port 47821)</li>
      <li><strong>5. Planning</strong> — Planner agent creates a step-by-step plan</li>
      <li><strong>6. Routing</strong> — Routing engine selects the best provider/model</li>
      <li><strong>7. Permission Check</strong> — Each step is checked against permission profile</li>
      <li><strong>8. Execution</strong> — Executor agent runs each step, calling tools</li>
      <li><strong>9. Tool Calls</strong> — Tools may call other sidecars (VM, Browser, etc.)</li>
      <li><strong>10. Review</strong> — Reviewer agent validates the output</li>
      <li><strong>11. Response</strong> — Results are sent back to frontend via IPC</li>
      <li><strong>12. Display</strong> — Frontend renders the results in the chat</li>
    </ol>
    <p style="margin-top:1.5rem">All interactions are logged to the audit trail. File operations go through the permission gate before reaching the filesystem.</p>
  </section>
  <section class="section">
    <div class="section-label">Tech Stack</div>
    <h2>Technologies used</h2>
    <table>
      <thead><tr><th>Layer</th><th>Technology</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>Desktop Shell</td><td>Tauri 2</td><td>Native window, menus, system tray, IPC</td></tr>
        <tr><td>Core Backend</td><td>Rust</td><td>Performance-critical operations, security</td></tr>
        <tr><td>Frontend</td><td>React 19 + Vite 8</td><td>UI rendering, hot reload, TypeScript</td></tr>
        <tr><td>Sidecars</td><td>Node.js / TypeScript</td><td>Background daemon services</td></tr>
        <tr><td>Agent Engine</td><td>TypeScript</td><td>Multi-agent orchestration</td></tr>
        <tr><td>Persistence</td><td>SQLite (rusqlite)</td><td>Local data storage</td></tr>
        <tr><td>Encryption</td><td>ChaCha20-Poly1305 + Argon2</td><td>Credential security</td></tr>
        <tr><td>Build System</td><td>npm workspaces + esbuild</td><td>Monorepo tooling</td></tr>
        <tr><td>Package Format</td><td>Tauri bundler</td><td>.msi, .dmg, .deb, .AppImage</td></tr>
      </tbody>
    </table>
  </section>
  <section class="section">
    <div class="section-label">Project Structure</div>
    <h2>Codebase organization</h2>
    <pre><code>aura-work/
├── apps/desktop/           # Tauri desktop app
│   ├── src/                # React components and pages
│   └── src-tauri/src/      # Rust commands and business logic
├── packages/
│   ├── ui/src/             # Design system (tokens, components)
│   ├── shared/             # TypeScript types and constants
│   ├── i18n/               # i18n localization (20 languages)
│   └── aura-plugin/        # Plugin SDK
├── sidecar/
│   ├── aura-agent/         # Task engine + providers
│   ├── aura-vm-helper/     # VM/shell execution
│   ├── aura-browser-helper/# Browser automation
│   ├── aura-plugins-helper/# Plugin/MCP management
│   ├── aura-cloud-sync/    # E2EE sync client
│   ├── aura-bridge/        # Extension bridge
│   ├── aura-computer-use/  # Computer Use helper
│   └── aura-cloud/         # Self-hostable cloud server
├── cli/aura-cli/           # CLI companion
├── registry/               # Marketplace registry
├── docs/                   # Feature documentation
├── examples/               # Sample plugins and MCP servers
├── qa/                     # Acceptance test suite
└── scripts/                # Build, bundle, release scripts</code></pre>
  </section>`;
  return wrapPage("Architecture", body, "architecture");
}

// ─── CLI Page ────────────────────────────────────────────────────────────────────

function generateCLI() {
  const body = `<div class="hero">
    <h1><span>CLI</span></h1>
    <p class="subtitle">Command-line bridge client for remote control of the Aura desktop app.</p>
  </div>
  <section class="section">
    <p>The <code>aura</code> CLI tool pairs with the Aura Work desktop app via the Bridge sidecar. It allows creating tasks, checking status, and managing projects — all from the terminal. The CLI is perfect for automation, CI/CD pipelines, and developers who prefer terminal workflows.</p>
    
    <h2 style="margin-top:2rem">Installation</h2>
    <p>Install the CLI globally via npm:</p>
    <pre><code>npm install -g @aura-work/cli</code></pre>
    <p style="margin-top:.75rem">Or use it directly with npx:</p>
    <pre><code>npx @aura-work/cli status</code></pre>

    <div class="detail-card">
      <h3>📋 Complete Command Reference</h3>
      <table style="margin-top:.75rem">
        <thead><tr><th>Command</th><th>Description</th><th>Example</th></tr></thead>
        <tbody>
          <tr><td><code>aura status</code></td><td>Check bridge health and connection</td><td><code>aura status</code></td></tr>
          <tr><td><code>aura pair --code &lt;code&gt;</code></td><td>Pair CLI with desktop app</td><td><code>aura pair --code ABC123</code></td></tr>
          <tr><td><code>aura projects</code></td><td>List all projects</td><td><code>aura projects</code></td></tr>
          <tr><td><code>aura task create</code></td><td>Create and start a task</td><td><code>aura task create --project my-app --prompt "Add auth"</code></td></tr>
          <tr><td><code>aura task get &lt;id&gt;</code></td><td>Get task details and status</td><td><code>aura task get task_abc123</code></td></tr>
          <tr><td><code>aura task logs &lt;id&gt;</code></td><td>Stream task execution logs</td><td><code>aura task logs task_abc123</code></td></tr>
          <tr><td><code>aura open task &lt;id&gt;</code></td><td>Open task in desktop UI</td><td><code>aura open task task_abc123</code></td></tr>
        </tbody>
      </table>
    </div>

    <div class="detail-card">
      <h3>🔐 Pairing Flow</h3>
      <p>The CLI connects to the desktop app through the Bridge sidecar. Here's how to set it up:</p>
      <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> Open the desktop app and go to <strong>Extensions → Pair New Device</strong></li>
        <li><strong>2.</strong> A pairing code is displayed (valid for 10 minutes)</li>
        <li><strong>3.</strong> Run <code>aura pair --code &lt;code&gt;</code> in your terminal</li>
        <li><strong>4.</strong> The CLI saves a session token to <code>~/.aura/config.json</code></li>
        <li><strong>5.</strong> All subsequent commands use this token for authentication</li>
      </ol>
      <p style="margin-top:.75rem">The pairing creates a secure session. You can revoke access anytime from the desktop app under Extensions → Paired Devices.</p>
    </div>

    <div class="detail-card">
      <h3>🔄 Usage Examples</h3>
      
      <h4 style="margin-top:1rem;margin-bottom:.5rem">Create a task from the terminal</h4>
      <pre><code># Create a task in the current project
aura task create --prompt "Fix the login bug in auth.ts"

# Create a task in a specific project
aura task create --project my-web-app --prompt "Add user profile page"

# Create a task with specific permissions
aura task create --prompt "Refactor database" --permissions "file,shell"</code></pre>

      <h4 style="margin-top:1rem;margin-bottom:.5rem">Monitor task progress</h4>
      <pre><code># Get task status
aura task get task_abc123

# Stream logs in real-time
aura task logs task_abc123

# Open task in desktop UI for visual monitoring
aura open task task_abc123</code></pre>

      <h4 style="margin-top:1rem;margin-bottom:.5rem">Automation script</h4>
      <pre><code>#!/bin/bash
# Run a task and wait for completion
TASK_ID=$(aura task create --prompt "Run tests" --json | jq -r '.id')
echo "Task created: $TASK_ID"

# Poll for completion
while true; do
  STATUS=$(aura task get $TASK_ID --json | jq -r '.status')
  if [ "$STATUS" = "completed" ]; then
    echo "Task completed!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Task failed!"
    exit 1
  fi
  sleep 5
done</code></pre>
    </div>

    <div class="detail-card">
      <h3>🔒 Security Model</h3>
      <p>The CLI connects through the local Bridge sidecar (port 47826). Key security features:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Session-based auth</strong> — each CLI session has a unique token</li>
        <li><strong>Permission respect</strong> — CLI cannot bypass any permission, it follows the same profiles as the desktop UI</li>
        <li><strong>Local only</strong> — Bridge only listens on localhost, no remote access</li>
        <li><strong>Token revocation</strong> — revoke CLI access anytime from the desktop app</li>
        <li><strong>Audit logging</strong> — all CLI actions are logged in the audit trail</li>
      </ul>
      <p style="margin-top:.75rem">The Bridge sidecar runs only when the desktop app is open. It stops when the app closes — no background daemon.</p>
    </div>

    <div class="detail-card">
      <h3>⚡ CI/CD Integration</h3>
      <p>Use the CLI in automation pipelines:</p>
      <pre><code># GitHub Actions example
name: Run AI Task
on: push
jobs:
  ai-task:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install -g @aura-work/cli
      - run: aura pair --code \${{ secrets.AURA_PAIR_CODE }}
      - run: aura task create --prompt "Review code changes" --wait</code></pre>
      <p style="margin-top:.75rem">Store the pairing code as a GitHub secret. The <code>--wait</code> flag blocks until the task completes.</p>
    </div>

    <div class="detail-card">
      <h3>🛠️ Configuration</h3>
      <p>The CLI stores its configuration in <code>~/.aura/config.json</code>:</p>
      <pre><code>{
  "sessionToken": "abc123...",
  "bridgeHost": "localhost",
  "bridgePort": 47826,
  "defaultProject": "my-project",
  "outputFormat": "text"  // or "json"
}</code></pre>
      <p style="margin-top:.75rem">Set <code>outputFormat</code> to <code>json</code> for machine-readable output in scripts.</p>
    </div>
  </section>`;
  return wrapPage("CLI", body, "cli");
}

// ─── MCP Page ───────────────────────────────────────────────────────────────────

function generateMCP() {
  const body = `<div class="hero">
    <h1><span>MCP</span></h1>
    <p class="subtitle">Model Context Protocol — extend agent capabilities with third-party tools.</p>
  </div>
  <section class="section">
    <p>MCP (Model Context Protocol) is an <strong>open standard</strong> for connecting AI agents with external tools and data sources. Aura Work supports MCP servers as a first-class extension mechanism alongside built-in skills and plugins. MCP allows you to add new capabilities without modifying the core application — just install a server and the agent can use its tools.</p>
    
    <h2 style="margin-top:2rem">What is MCP?</h2>
    <p>MCP is a protocol that lets AI agents communicate with external services through a standardized interface. Think of it as a <strong>universal adapter</strong> for AI tools — instead of building custom integrations for each service, MCP provides a common language that both the agent and the service understand.</p>
    <p style="margin-top:.75rem">With MCP, you can connect the agent to:</p>
    <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>Databases</strong> — query PostgreSQL, MySQL, SQLite, MongoDB</li>
      <li><strong>APIs</strong> — interact with GitHub, Slack, Discord, Jira, etc.</li>
      <li><strong>File systems</strong> — access cloud storage (S3, GCS, Azure Blob)</li>
      <li><strong>Development tools</strong> — linters, formatters, test runners</li>
      <li><strong>Custom services</strong> — your own internal tools and APIs</li>
    </ul>

    <div class="detail-card">
      <h3>⚙️ How MCP Works in Aura Work</h3>
      <p>MCP servers are managed by the <strong>Plugins Helper</strong> sidecar (port 47824). When you add an MCP server:</p>
      <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> The Plugins Helper starts the server process (for stdio) or connects to it (for SSE)</li>
        <li><strong>2.</strong> The server announces its capabilities (tools, resources, prompts)</li>
        <li><strong>3.</strong> These capabilities are registered with the agent engine</li>
        <li><strong>4.</strong> When the agent needs a tool, it can now call the MCP server's tools</li>
        <li><strong>5.</strong> Each tool call goes through the permission gate for approval</li>
      </ol>
      <p style="margin-top:.75rem">The agent automatically discovers which MCP tools are available and selects them when appropriate — you don't need to explicitly tell it to use an MCP tool.</p>
    </div>

    <div class="detail-card">
      <h3>🔌 Supported Transports</h3>
      <p>MCP supports two transport mechanisms:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>Transport</th><th>How it Works</th><th>Best For</th></tr></thead>
        <tbody>
          <tr>
            <td><code>stdio</code></td>
            <td>Server runs as a subprocess. Communication happens via stdin/stdout pipes.</td>
            <td>Local tools, CLI wrappers, simple integrations</td>
          </tr>
          <tr>
            <td><code>SSE</code></td>
            <td>Server runs as an HTTP service. Communication happens via Server-Sent Events.</td>
            <td>Remote services, containerized servers, multi-client setups</td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top:.75rem">Most community MCP servers use <code>stdio</code> because it's simpler — no network configuration needed. Use <code>SSE</code> when the server needs to be shared across multiple clients or runs in a container.</p>
    </div>

    <div class="detail-card">
      <h3>📦 Installing MCP Servers</h3>
      <p>There are three ways to add MCP servers:</p>
      
      <h4 style="margin-top:1rem;margin-bottom:.5rem">Method 1: Marketplace (Recommended)</h4>
      <p>Open the <strong>Plugins panel</strong> in the desktop app, search for an MCP server, and click Install. The marketplace handles versioning, updates, and dependency management.</p>
      
      <h4 style="margin-top:1rem;margin-bottom:.5rem">Method 2: Manual Configuration</h4>
      <p>Add a server manually in Settings → Plugins → MCP Servers:</p>
      <pre><code>{
  "name": "my-database-server",
  "command": "node",
  "args": ["path/to/mcp-server.js"],
  "env": {
    "DATABASE_URL": "postgresql://localhost/mydb"
  }
}</code></pre>
      
      <h4 style="margin-top:1rem;margin-bottom:.5rem">Method 3: Project-Level Config</h4>
      <p>Add MCP servers to your project's <code>aura.jsonc</code> file:</p>
      <pre><code>{
  "mcp": {
    "test-project-server": {
      "type": "local",
      "command": ["node", "/path/to/test-mcp-server.js"],
      "enabled": true,
      "environment": {
        "TEST_ENV_VAR": "Hello from project-level config"
      }
    }
  }
}</code></pre>
      <p style="margin-top:.75rem">Project-level servers are only available when working in that project — perfect for project-specific tools.</p>
    </div>

    <div class="detail-card">
      <h3>🔐 Security & Permissions</h3>
      <p>MCP tool calls are subject to the same permission system as built-in tools:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Per-tool approval</strong> — each MCP tool can be individually approved or denied</li>
        <li><strong>Sandboxed execution</strong> — MCP servers run in isolated processes</li>
        <li><strong>Permission declarations</strong> — servers must declare what they need access to</li>
        <li><strong>Audit logging</strong> — all MCP calls are logged with tool name, arguments, and result</li>
      </ul>
      <p style="margin-top:.75rem">In <code>ask-first</code> mode, you'll be prompted before each MCP tool call. You can set "always allow" for trusted servers in Settings → Permissions.</p>
    </div>

    <div class="detail-card">
      <h3>🛒 Marketplace</h3>
      <p>The marketplace (<code>registry/marketplace.json</code>) includes MCP servers alongside skills and plugins. Each entry includes:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Server manifest</strong> — command, args, env vars, transport type</li>
        <li><strong>Tool descriptions</strong> — what each tool does and its parameters</li>
        <li><strong>Localized descriptions</strong> — available in 20 languages</li>
        <li><strong>Version info</strong> — for updates and compatibility checks</li>
        <li><strong>Risk assessment</strong> — based on required permissions</li>
      </ul>
      <p style="margin-top:.75rem">Browse the marketplace in the Plugins panel or check <code>registry/mcp/</code> for available servers.</p>
    </div>

    <div class="detail-card">
      <h3>🛠️ Developing MCP Servers</h3>
      <p>You can create your own MCP servers using the official MCP SDK:</p>
      <pre><code>// my-mcp-server.js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "my-custom-server",
  version: "1.0.0"
}, {
  capabilities: { tools: {} }
});

// Define a tool
server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "my_tool",
    description: "Does something useful",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Input query" }
      },
      required: ["query"]
    }
  }]
}));

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  if (name === "my_tool") {
    return { content: [{ type: "text", text: "Result: " + args.query }] };
  }
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);</code></pre>
      <p style="margin-top:.75rem">See <code>examples/mcp-server/</code> for a complete working example.</p>
    </div>

    <div class="detail-card">
      <h3>💡 Common MCP Servers</h3>
      <p>Popular community MCP servers include:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>Server</th><th>Purpose</th><th>Transport</th></tr></thead>
        <tbody>
          <tr><td><code>filesystem</code></td><td>Read/write files, search, list directories</td><td>stdio</td></tr>
          <tr><td><code>github</code></td><td>Manage repos, issues, PRs via GitHub API</td><td>stdio</td></tr>
          <tr><td><code>postgres</code></td><td>Query PostgreSQL databases</td><td>stdio</td></tr>
          <tr><td><code>slack</code></td><td>Send messages, read channels</td><td>stdio</td></tr>
          <tr><td><code>puppeteer</code></td><td>Browser automation with Chrome</td><td>stdio</td></tr>
          <tr><td><code>brave-search</code></td><td>Web search via Brave API</td><td>stdio</td></tr>
        </tbody>
      </table>
      <p style="margin-top:.75rem">Find more at <a href="https://github.com/modelcontextprotocol/servers" style="color:var(--color-accent)">github.com/modelcontextprotocol/servers</a></p>
    </div>
  </section>`;
  return wrapPage("MCP", body, "mcp");
}

// ─── Quick Start Page ───────────────────────────────────────────────────────────

function generateQuickStart() {
  const body = `<div class="hero">
    <h1><span>Quick Start</span></h1>
    <p class="subtitle">From zero to running your first AI agent task.</p>
  </div>
  <section class="section">
    <p>This guide will get you from installation to your first AI-powered task in under 5 minutes. Aura Work is available for <strong>Windows, macOS, and Linux</strong>.</p>

    <h2 style="margin-top:2rem">System Requirements</h2>
    <table style="margin-top:.75rem">
      <thead><tr><th>Platform</th><th>Requirements</th></tr></thead>
      <tbody>
        <tr><td><strong>Windows</strong></td><td>Windows 10+ (WebView2 included), 4GB RAM minimum</td></tr>
        <tr><td><strong>macOS</strong></td><td>macOS 11+, Xcode Command Line Tools</td></tr>
        <tr><td><strong>Linux</strong></td><td>Ubuntu 20.04+, libwebkit2gtk-4.1-dev, libappindicator3-dev</td></tr>
      </tbody>
    </table>

    <div class="detail-card">
      <h3>1. Install</h3>
      <p>Download the latest release from <a href="https://github.com/hbx12/aura-work/releases/latest" style="color:var(--color-accent)">GitHub Releases</a>. Installers are available for Windows (.msi), macOS (.dmg), and Linux (.deb, .AppImage).</p>
      <p style="margin-top:.75rem"><strong>Windows:</strong> Run the .msi installer and follow the prompts. The app will be added to your Start Menu.</p>
      <p style="margin-top:.5rem"><strong>macOS:</strong> Open the .dmg file and drag Aura Work to your Applications folder.</p>
      <p style="margin-top:.5rem"><strong>Linux:</strong> Install the .deb package with <code>sudo dpkg -i aura-work.deb</code> or run the .AppImage directly.</p>
    </div>

    <div class="detail-card">
      <h3>2. Launch</h3>
      <p>Open Aura Work. The app starts with a default project and the Agent panel ready. You'll see the chat interface where you can type your first task.</p>
      <p style="margin-top:.75rem">On first launch, the app will:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li>Create a local SQLite database for projects and tasks</li>
        <li>Initialize the encrypted vault for API keys</li>
        <li>Start the Agent sidecar (port 47821)</li>
        <li>Detect your system language and apply the appropriate theme</li>
      </ul>
    </div>

    <div class="detail-card">
      <h3>3. Configure a Provider</h3>
      <p>Go to <strong>Settings → Providers</strong>. You need at least one AI provider to use Aura Work. Options:</p>
      
      <h4 style="margin-top:1rem;margin-bottom:.5rem">Option A: Cloud Provider (Recommended for getting started)</h4>
      <ol style="padding-left:1.25rem;margin-top:.5rem;line-height:2">
        <li><strong>1.</strong> Click on a provider (OpenAI, Anthropic, Gemini, etc.)</li>
        <li><strong>2.</strong> Enter your API key</li>
        <li><strong>3.</strong> Click "Validate" to test the connection</li>
        <li><strong>4.</strong> Select which models you want to use</li>
      </ol>

      <h4 style="margin-top:1rem;margin-bottom:.5rem">Option B: Local Provider (Free, no API key needed)</h4>
      <ol style="padding-left:1.25rem;margin-top:.5rem;line-height:2">
        <li><strong>1.</strong> Install <a href="https://ollama.ai" style="color:var(--color-accent)">Ollama</a> on your machine</li>
        <li><strong>2.</strong> Pull a model: <code>ollama pull llama3</code></li>
        <li><strong>3.</strong> In Aura Work, enable the Ollama provider</li>
        <li><strong>4.</strong> The app auto-discovers available models</li>
      </ol>
      <p style="margin-top:.75rem">Local providers keep all data on your machine — no API keys, no internet required.</p>
    </div>

    <div class="detail-card">
      <h3>4. Run Your First Task</h3>
      <p>Type a prompt in the chat interface. Here are some examples to try:</p>
      <pre><code># Code tasks
"Create a new React component that fetches data from an API"
"Fix the bug in auth.ts where login fails with special characters"
"Add unit tests for the UserService class"

# Document tasks
"Create a PDF report summarizing the project structure"
"Generate a spreadsheet with the test results"

# Research tasks
"Find information about the latest Node.js security best practices"
"Compare PostgreSQL vs MongoDB for our use case"

# Browser tasks
"Browse https://example.com and extract all the headings"
"Fill out the contact form on the website"</code></pre>
      <p style="margin-top:.75rem">The agent will:</p>
      <ol style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> Analyze your request and create a plan</li>
        <li><strong>2.</strong> Select the best provider and model (based on your routing policy)</li>
        <li><strong>3.</strong> Execute each step, calling tools as needed</li>
        <li><strong>4.</strong> Show you the results and ask for approval on high-impact actions</li>
      </ol>
    </div>

    <div class="detail-card">
      <h3>5. Explore</h3>
      <p>Now that you have your first task running, explore these features:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Skills</strong> — try "Use the research skill to..." or "Create a spreadsheet with..."</li>
        <li><strong>MCP Servers</strong> — install MCP servers from the Plugins panel for more capabilities</li>
        <li><strong>Routing Policies</strong> — change your routing policy in Settings → Routing</li>
        <li><strong>Scheduled Tasks</strong> — set up recurring tasks in the Scheduled Tasks page</li>
        <li><strong>CLI</strong> — install the CLI for terminal-based control: <code>npm install -g @aura-work/cli</code></li>
        <li><strong>Browser Automation</strong> — try "Browse this website and..." for web tasks</li>
        <li><strong>Computer Use</strong> — enable experimental computer use for desktop automation</li>
      </ul>
    </div>
  </section>
  <section class="section">
    <div class="section-label">Configuration</div>
    <h2>Essential settings</h2>
    
    <div class="detail-card">
      <h3>🔀 Routing Policy</h3>
      <p>Configure how the agent selects providers in <strong>Settings → Routing</strong>:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Quality-first</strong> — uses the best model available (recommended for important tasks)</li>
        <li><strong>Cost-first</strong> — uses the cheapest model that can handle the task</li>
        <li><strong>Privacy-first</strong> — only uses local providers (Ollama, LM Studio)</li>
        <li><strong>Local-only</strong> — same as privacy-first, but stricter enforcement</li>
        <li><strong>Manual</strong> — you choose the provider for each task</li>
      </ul>
    </div>

    <div class="detail-card">
      <h3>🔐 Permissions</h3>
      <p>Configure what the agent can do in <strong>Settings → Permissions</strong>:</p>
      <ul style="padding-left:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Ask-first</strong> (default) — agent asks before each high-impact action</li>
        <li><strong>Read-only</strong> — agent can only read files, no modifications</li>
        <li><strong>Full access</strong> — agent can do anything (use with caution)</li>
      </ul>
      <p style="margin-top:.75rem">You can also set per-category permissions (file, shell, browser, etc.) and create custom profiles.</p>
    </div>

    <div class="detail-card">
      <h3>🎨 Theme</h3>
      <p>Choose from 35+ themes in <strong>Settings → General → Theme</strong>. Options include light, dark, AMOLED, and luxury themes. The <code>system</code> theme automatically matches your OS preference.</p>
    </div>
  </section>
  <section class="section">
    <div class="section-label">Next Steps</div>
    <h2>Going deeper</h2>
    <p>Read about <a href="providers" style="color:var(--color-accent)">Providers</a>, <a href="routing" style="color:var(--color-accent)">Routing</a>, <a href="skills" style="color:var(--color-accent)">Skills</a>, or <a href="architecture" style="color:var(--color-accent)">Architecture</a>. For contributors, see the <a href="https://github.com/hbx12/aura-work/blob/main/CONTRIBUTING.md" style="color:var(--color-accent)">Contributing Guide</a> and <a href="https://github.com/hbx12/aura-work/blob/main/docs/new-contributor.md" style="color:var(--color-accent)">New Contributor Guide</a>.</p>
  </section>`;
  return wrapPage("Quick Start", body, "quickstart");
}

// ─── Main Generation ─────────────────────────────────────────────────────────────

function main() {
  mkdirSync(DOCS_PAGES_DIR, { recursive: true });

  const pages = {
    "docs/docs.html": generateDocsHub(),
    "docs/overview": generateOverview(),
    "docs/quickstart": generateQuickStart(),
    "docs/providers": generateProviders(),
    "docs/routing": generateRouting(),
    "docs/skills": generateSkills(),
    "docs/sidecars": generateSidecars(),
    "docs/languages": generateLanguages(),
    "docs/themes": generateThemes(),
    "docs/permissions": generatePermissions(),
    "docs/architecture": generateArchitecture(),
    "docs/cli": generateCLI(),
    "docs/mcp": generateMCP(),
  };

  for (const [relPath, html] of Object.entries(pages)) {
    const fullPath = join(DOCS_DIR, relPath.endsWith(".html") ? relPath : relPath + ".html");
    const dir = dirname(fullPath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, html, "utf-8");
    console.log(`  ✓ ${fullPath.replace(ROOT, "").replace(/\\/g, "/")}`);
  }

  // Create index redirect for /docs/
  const redirect = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=https://aura-work.shop/docs/docs.html"><title>Redirect</title></head><body><a href="https://aura-work.shop/docs/docs.html">Docs</a></body></html>`;
  writeFileSync(join(DOCS_DIR, "docs", "index.html"), redirect, "utf-8");
  console.log("  ✓ /docs/docs/index.html (redirect)");
}

console.log("⚡ Aura Work — Docs Generator\n");
console.log("Scanning codebase...");
console.log(`  Version: ${getVersion()}`);
console.log(`  Skills: ${getSkills().length}`);
console.log(`  Languages: ${getLanguages().length}`);
console.log(`  Themes: ${getThemes().length}`);
console.log(`  Providers: ${getProviders().length}`);
console.log(`  Sidecars: ${getSidecars().length}`);
console.log(`\nGenerating pages...\n`);

try {
  main();
  console.log(`\n✅ Done! All pages generated in docs/docs/`);
} catch (e) {
  console.error("\n❌ Error:", e.message);
  process.exit(1);
}
