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

/* Responsive table toggle for mobile */
@media(max-width:48rem){.card-grid{grid-template-columns:1fr}.stats-bar{grid-template-columns:repeat(3,1fr)}}
`;
}

// ─── Layout Template ────────────────────────────────────────────────────────────

function pageHeader(title, activePage) {
  const isDocs = activePage === "docs";
  return `<header>
  <div class="header-inner">
    <a href="https://hbx12.github.io/aura-work/" class="logo">
      <span class="logo-mark">A</span>
      Aura Work
    </a>
    <nav>
      <ul>
        <li><a href="https://hbx12.github.io/aura-work/${isDocs ? '' : ''}" ${!isDocs ? 'class="active"' : ''}>Home</a></li>
        <li><a href="https://hbx12.github.io/aura-work/docs/docs.html" ${isDocs ? 'class="active"' : ''}>Docs</a></li>
        <li><a href="https://github.com/hbx12/aura-work">GitHub</a></li>
        <li style="position:relative">
          <a href="#" onclick="event.preventDefault();document.getElementById('lm').classList.toggle('open')" style="display:flex;align-items:center;gap:4px;cursor:pointer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            EN
          </a>
          <div id="lm" class="lang-dropdown">
            <a href="https://hbx12.github.io/aura-work/docs/docs.html">English</a>
            <a href="https://hbx12.github.io/aura-work/docs/docs/docs.ar.html">العربية</a>
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

function wrapPage(titleHTML, bodyContent, activePage = "docs") {
  const heroMatch = bodyContent.match(/<div class="hero">([\s\S]*?)<\/div>/);
  const heroContent = heroMatch ? heroMatch[1] : "";
  const restContent = heroMatch ? bodyContent.replace(heroMatch[0], "") : bodyContent;
  return `<!DOCTYPE html>
<html lang="en" data-page="aura-work">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleHTML} — Aura Work Docs</title>
<meta name="description" content="Aura Work documentation — ${titleHTML}">
<meta property="og:title" content="${titleHTML} — Aura Work">
<meta property="og:description" content="${titleHTML} — Aura Work documentation">
<meta property="og:url" content="https://hbx12.github.io/aura-work/">
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
</head>
<body>
<div class="page">
${pageHeader("Docs", "docs")}
<main>
<a href="https://hbx12.github.io/aura-work/docs/docs.html" class="back-link">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
  Back to Docs Hub
</a>
${bodyContent}
</main>
${pageFooter()}
</div>
<script>
document.addEventListener('DOMContentLoaded',function(){var o=new IntersectionObserver(function(e){e.forEach(function(e){if(e.isIntersecting){e.target.classList.add('visible');o.unobserve(e.target)}})},{threshold:.1});document.querySelectorAll('.fade-in').forEach(function(e){o.observe(e)})});
document.addEventListener('click',function(e){var m=document.getElementById('lm');if(m&&!e.target.closest('[onclick*="toggleLang"]')&&!e.target.closest('#lm'))m.classList.remove('open')});
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
    { href: "overview", title: "Overview", desc: "What is Aura Work and why it exists", icon: "◆", color: "#c2683f" },
    { href: "quickstart", title: "Quick Start", desc: "Install, configure, run your first task", icon: "▶", color: "#1a7f64" },
    { href: "providers", title: `Providers (${providers.length})`, desc: `${providers.length} AI model providers with auto-discovery`, icon: "◆", color: "#c48b5c" },
    { href: "routing", title: `Routing (${routes.length} policies)`, desc: `Intelligent ${routes.length}-policy model routing engine`, icon: "↗", color: "#4b5bb0" },
    { href: "skills", title: `Skills (${skills.length})`, desc: `${skills.length} pre-built agent skills in the registry`, icon: "⚡", color: "#7a5c8e" },
    { href: "sidecars", title: `Sidecars (${sidecars.length})`, desc: `${sidecars.length} modular background service daemons`, icon: "▤", color: "#1988a2" },
    { href: "languages", title: `Languages (${languages.length})`, desc: `${languages.length} human languages with RTL support`, icon: "🌐", color: "#3a6fc4" },
    { href: "themes", title: `Themes (${themes.length})`, desc: `${themes.length} hand-crafted visual themes`, icon: "◐", color: "#a855f7" },
    { href: "permissions", title: "Permissions", desc: "3 permission profiles: read-only, safe-automation, research", icon: "🔒", color: "#e05c2b" },
    { href: "architecture", title: "Architecture", desc: "Tauri 2 + React 19 + Rust multi-process architecture", icon: "◈", color: "#645d4e" },
    { href: "cli", title: "CLI", desc: "Command-line bridge client for remote control", icon: "⌘", color: "#1a7f64" },
    { href: "mcp", title: "MCP", desc: "Model Context Protocol for third-party tool integration", icon: "⇌", color: "#c2683f" },
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

  return wrapPage("Documentation Hub", hero + `<section class="section">${statsBar}<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">${cards}</div></section>`, "docs");
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
    <p>Unlike cloud-only tools, Aura Work keeps your data on your machine. It uses a plugin architecture with sandboxed execution, encrypted credential storage, and granular permission controls.</p>
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
      <h3>Desktop App</h3>
      <p>Tauri 2 shell hosting the React 19 frontend. Manages windows, system tray, native menus, and IPC with sidecar processes.</p>
    </div>
    <div class="detail-card">
      <h3>Sidecar Services</h3>
      <p>8 independent Node.js daemons for agent execution, browser automation, VM sandboxing, cloud sync, computer-use, and more.</p>
    </div>
    <div class="detail-card">
      <h3>Agent Engine</h3>
      <p>Multi-agent orchestration with planner, executor, reviewer, and safety roles. Supports custom tools and MCP servers.</p>
    </div>
    <div class="detail-card">
      <h3>Routing Engine</h3>
      <p>Smart model router across 10 providers with 5 routing policies: quality-first, cost-first, privacy-first, local-only, or manual.</p>
    </div>
  </section>`;
  return wrapPage("Overview", body);
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
      <h3>🔑 Credential security</h3>
      <p>API keys are encrypted using the device-bound vault before storage. The vault supports biometric unlock on supported platforms. Credentials are never logged or exposed to the agent.</p>
    </div>
    <div class="detail-card">
      <h3>📊 Usage tracking</h3>
      <p>Every task records input/output token counts and estimated cost per model. The audit log maintains a permanent record of all provider interactions for accountability.</p>
    </div>
  </section>`;
  return wrapPage("Providers", body);
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
    <p>The routing engine evaluates each task based on its type (coding, research, document, data, browser, review, security, general), sensitivity level, required capabilities (vision, tool-calling, reasoning), and your configured routing policy to select the optimal model.</p>
    ${policies.map((p, i) => `<div class="detail-card fade-in delay-${(i % 5) + 1}">
      <h3>${p.title}</h3>
      <div class="meta"><span>${p.subtitle}</span></div>
      <p>${p.desc}</p>
    </div>`).join("\n")}
  </section>
  <section class="section">
    <div class="section-label">How it works</div>
    <h2>Routing decision flow</h2>
    <p>When a task is created, the routing engine:</p>
    <ul style="padding-left:1.25rem;margin-bottom:1.5rem;line-height:2">
      <li><strong>1.</strong> Analyzes the task type and required capabilities</li>
      <li><strong>2.</strong> Checks sensitivity level (normal / sensitive / secret-risk)</li>
      <li><strong>3.</strong> Applies your configured routing policy</li>
      <li><strong>4.</strong> Selects the best provider + model combination</li>
      <li><strong>5.</strong> Returns a routing decision with cost estimate</li>
    </ul>
    <p>Each routing decision includes an estimated cost class (low / medium / high / unknown) and may require user approval for high-cost or sensitive operations.</p>
  </section>`;
  return wrapPage("Routing", body);
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
    <p>Skills are versioned JSON-manifest agent capabilities published to the registry at <code>registry/skills/</code>. Each skill defines its identity, publisher, authentication requirements, permissions, tools, and install instructions.</p>
    <div class="section-label">All Skills</div>
    ${skills.map((s, i) => `<div class="detail-card fade-in delay-${(i % 4) + 1}">
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
  return wrapPage("Skills", body);
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
    <p>Sidecars are independent Node.js daemon processes managed by the Tauri shell. Each sidecar runs in its own process space with its own lifecycle, communicating via IPC or HTTP. They provide sandboxed, isolated capabilities that the agent orchestrator can invoke.</p>
    ${sidecars.map((s, i) => `<div class="detail-card fade-in delay-${(i % 4) + 1}">
      <h3>${s.name}</h3>
      <div class="meta"><span>${s.path}</span><span>${s.lang}</span></div>
      <p>${s.desc}</p>
    </div>`).join("\n")}
  </section>
  <section class="section">
    <div class="section-label">Security Model</div>
    <h2>Sidecar authentication</h2>
    <p>All sidecars use a shared authentication system (<code>sidecar-auth.ts</code>) with token-based authorization. Each inter-process request is validated against a runtime-loaded sidecar token. Failed authentications are rejected with <code>401 Unauthorized</code>.</p>
  </section>`;
  return wrapPage("Sidecars", body);
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
    <p>Aura Work is built for a global audience. The i18n system uses TypeScript source catalogs that emit Weblate-compatible JSON files. Adding a new language is a single PR away.</p>
    <div class="section-label">Supported Languages</div>
    <div class="lang-grid">${langItems}</div>
  </section>
  <section class="section">
    <div class="section-label">Architecture</div>
    <h2>How i18n works</h2>
    <p>Translation source files live in <code>packages/i18n/src/catalog.ts</code> as a typed TypeScript object. Running <code>npm run build:locales</code> emits JSON files to <code>packages/i18n/locales/</code>. The system automatically detects the system language on first launch and falls back to English.</p>
    <div class="detail-card">
      <h3>🌐 Adding a new language</h3>
      <p>Add your locale to <code>SUPPORTED_LOCALES</code> in <code>packages/i18n/src/catalog.ts</code>, translate the strings, run the build script, and submit a PR. The project uses Weblate for community translations.</p>
    </div>
    <div class="detail-card">
      <h3>📐 RTL support</h3>
      <p>Arabic and Persian use <code>dir="rtl"</code> layout. The design system includes IBM Plex Sans Arabic and Tajawal fonts for proper Arabic typography with built-in font substitution.</p>
    </div>
  </section>`;
  return wrapPage("Languages", body);
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
    <p>Every theme uses flat, solid colors with no gradients — a design philosophy inspired by warm, calm, coworking spaces. The design tokens are built with CSS custom properties, making themes fully composable.</p>
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
    <p>The design system is defined in <code>packages/ui/src/tokens.css</code> with a layered architecture: primitives → semantic tokens → component tokens. All themes share the same primitive color ramps and override only semantic tokens.</p>
    <div class="detail-card">
      <h3>🎨 Color primitives</h3>
      <p>A warm, clay-based palette with sand neutrals, a single terracotta accent, and semantic greens/ambers/reds. The accent shifts between light and dark modes while maintaining the same warm character.</p>
    </div>
    <div class="detail-card">
      <h3>📱 RTL & a11y ready</h3>
      <p>The system includes a high-contrast theme for accessibility, full RTL support for Arabic/Persian, and system-preference auto-detection via <code>prefers-color-scheme</code>.</p>
    </div>
  </section>`;
  return wrapPage("Themes", body);
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
    <p>Aura Work uses a three-tier permission system. Every action is categorized (file, shell, browser, network) and checked against the active permission profile. Users can override per-action with "always allow" or "always ask".</p>
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
    <div class="section-label">Audit Trail</div>
    <h2>Every action is logged</h2>
    <p>All permission requests, grants, and denials are recorded in the audit log (<code>AuditEntry</code>) with actor, category, action, target, risk level, decision, and result. Users can review their full permission history at any time.</p>
    <div class="detail-card">
      <h3>🔐 Encrypted vault</h3>
      <p>Secrets, API keys, and session tokens are stored in a device-bound encrypted vault (<code>VaultStatus</code>) with biometric unlock support. The vault supports versioned secrets and secure deletion.</p>
    </div>
  </section>`;
  return wrapPage("Permissions", body);
}

// ─── Architecture Page ───────────────────────────────────────────────────────────

function generateArchitecture() {
  const body = `<div class="hero">
    <h1><span>Architecture</span></h1>
    <p class="subtitle">Tauri 2 + React 19 + Rust — a modern, multi-process desktop platform.</p>
  </div>
  <section class="section">
    <h2>System architecture</h2>
    <p>Aura Work is built on a <strong>multi-process architecture</strong> where the Tauri 2 shell hosts a React 19 frontend and manages 8 independent sidecar processes, each sandboxed and authenticated.</p>
    
    <div class="detail-card">
      <h3>🖥️ Desktop shell (Tauri 2 + Rust)</h3>
      <p>Window management, system tray, native menus, IPC bridge to sidecars, filesystem access, and process lifecycle. The Rust backend handles performance-critical operations and system integration.</p>
    </div>
    <div class="detail-card">
      <h3>🎨 Frontend (React 19 + TypeScript)</h3>
      <p>UI layer with task management, file browser, Git integration, provider configuration, plugin marketplace, browser automation UI, computer-use controls, memory viewer, audit log, and settings.</p>
    </div>
    <div class="detail-card">
      <h3>⚙️ Agent engine (TypeScript)</h3>
      <p>Multi-agent orchestration with specialized roles: planner decomposes tasks, executor runs steps, reviewer validates output, safety enforces boundaries. Supports custom tools and MCP servers.</p>
    </div>
    <div class="detail-card">
      <h3>🔗 Bridge server (TypeScript)</h3>
      <p>HTTP API for pairing external clients — CLI, browser extensions, Office add-ins. Enables remote task creation, status polling, and cross-device workflows.</p>
    </div>
  </section>
  <section class="section">
    <div class="section-label">Data Flow</div>
    <h2>How data moves</h2>
    <p>User input → React UI → Tauri IPC → Agent Orchestrator → Router → Provider Adapter → LLM API. File operations go through the permission gate before reaching the filesystem. All interactions are logged to the audit trail.</p>
  </section>
  <section class="section">
    <div class="section-label">Tech Stack</div>
    <table>
      <thead><tr><th>Layer</th><th>Technology</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>Desktop Shell</td><td>Tauri 2</td><td>Native window, menus, system tray</td></tr>
        <tr><td>Core Backend</td><td>Rust</td><td>Performance-critical operations</td></tr>
        <tr><td>Frontend</td><td>React 19 + Vite 8</td><td>UI rendering</td></tr>
        <tr><td>Sidecars</td><td>Node.js / TypeScript</td><td>Background daemon services</td></tr>
        <tr><td>Agent Engine</td><td>TypeScript</td><td>Multi-agent orchestration</td></tr>
        <tr><td>Persistence</td><td>SQLite</td><td>Local data storage</td></tr>
        <tr><td>Encryption</td><td>Device-bound vault</td><td>Credential security</td></tr>
        <tr><td>Build System</td><td>npm workspaces + esbuild</td><td>Monorepo tooling</td></tr>
      </tbody>
    </table>
  </section>`;
  return wrapPage("Architecture", body);
}

// ─── CLI Page ────────────────────────────────────────────────────────────────────

function generateCLI() {
  const body = `<div class="hero">
    <h1><span>CLI</span></h1>
    <p class="subtitle">Command-line bridge client for remote control of the Aura desktop app.</p>
  </div>
  <section class="section">
    <p>The <code>aura</code> CLI tool pairs with the Aura Work desktop app via the Bridge sidecar. It allows creating tasks, checking status, and managing projects — all from the terminal.</p>
    <div class="detail-card">
      <h3>Commands</h3>
      <table>
        <thead><tr><th>Command</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>aura status</code></td><td>Check bridge health and connection status</td></tr>
          <tr><td><code>aura pair --code &lt;code&gt;</code></td><td>Pair CLI with desktop app</td></tr>
          <tr><td><code>aura projects</code></td><td>List all projects</td></tr>
          <tr><td><code>aura task create --project &lt;id&gt; --prompt "..."</code></td><td>Create and start a task</td></tr>
          <tr><td><code>aura task get &lt;id&gt;</code></td><td>Get task details and status</td></tr>
          <tr><td><code>aura task logs &lt;id&gt;</code></td><td>Stream task execution logs</td></tr>
          <tr><td><code>aura open task &lt;id&gt;</code></td><td>Open task in desktop UI</td></tr>
        </tbody>
      </table>
    </div>
    <div class="detail-card">
      <h3>🔐 Pairing flow</h3>
      <p>1. In the desktop app, go to Extensions → Pair New Device<br>
      2. Run <code>aura pair --code &lt;code&gt;</code><br>
      3. The CLI saves a session token to <code>~/.aura/config.json</code><br>
      4. All subsequent commands use this token for authentication</p>
    </div>
    <div class="detail-card">
      <h3>Security model</h3>
      <p>The CLI connects through the local Bridge sidecar (port 47826). All requests must carry a valid session token. The CLI cannot bypass any permission — it respects the same permission profiles as the desktop UI.</p>
    </div>
  </section>`;
  return wrapPage("CLI", body);
}

// ─── MCP Page ───────────────────────────────────────────────────────────────────

function generateMCP() {
  const body = `<div class="hero">
    <h1><span>MCP</span></h1>
    <p class="subtitle">Model Context Protocol — extend agent capabilities with third-party tools.</p>
  </div>
  <section class="section">
    <p>MCP (Model Context Protocol) is an open standard for connecting AI agents with external tools and data sources. Aura Work supports MCP servers as a first-class extension mechanism alongside built-in skills and plugins.</p>
    <div class="detail-card">
      <h3>How MCP works</h3>
      <p>MCP servers are managed by the <strong>Plugins Helper</strong> sidecar. Each server defines tools, resources, and prompts that the agent can discover and invoke. Servers communicate over stdio or SSE transport.</p>
    </div>
    <div class="detail-card">
      <h3>Supported transports</h3>
      <ul>
        <li><strong>stdio</strong> — subprocess-based, ideal for local tools</li>
        <li><strong>SSE</strong> — HTTP-based, for remote or containerized servers</li>
      </ul>
    </div>
    <div class="detail-card">
      <h3>Installing MCP servers</h3>
      <p>From the Plugins panel in the desktop app, search the marketplace or add a custom MCP server by providing its command and arguments. The Plugins Helper handles discovery, lifecycle, and capability registration.</p>
    </div>
    <div class="detail-card">
      <h3>📦 Marketplace</h3>
      <p>The <code>MarketplaceEntry</code> system supports skills, MCP servers, and plugins with versioning, publisher verification, risk assessment, and localized descriptions.</p>
    </div>
  </section>`;
  return wrapPage("MCP", body);
}

// ─── Quick Start Page ───────────────────────────────────────────────────────────

function generateQuickStart() {
  const body = `<div class="hero">
    <h1><span>Quick Start</span></h1>
    <p class="subtitle">From zero to running your first AI agent task.</p>
  </div>
  <section class="section">
    <div class="detail-card">
      <h3>1. Install</h3>
      <p>Download the latest release from <a href="https://github.com/hbx12/aura-work/releases/latest">GitHub Releases</a>. Installers are available for Windows, macOS, and Linux.</p>
    </div>
    <div class="detail-card">
      <h3>2. Launch</h3>
      <p>Open Aura Work. The app starts with a default project and the Agent panel ready. You'll see the chat interface where you can type your first task.</p>
    </div>
    <div class="detail-card">
      <h3>3. Configure a provider</h3>
      <p>Go to <strong>Settings → Providers</strong>. Add an API key for any provider (OpenAI, Anthropic, etc.) or start Ollama locally for free. Each provider is validated automatically.</p>
    </div>
    <div class="detail-card">
      <h3>4. Run your first task</h3>
      <p>Type a prompt like: <code>"Create a new React component that fetches data from an API"</code>. The agent plans the task, executes it step by step, and shows you the results.</p>
    </div>
    <div class="detail-card">
      <h3>5. Explore</h3>
      <p>Try skills from the registry, install MCP servers, configure routing policies, set up scheduled tasks, or pair the CLI for terminal-based control.</p>
    </div>
  </section>
  <section class="section">
    <div class="section-label">Next Steps</div>
    <h2>Going deeper</h2>
    <p>Read about <a href="providers">Providers</a>, <a href="routing">Routing</a>, <a href="skills">Skills</a>, or <a href="architecture">Architecture</a>. For contributors, see the <a href="https://github.com/hbx12/aura-work/blob/main/CONTRIBUTING.md">Contributing Guide</a> and <a href="https://github.com/hbx12/aura-work/blob/main/docs/new-contributor.md">New Contributor Guide</a>.</p>
  </section>`;
  return wrapPage("Quick Start", body);
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
<html lang="en"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=https://hbx12.github.io/aura-work/docs/docs.html"><title>Redirect</title></head><body><a href="https://hbx12.github.io/aura-work/docs/docs.html">Docs</a></body></html>`;
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
