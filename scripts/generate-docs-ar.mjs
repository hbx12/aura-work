#!/usr/bin/env node
/**
 * Aura Work — Docs Generator (Arabic)
 * Generates Arabic versions of all documentation pages.
 * Run: node scripts/generate-docs-ar.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DOCS_DIR = join(ROOT, "docs");
const DOCS_PAGES_DIR = join(DOCS_DIR, "docs");

// ─── Translation Map (EN → AR) ─────────────────────────────────────────────────

const TRANSLATIONS = {
  // Navigation & shared
  "Documentation Hub": "مركز الوثائق",
  "Back to Docs Hub": "العودة إلى مركز الوثائق",
  Home: "الرئيسية",
  Docs: "الوثائق",
  GitHub: "غيت هاب",
  Documentation: "الوثائق",
  Version: "الإصدار",
  Providers: "المزوّدون",
  Skills: "المهارات",
  Sidecars: "الخدمات المساعدة",
  Languages: "اللغات",
  Themes: "الثيمات",
  Overview: "نظرة عامة",
  "Quick Start": "بداية سريعة",
  Routing: "التوجيه",
  Permissions: "الأذونات",
  Architecture: "الهندسة",
  CLI: "واجهة الأوامر",
  MCP: "بروتوكول السياق",
  "Aura Work Docs": "وثائق Aura Work",
  "Everything you need to understand, extend, and contribute to Aura Work — the open-source multi-provider desktop AI agent platform.": "كل ما تحتاجه لفهم وتوسيع والمساهمة في Aura Work — منصة وكلاء الذكاء الاصطناعي المكتبية مفتوحة المصدر متعددة المزوّدين.",
  "What is Aura Work and why it exists": "ما هي Aura Work ولماذا وُجدت",
  "Install, configure, run your first task": "التثبيت والإعداد وتشغيل أول مهمة",
  "AI model providers with auto-discovery": "مزوّدو نماذج الذكاء الاصطناعي مع الاكتشاف التلقائي",
  "Intelligent 5-policy model routing engine": "محرك توجيه ذكي بـ 5 سياسات",
  "pre-built agent skills in the registry": "مهارات وكلاء جاهزة في السجل",
  "modular background service daemons": "خدمات خلفية معيارية",
  "human languages with RTL support": "لغة بشرية مع دعم الكتابة من اليمين",
  "hand-crafted visual themes": "ثيمات بصرية مصممة يدوياً",
  "3 permission profiles: read-only, safe-automation, research": "3 مستويات أذونات: قراءة فقط، أتمتة آمنة، بحث",
  "Tauri 2 + React 19 + Rust multi-process architecture": "هندسة Tauri 2 + React 19 + Rust متعددة العمليات",
  "Command-line bridge client for remote control": "عميل واجهة أوامر للتحكم عن بعد",
  "Model Context Protocol for third-party tool integration": "بروتوكول سياق النماذج لدمج أدوات الطرف الثالث",

  // Overview
  "Key Facts": "حقائق أساسية",
  "Architecture at a glance": "لمحة عن الهندسة",
  "Current version": "الإصدار الحالي",
  "Desktop framework": "إطار سطح المكتب",
  "UI framework": "إطار الواجهة",
  "Core backend": "الخلفية الأساسية",
  "Desktop App": "تطبيق سطح المكتب",
  "Tauri 2 shell hosting the React 19 frontend. Manages windows, system tray, native menus, and IPC with sidecar processes.": "غلاف Tauri 2 يستضيف واجهة React 19. يدير النوافذ وعلبة النظام والقوائم والتواصل مع الخدمات المساعدة.",
  "Sidecar Services": "الخدمات المساعدة",
  "8 independent Node.js daemons for agent execution, browser automation, VM sandboxing, cloud sync, computer-use, and more.": "8 خدمات خلفية لتنفيذ الوكلاء وأتمتة المتصفح والعزل الافتراضي والمزامنة السحابية والمزيد.",
  "Agent Engine": "محرك الوكيل",
  "Multi-agent orchestration with planner, executor, reviewer, and safety roles. Supports custom tools and MCP servers.": "تنسيق متعدد الوكلاء مع أدوار المخطط والمنفذ والمراجع والأمان. يدعم أدوات مخصصة وخوادم MCP.",
  "Routing Engine": "محرك التوجيه",
  "Smart model router across 10 providers with 5 routing policies: quality-first, cost-first, privacy-first, local-only, or manual.": "موجه نماذج ذكي عبر 10 مزوّدين مع 5 سياسات توجيه: الجودة أولاً، التكلفة أولاً، الخصوصية أولاً، محلي فقط، أو يدوي.",

  // Quick Start
  Installation: "التثبيت",
  Prerequisites: "المتطلبات الأساسية",
  Steps: "الخطوات",
  "Configure a provider": "إعداد مزوّد",
  "Go to Settings → Providers. Add an API key for any provider (OpenAI, Anthropic, etc.) or start Ollama locally for free. Each provider is validated automatically.": "اذهب إلى الإعدادات → المزوّدون. أضف مفتاح API لأي مزوّد أو ابدأ Ollama محلياً مجاناً. يتم التحقق من كل مزوّد تلقائياً.",
  "Run your first task": "تشغيل أول مهمة",
  'Type a prompt like: "Create a new React component that fetches data from an API". The agent plans the task, executes it step by step, and shows you the results.': 'اكتب أمراً مثل: "أنشئ مكون React جديد يجلب البيانات من API". يخطط الوكيل وينفذ ويعرض النتائج.',
  Explore: "استكشف",
  "Try skills from the registry, install MCP servers, configure routing policies, set up scheduled tasks, or pair the CLI for terminal-based control.": "جرّب المهارات من السجل، ثبّت خوادم MCP، اضبط سياسات التوجيه، أو استخدم CLI للتحكم من الطرفية.",
  "Next Steps": "الخطوات التالية",
  "Going deeper": "التعمق أكثر",
  "Download from GitHub Releases": "تنزيل من إصدارات GitHub",
  "Extract and run Aura Work": "فك الضغط وشغّل Aura Work",
  "Browse skills, configure providers, set up MCP": "تصفح المهارات، اضبط المزوّدين، هيّئ MCP",

  // Providers
  "Connect to 10 different AI providers — cloud-hosted models or fully local.": "اتصل بـ 10 مزوّدي ذكاء اصطناعي — نماذج سحابية أو محلية بالكامل.",
  "Total Providers": "إجمالي المزوّدين",
  "Cloud Providers": "المزوّدون السحابيون",
  "Local Providers": "المزوّدون المحليون",
  "Aura Work supports 10 AI providers covering both cloud-hosted and local (Ollama, LM Studio, Custom Endpoint) models. Each provider has its own adapter that handles authentication, model discovery, and chat completions. Providers marked as local never send data off your machine.": "يدعم Aura Work 10 مزوّدي ذكاء اصطناعي تشمل النماذج السحابية والمحلية. كل مزوّد له محول خاص يدير المصادقة واكتشاف النماذج. المزوّدون المحليون لا يرسلون بيانات خارج جهازك أبداً.",
  "Aura Cloud Models": "نماذج Aura السحابية",
  "Hosted models via aura.work API. Includes Aura Fast (text+tools), Aura Coder (reasoning), and Aura Premium (vision+reasoning). Requires Aura Cloud sign-in.": "نماذج مستضافة عبر API Aura. تشمل Aura Fast و Aura Coder و Aura Premium.",
  Anthropic: "Anthropic",
  "Claude Sonnet 4 and Claude 3.5 Haiku. Best-in-class reasoning, code generation, and vision capabilities. API key required.": "Claude Sonnet 4 و Claude 3.5 Haiku. قدرات استدلال وتوليد كود ورؤية من الطراز الأول.",
  OpenAI: "OpenAI",
  "GPT-4o and GPT-4o mini. Industry-standard language models with broad tool-calling support. Also supports GitHub Copilot Codex accounts.": "GPT-4o و GPT-4o mini. نماذج لغوية معيارية مع دعم واسع لاستدعاء الأدوات.",
  "Google Gemini": "Google Gemini",
  "Gemini 2.0 Flash and Gemini 2.5 Pro. Strong reasoning with massive context windows. API key required.": "Gemini 2.0 Flash و Gemini 2.5 Pro. استدلال قوي مع نوافذ سياق ضخمة.",
  DeepSeek: "DeepSeek",
  "DeepSeek V3 and DeepSeek R1. Cost-effective models with competitive reasoning. API key required.": "DeepSeek V3 و R1. نماذج فعالة من حيث التكلفة مع استدلال تنافسي.",
  Ollama: "Ollama",
  "Fully local. Run any model from the Ollama library. No API key needed, no data leaves your machine. Auto-discovers running models.": "محلي بالكامل. شغّل أي نموذج من مكتبة Ollama. لا حاجة لمفتاح API ولا تغادر بياناتك جهازك.",
  "OpenAI Compatible": "متوافق مع OpenAI",
  "Custom endpoints that mimic the OpenAI API. Use with any OpenAI-compatible service (vLLM, Together, etc.).": "نقاط نهاية مخصصة تحاكي واجهة OpenAI. استخدم مع أي خدمة متوافقة.",
  Minimax: "Minimax",
  "Minimax models (MiniMax-Text-01). API key required.": "نماذج Minimax. مفتاح API مطلوب.",
  Qwen: "Qwen",
  "Qwen models (Qwen-Plus, Qwen-Turbo). API key required.": "نماذج Qwen (Plus و Turbo). مفتاح API مطلوب.",
  "LM Studio": "LM Studio",
  "Fully local. Connect to LM Studio's local inference server. No API key needed. Auto-discovers running models.": "محلي بالكامل. اتصل بخادم LM Studio المحلي. لا حاجة لمفتاح API.",
  "Cloud": "سحابي",
  "Local": "محلي",

  // Routing
  "How Aura Work picks the right model for every task": "كيف يختار Aura Work النموذج المناسب لكل مهمة",
  "Routing Policies": "سياسات التوجيه",
  "Quality First": "الجودة أولاً",
  "Prioritizes the most capable model for each task regardless of cost. Uses premium models for complex work, budget models for simple tasks.": "يعطي الأولوية للنموذج الأكثر قدرة لكل مهمة بغض النظر عن التكلفة.",
  "Cost First": "التكلفة أولاً",
  "Optimizes for minimum cost while meeting capability requirements. Prefers cheaper models when they can handle the task.": "يحسّن التكلفة مع تلبية متطلبات القدرات. يفضّل النماذج الأرخص عندما تفي بالغرض.",
  "Privacy First": "الخصوصية أولاً",
  "Routes only to local providers (Ollama, LM Studio). Never sends data to cloud services. Falls back if no local models are available.": "يوجّه فقط إلى المزوّدين المحليين. لا يرسل بيانات أبداً إلى الخدمات السحابية.",
  "Local Only": "محلي فقط",
  "Strictly local execution. Fails if no local provider is configured. Ideal for air-gapped environments.": "تنفيذ محلي بحت. يفشل إذا لم يكن هناك مزوّد محلي. مثالي للبيئات المعزولة.",
  Manual: "يدوي",
  "User picks the provider and model explicitly for each session. No automatic routing.": "يختار المستخدم المزوّد والنموذج يدوياً لكل جلسة. لا توجيه تلقائي.",

  // Skills
  "pre-built agent skills from the registry": "مهارات وكيل جاهزة من السجل",
  "Total Skills": "إجمالي المهارات",
  "Categories": "التصنيفات",
  Tools: "الأدوات",
  "Risk Level": "مستوى المخاطرة",
  "Agent skills are reusable capabilities registered as JSON definitions in the registry/skills/ directory. Each skill declares its tools, risk level, and allowed categories. Skills can be invoked by the agent at runtime and are sandboxed by the permission system.": "مهارات الوكيل هي قدرات قابلة لإعادة الاستخدام مسجلة كتعريفات JSON في registry/skills/. كل مهارة تعلن أدواتها ومستوى المخاطرة. يمكن للوكيل استدعاء المهارات وتكون معزولة بنظام الأذونات.",
  low: "منخفض",
  medium: "متوسط",
  high: "عالي",
  "How skills work": "كيف تعمل المهارات",

  // Sidecars
  "modular background services that extend the agent platform": "خدمات خلفية معيارية توسّع منصة الوكيل",
  "Total Sidecars": "إجمالي الخدمات المساعدة",
  "Aura Work runs 8 sidecar processes — independent Node.js daemons that provide specialized services to the agent engine. Each sidecar runs in its own process and communicates via IPC.": "يدير Aura Work 8 خدمات مساعدة — خدمات Node.js خلفية مستقلة تقدم خدمات متخصصة لمحرك الوكيل. كل خدمة تعمل في عمليتها الخاصة وتتواصل عبر IPC.",
  "Agent": "الوكيل",
  "Core agent execution engine": "محرك تنفيذ الوكيل الأساسي",
  "Bridge": "الجسر",
  "Communication bridge between processes": "جسر تواصل بين العمليات",
  "Browser Helper": "مساعد المتصفح",
  "Browser automation and web scraping": "أتمتة المتصفح واستخراج بيانات الويب",
  "Cloud Sync": "المزامنة السحابية",
  "Sync state and configuration across devices": "مزامنة الحالة والإعدادات عبر الأجهزة",
  "Computer Use": "استخدام الحاسوب",
  "Desktop automation (mouse, keyboard, files)": "أتمتة سطح المكتب (فأرة، لوحة مفاتيح، ملفات)",
  "VM Helper": "مساعد الآلة الافتراضية",
  "Sandboxed code execution in isolated VMs": "تنفيذ كود معزول في آلات افتراضية",
  "Plugins Helper": "مساعد الإضافات",
  "Dynamic plugin loading and management": "تحميل وإدارة الإضافات الديناميكية",
  "Prompt System": "نظام الأوامر",
  "System prompt management and templating": "إدارة أوامر النظام والقوالب",

  // Languages
  "human languages with full RTL support for Arabic and Persian.": "لغة بشرية مع دعم كامل للغة العربية والفارسية.",
  "RTL Languages": "لغات من اليمين لليسار",
  "Aura Work is built for a global audience. The i18n system uses TypeScript source catalogs that emit Weblate-compatible JSON files. Adding a new language is a single PR away.": "Aura Work مبني لجمهور عالمي. نظام التدويل يستخدم فهارس TypeScript مصدرية تُنتج ملفات JSON متوافقة مع Weblate. إضافة لغة جديدة على بعد PR واحد.",
  "Supported Languages": "اللغات المدعومة",
  "How i18n works": "كيف يعمل التدويل",
  "Aura Work uses a TypeScript-first i18n approach. Translation catalogs live in packages/i18n/src/catalog.ts and define locale IDs, native names, RTL flags, and date/number formats. The build pipeline exports JSON files consumed by the UI.": "يستخدم Aura Work نهج تدويل TypeScript أولاً. فهارس الترجمة موجودة في packages/i18n/src/catalog.ts وتعرّف رموز اللغات والأسماء المحلية وعلامات RTL وتنسيقات التواريخ والأرقام.",
  "Adding a language": "إضافة لغة جديدة",
  "Add your locale to the catalog with its native name and RTL flag. Create a translation JSON file in packages/i18n/locales/. Submit a pull request — that's it.": "أضف لغتك إلى الفهرس مع اسمها المحلي وعلامة RTL. أنشئ ملف JSON للترجمة في locales/. قدّم PR — هذا كل شيء.",
  "Add your locale ID to SUPPORTED_LOCALES": "أضف رمز لغتك إلى SUPPORTED_LOCALES",
  "Create a JSON translation file": "أنشئ ملف ترجمة JSON",
  "Optionally set RTL if your script is right-to-left": "فعّل RTL إذا كانت لغتك تكتب من اليمين لليسار",
  "Submit a pull request": "قدّم طلب سحب (PR)",
  "RTL": "من اليمين",

  // Themes
  "hand-crafted visual themes with light, dark, amoled variants": "ثيمات بصرية مصممة يدوياً مع أنواع فاتحة وداكنة وأموليد",
  "Total Themes": "إجمالي الثيمات",
  "Theme Categories": "تصنيفات الثيمات",
  "Light themes": "ثيمات فاتحة",
  "Dark themes": "ثيمات داكنة",
  "Special themes": "ثيمات خاصة",
  "How themes work": "كيف تعمل الثيمات",
  "Aura Work uses a layered token architecture: design tokens cascade from primitives → semantic → component levels. This enables consistent theming across all UI components.": "يستخدم Aura Work هندسة رموز متعددة المستويات: رموز التصميم تنتقل من المستوى الأساسي → الدلالي → مستوى المكونات. هذا يتيح ثمت متناسق عبر جميع مكونات الواجهة.",
  "Token Architecture": "هندسة الرموز",
  "Primitive tokens": "رموز أساسية",
  "Define raw colors, spacing, typography": "تحديد الألوان الأساسية والمسافات والطباعة",
  "Semantic tokens": "رموز دلالية",
  "Map primitives to semantic roles (bg, text, border, accent)": "ربط الأساسيات بالأدوار الدلالية (خلفية، نص، حد، تمييز)",
  "Component tokens": "رموز المكونات",
  "Fine-grained overrides per component (button, card, input)": "تجاوزات دقيقة لكل مكون (زر، بطاقة، إدخال)",
  "Theme Switching": "تبديل الثيمات",
  "Themes are applied dynamically via CSS custom properties. Switching between light, dark, amoled, or any of the 35+ themes is instantaneous — no page reload needed.": "تُطبق الثيمات ديناميكياً عبر خصائص CSS المخصصة. التبديل بين الثيمات فوري — لا حاجة لإعادة تحميل الصفحة.",

  // Permissions
  "permission profiles controlling what agents can do": "مستويات أذونات تتحكم في ما يمكن للوكلاء فعله",
  "Aura Work uses a tiered permission system with 3 built-in profiles. Each profile grants progressively more access to system resources and tools.": "يستخدم Aura Work نظام أذونات متدرج مع 3 مستويات مدمجة. كل مستوى يمنح وصولاً متزايداً لموارد النظام والأدوات.",
  "Permission Profiles": "مستويات الأذونات",
  "Read-Only": "قراءة فقط",
  "Read files, search code, browse the web. No modifications to the file system, no code execution, no network calls to external services.": "قراءة ملفات، بحث في الكود، تصفح الويب. لا تعديلات على نظام الملفات ولا تنفيذ كود.",
  "Safe Automation": "أتمتة آمنة",
  "Read and write files, execute approved commands, access network. Sandboxed execution with resource limits and audit logging.": "قراءة وكتابة ملفات، تنفيذ أوامر مصرح بها، وصول للشبكة. تنفيذ معزول مع حدود موارد وتسجيل تدقيق.",
  "Research": "بحث",
  "Full system access including file system, network, code execution, browser automation, and system commands. All actions are logged and reversible.": "وصول كامل للنظام يشمل نظام الملفات والشبكة وتنفيذ الكود وأتمتة المتصفح. كل الإجراءات مسجلة وقابلة للتراجع.",
  "Creating a custom profile": "إنشاء مستوى مخصص",
  "Define custom profiles in your settings.json by combining individual permissions. Each permission grants access to a specific capability (files.read, files.write, network.http, etc.).": "حدد مستويات مخصصة في settings.json بدمج أذونات فردية. كل إذن يمنح وصولاً لقدرة محددة.",

  // CLI
  "The command-line interface for remote agent control, scriptable workflows, and CI/CD integration.": "واجهة الأوامر للتحكم عن بعد في الوكيل وسير العمل القابلة للبرمجة والتكامل مع CI/CD.",
  "CLI Features": "ميزات واجهة الأوامر",
  "Remote agent control from terminal": "تحكم عن بعد في الوكيل من الطرفية",
  "Scriptable workflows for automation": "سير عمل قابل للبرمجة للأتمتة",
  "CI/CD pipeline integration": "التكامل مع خطوط CI/CD",
  "Multiple session management": "إدارة جلسات متعددة",
  "JSON output for tooling": "إخراج JSON للأدوات",
  "How the CLI works": "كيف تعمل واجهة الأوامر",
  "The CLI client connects to a running Aura Work instance over a local socket. It authenticates using the same credential store as the desktop app and supports all the same skills, providers, and routing policies.": "يتصل عميل CLI بنسخة Aura Work عاملة عبر socket محلي. يستخدم نفس مخزن بيانات الاعتماد ويدعم كل المهارات والمزوّدين.",

  // MCP
  "The Model Context Protocol integration for connecting third-party tools and services.": "تكامل بروتوكول سياق النماذج لربط أدوات وخدمات الطرف الثالث.",
  "MCP Features": "ميزات MCP",
  "Third-party tool integration": "دمج أدوات الطرف الثالث",
  "Standardized protocol for tool discovery": "بروتوكول موحد لاكتشاف الأدوات",
  "Dynamic tool registration at runtime": "تسجيل أدوات ديناميكي أثناء التشغيل",
  "Sandboxed execution with permission gating": "تنفيذ معزول مع التحكم بالأذونات",
  "Community MCP server marketplace": "سوق خوادم MCP المجتمعية",
  "How MCP works": "كيف يعمل MCP",
  "Aura Work implements the Model Context Protocol (MCP) specification. MCP servers register tools that the agent can discover and invoke at runtime. Each tool is sandboxed by the permission system and can be added dynamically without restarting the agent.": "يطبق Aura Work مواصفات MCP. خوادم MCP تسجل أدوات يمكن للوكيل اكتشافها واستدعائها أثناء التشغيل. كل أداة معزولة بنظام الأذونات ويمكن إضافتها ديناميكياً.",

  // Architecture
  "Deep dive into the multi-process architecture": "غوص في الهندسة متعددة العمليات",
  "Aura Work is built on a multi-process architecture using Tauri 2 as the desktop shell, React 19 for the UI, and Rust for core services. Sidecar processes run independently and communicate via IPC.": "Aura Work مبني على هندسة متعددة العمليات باستخدام Tauri 2 كغلاف سطح المكتب و React 19 للواجهة و Rust للخدمات الأساسية.",
  "Tech Stack": "مجموعة التقنيات",
  "Tauri 2": "Tauri 2",
  "Desktop shell with native OS integration": "غلاف سطح المكتب مع تكامل نظام التشغيل",
  "React 19": "React 19",
  "UI framework with streaming SSR support": "إطار واجهة مع دعم SSR للتدفق",
  "Rust": "Rust",
  "Core backend services and security": "خدمات خلفية أساسية وأمان",
  "TypeScript": "TypeScript",
  "Full-stack type safety across the project": "أمان أنواع شامل عبر المشروع",
  "Process Model": "نموذج العمليات",
  "The desktop app spawns sidecar processes on startup. Each sidecar runs as a separate OS process with its own lifecycle. Communication happens over a secure IPC bridge.": "تطبيق سطح المكتب يُنشئ عمليات مساعدة عند بدء التشغيل. كل خدمة تعمل كعملية نظام تشغيل منفصلة. التواصل يتم عبر جسر IPC آمن.",
  "Security Model": "نموذج الأمان",
  "All sidecar processes run with minimal permissions. The credential store uses OS-level encryption (Keytar). Code execution is sandboxed in isolated VMs.": "جميع العمليات المساعدة تعمل بأقل الصلاحيات. مخزن بيانات الاعتماد يستخدم تشفير نظام التشغيل. تنفيذ الكود معزول في آلات افتراضية.",
};

// ─── Arabic Text Helpers ────────────────────────────────────────────────────────

function tr(text) {
  return TRANSLATIONS[text] || text;
}

// ─── CSS (same as English version) ─────────────────────────────────────────────

function getBaseCSS() {
  return `*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{--font-mono:"JetBrains Mono",ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace;--font-sans:"Inter","IBM Plex Sans","Noto Kufi Arabic",system-ui,-apple-system,sans-serif;--font-display:"Outfit","IBM Plex Sans","Noto Kufi Arabic",system-ui,sans-serif;--color-bg:#faf9f5;--color-bg-weak:#f5f3ec;--color-bg-card:#ffffff;--color-bg-strong:#1e1b16;--color-text:#5c5544;--color-text-weak:#938a76;--color-text-strong:#28241d;--color-text-inverted:#faf9f5;--color-border:#e7e1d3;--color-border-weak:rgba(40,36,29,0.08);--color-accent:#c2683f;--color-accent-warm:#cf7a52;--color-accent-subtle:rgba(194,104,63,0.11);--color-plum:#7a5c8e;--color-success:#4f7d47;--color-warning:#a9761f;--color-danger:#b8482f;--shadow-sm:0 1px 2px rgba(54,46,32,0.06);--shadow-md:0 4px 16px rgba(54,46,32,0.09);--shadow-lg:0 16px 40px rgba(54,46,32,0.13);--shadow-xl:0 24px 60px rgba(54,46,32,0.16)}
@media(prefers-color-scheme:dark){:root{--color-bg:#161310;--color-bg-weak:#1e1b16;--color-bg-card:#25221c;--color-bg-strong:#ece7dc;--color-text:#a89e8b;--color-text-weak:#756c5b;--color-text-strong:#ece7dc;--color-text-inverted:#161310;--color-border:#322d25;--color-border-weak:rgba(236,231,220,0.08);--color-accent:#cf7a52;--color-accent-warm:#c2683f;--color-accent-subtle:rgba(207,122,82,0.16);--color-plum:#b794cc;--shadow-sm:0 1px 2px rgba(0,0,0,0.45);--shadow-md:0 4px 14px rgba(0,0,0,0.50);--shadow-lg:0 14px 38px rgba(0,0,0,0.60);--shadow-xl:0 20px 50px rgba(0,0,0,0.65)}}
[dir="rtl"]{text-align:right}
html{scroll-behavior:smooth;scroll-padding-top:5rem}
body{font-family:var(--font-sans);background:var(--color-bg);color:var(--color-text);line-height:1.7;-webkit-font-smoothing:antialiased}
.page{max-width:1200px;margin:0 auto;padding:0 2rem}
@media(max-width:48rem){.page{padding:0 1rem}}
header{position:sticky;top:0;z-index:100;background:rgba(250,249,245,0.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--color-border-weak);padding:0 2rem}
@media(prefers-color-scheme:dark){header{background:rgba(22,19,16,0.88)}}
.header-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:3.5rem}
.logo{display:flex;align-items:center;gap:8px;text-decoration:none;font-family:var(--font-mono);font-weight:600;color:var(--color-text-strong);font-size:1rem}
.logo-mark{display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:var(--color-accent);color:#fff;border-radius:4px;font-size:.875rem;font-weight:700}
header nav ul{display:flex;align-items:center;gap:1.5rem;list-style:none}
header nav a{text-decoration:none;font-size:.8125rem;color:var(--color-text);font-weight:500;transition:color .15s}
header nav a:hover{color:var(--color-text-strong)}
header nav a.active{color:var(--color-accent)}
.hero{padding:5rem 0 3rem;text-align:center}
.hero h1{font-family:var(--font-display);font-size:3.25rem;font-weight:700;color:var(--color-text-strong);letter-spacing:-.03em;line-height:1.1;margin-bottom:1.25rem}
.hero h1 span{background:linear-gradient(135deg,var(--color-accent),var(--color-plum));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero .subtitle{font-size:1.125rem;color:var(--color-text);max-width:32rem;margin:0 auto 2rem;line-height:1.7}
.hero .meta-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;background:var(--color-accent-subtle);border:1px solid var(--color-accent);border-radius:100px;font-family:var(--font-mono);font-size:.75rem;color:var(--color-accent);margin-bottom:1.5rem}
@media(max-width:48rem){.hero h1{font-size:2rem}.hero{padding:3rem 0 2rem}}
.section{padding:4rem 0;border-bottom:1px solid var(--color-border-weak)}
.section:last-child{border-bottom:none}
.section-label{font-family:var(--font-mono);font-size:.6875rem;text-transform:uppercase;letter-spacing:.1em;color:var(--color-text-weak);margin-bottom:.75rem;display:flex;align-items:center;gap:8px}
.section-label::before{content:'';display:inline-block;width:24px;height:1px;background:var(--color-border)}
.section h2{font-family:var(--font-display);font-size:2rem;font-weight:700;color:var(--color-text-strong);letter-spacing:-.02em;margin-bottom:.75rem}
.section h2 .count{font-family:var(--font-mono);font-size:1rem;font-weight:400;color:var(--color-text-weak);letter-spacing:0}
.section>p{max-width:40rem;margin-bottom:2.5rem;font-size:1rem;color:var(--color-text);line-height:1.8}
.section p+p{margin-top:1rem}
.section ul{margin:1rem 0 1.5rem 1.5rem;list-style:disc}
.section ul li{margin-bottom:.5rem;font-size:.9375rem;line-height:1.7}
.section ul li strong{color:var(--color-text-strong)}
code{font-family:var(--font-mono);font-size:.8125rem;background:var(--color-bg-weak);padding:2px 6px;border-radius:4px;color:var(--color-text-strong)}
pre{background:var(--color-bg-weak);border:1px solid var(--color-border);border-radius:8px;padding:1rem;overflow-x:auto;margin:1rem 0;font-family:var(--font-mono);font-size:.8125rem;line-height:1.5;color:var(--color-text-strong)}
.stats-bar{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:2.5rem}
.stat-card{background:var(--color-bg-card);border:1px solid var(--color-border-weak);border-radius:8px;padding:1.25rem;text-align:center;transition:transform .2s,box-shadow .2s;opacity:0;transform:translateY(12px)}
.stat-card.visible{opacity:1;transform:translateY(0)}
.stat-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-md)}
.stat-card .num{font-family:var(--font-mono);font-size:1.5rem;font-weight:700;color:var(--color-text-strong)}
.stat-card .lbl{font-size:.75rem;color:var(--color-text-weak);margin-top:4px}
.detail-card{background:var(--color-bg-card);border:1px solid var(--color-border-weak);border-radius:8px;padding:1.5rem;margin-bottom:12px;transition:box-shadow .2s}
.detail-card:hover{box-shadow:var(--shadow-sm)}
.detail-card h3{font-family:var(--font-display);font-size:1.125rem;font-weight:600;color:var(--color-text-strong);margin-bottom:6px;display:flex;align-items:center;gap:10px}
.detail-card .meta{display:flex;flex-wrap:wrap;gap:6px 16px;font-family:var(--font-mono);font-size:.75rem;color:var(--color-text-weak);margin-bottom:8px}
.detail-card p{font-size:.9375rem;color:var(--color-text);line-height:1.7}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.lang-grid{display:flex;flex-wrap:wrap;gap:8px;margin:1.5rem 0}
.lang-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:var(--color-bg-card);border:1px solid var(--color-border-weak);border-radius:6px;font-family:var(--font-mono);font-size:.75rem;color:var(--color-text);text-decoration:none;transition:border-color .15s,background .15s}
.lang-badge:hover{border-color:var(--color-accent);background:var(--color-accent-subtle);color:var(--color-accent)}
.lang-badge .rtl-mark{font-size:.5625rem;font-weight:600;text-transform:uppercase;background:var(--color-accent-subtle);color:var(--color-accent);padding:1px 5px;border-radius:3px}
.fade-in{opacity:0;transform:translateY(12px);transition:opacity .5s ease,transform .5s ease}
.fade-in.visible{opacity:1;transform:translateY(0)}
.delay-1{transition-delay:.1s}
.delay-2{transition-delay:.2s}
.delay-3{transition-delay:.3s}
.delay-4{transition-delay:.4s}
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
.copy-code-btn{position:absolute;top:8px;left:8px;padding:4px 8px;font-size:.6875rem;font-family:var(--font-mono);background:var(--color-bg-card);border:1px solid var(--color-border-weak);border-radius:4px;color:var(--color-text-weak);cursor:pointer;opacity:0;transition:opacity .2s,background .15s}
pre:hover .copy-code-btn{opacity:1}
.copy-code-btn:hover{background:var(--color-bg-weak);color:var(--color-text-strong)}

/* Interactive Skills Filtering */
.skills-filter{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}
.filter-btn{padding:6px 12px;font-size:.75rem;font-family:var(--font-mono);background:var(--color-bg-card);border:1px solid var(--color-border-weak);border-radius:6px;color:var(--color-text-weak);cursor:pointer;transition:all .15s;border:1px solid var(--color-border-weak)}
.filter-btn:hover{background:var(--color-bg-weak);color:var(--color-text-strong)}
.filter-btn.active{background:var(--color-accent);color:#fff;border-color:var(--color-accent)}

@media(max-width:48rem){.card-grid{grid-template-columns:1fr}.stats-bar{grid-template-columns:repeat(3,1fr)}}`;
}

// ─── Data Sources (same as English version) ─────────────────────────────────────

function readJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function getVersion() {
  return readJSON(join(ROOT, "package.json")).version;
}

function getDescription() {
  return readJSON(join(ROOT, "package.json")).description;
}

function getSkills() {
  const dir = join(ROOT, "registry", "skills");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith(".json")).map(f => {
    try { return readJSON(join(dir, f)); } catch { return null; }
  }).filter(Boolean);
}

function getLanguages() {
  const dir = join(ROOT, "packages", "i18n", "locales");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));
}

function getThemes() {
  // Hardcoded list matching the actual types.ts
  return [
    "light", "dark", "amoled", "blue-light", "blue-dark", "slate-light", "slate-dark",
    "warm-light", "warm-dark", "cold-light", "cold-dark", "forest-light", "forest-dark",
    "midnight-light", "midnight-dark", "sunset-light", "sunset-dark", "rose-light", "rose-dark",
    "mocha-light", "mocha-dark", "lavender-light", "lavender-dark", "peach-light", "peach-dark",
    "ocean-light", "ocean-dark", "high-contrast-light", "high-contrast-dark",
    "sepia-light", "sepia-dark", "gruvbox-light", "gruvbox-dark", "nord-light", "nord-dark",
  ];
}

function getProviders() {
  return [
    { id: "aura-cloud", name: "Aura Cloud Models", models: 3, local: false },
    { id: "anthropic", name: "Anthropic", models: 2, local: false },
    { id: "openai", name: "OpenAI", models: 2, local: false },
    { id: "gemini", name: "Google Gemini", models: 2, local: false },
    { id: "deepseek", name: "DeepSeek", models: 2, local: false },
    { id: "ollama", name: "Ollama", models: null, local: true },
    { id: "openai-compatible", name: "OpenAI Compatible", models: null, local: true },
    { id: "minimax", name: "Minimax", models: 1, local: false },
    { id: "qwen", name: "Qwen", models: 2, local: false },
    { id: "lmstudio", name: "LM Studio", models: null, local: true },
  ];
}

function getRoutingPolicies() {
  return [
    { id: "quality-first", label: "Quality First" },
    { id: "cost-first", label: "Cost First" },
    { id: "privacy-first", label: "Privacy First" },
    { id: "local-only", label: "Local Only" },
    { id: "manual", label: "Manual" },
  ];
}

function getSidecars() {
  return [
    "agent", "bridge", "browser-helper", "cloud-sync", "computer-use", "vm-helper", "plugins-helper", "prompt-system"
  ];
}

function getPermissionProfiles() {
  return [
    {
      id: "read-only",
      name: "قراءة فقط",
      desc: "وصول قراءة للملفات. يمكن للوكلاء تحليل الكود والبحث في الملفات وقراءة الوثائق — لكن لا يمكنهم الكتابة أو التنفيذ.",
      grants: [{ category: "file", action: "read", target: "*" }],
    },
    {
      id: "safe-automation",
      name: "أتمتة آمنة",
      desc: "قراءة وكتابة الملفات مع وصول shell للقراءة. يمكن للوكلاء تعديل الكود وإنشاء الملفات — سير عمل تطوير كامل بدون تنفيذ.",
      grants: [
        { category: "file", action: "read", target: "*" },
        { category: "file", action: "write", target: "*" },
        { category: "shell", action: "read", target: "*" },
      ],
    },
    {
      id: "research",
      name: "بحث (قراءة + تصفح)",
      desc: "وصول قراءة للملفات مع أتمتة المتصفح. يمكن للوكلاء البحث في الويب وتصفح الوثائق وتحليل الملفات المحلية.",
      grants: [
        { category: "file", action: "read", target: "*" },
        { category: "browser", action: "browse", target: "*" },
      ],
    },
  ];
}

// ─── Page Layout ────────────────────────────────────────────────────────────────

function getSidebarArHTML(currentPage) {
  const items = [
    { type: "section", title: "البداية" },
    { type: "link", href: "overview.ar.html", id: "overview", title: "نظرة عامة" },
    { type: "link", href: "quickstart.ar.html", id: "quickstart", title: "بداية سريعة" },
    { type: "section", title: "النواة" },
    { type: "link", href: "architecture.ar.html", id: "architecture", title: "الهندسة المعمارية" },
    { type: "link", href: "providers.ar.html", id: "providers", title: "المزودون" },
    { type: "link", href: "cli.ar.html", id: "cli", title: "واجهة الأوامر" },
    { type: "link", href: "permissions.ar.html", id: "permissions", title: "الأذونات" },
    { type: "link", href: "routing.ar.html", id: "routing", title: "التوجيه" },
    { type: "link", href: "skills.ar.html", id: "skills", title: "المهارات" },
    { type: "link", href: "mcp.ar.html", id: "mcp", title: "بروتوكول السياق (MCP)" },
    { type: "link", href: "sidecars.ar.html", id: "sidecars", title: "الخدمات المساعدة" },
    { type: "section", title: "التخصيص" },
    { type: "link", href: "languages.ar.html", id: "languages", title: "اللغات" },
    { type: "link", href: "themes.ar.html", id: "themes", title: "الثيمات" }
  ];

  return `<aside class="sidebar">
    <div class="sidebar-search">
      <input type="text" placeholder="بحث في الوثائق..." oninput="filterSidebar(this.value)">
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

function pageHeaderAr(pageId = "docs") {
  const enHref = pageId === "hub" ? "docs.html" : `${pageId}.html`;
  const arHref = pageId === "hub" ? "docs.ar.html" : `${pageId}.ar.html`;
  return `<header>
  <div class="header-inner">
    <a href="../index.ar.html" class="logo">
      <span class="logo-mark">A</span>
      Aura Work
    </a>
    <nav>
      <ul>
        <li><a href="https://aura-work.shop/" >${tr("Home")}</a></li>
        <li><a href="https://aura-work.shop/docs/docs.ar.html" class="active">${tr("Docs")}</a></li>
        <li><a href="https://github.com/hbx12/aura-work">${tr("GitHub")}</a></li>
        <li style="position:relative;display:flex;align-items:center;gap:1rem">
          <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme" type="button">
            <svg class="sun" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            <svg class="moon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <div style="position:relative">
            <a href="#" class="lang-trigger" onclick="event.preventDefault();document.getElementById('lm').classList.toggle('open')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              AR
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

function pageFooterAr() {
  return `<footer style="text-align:center;padding:2rem 0;font-size:.75rem;color:var(--color-text-weak);border-top:1px solid var(--color-border-weak);margin-top:2rem">
  <div>&copy; 2026 مساهمو Aura Work &nbsp;&middot;&nbsp; <a href="https://github.com/hbx12/aura-work/blob/main/LICENSE">Apache 2.0</a></div>
  <div class="links" style="display:flex;gap:16px;justify-content:center;margin-top:8px">
    <a href="https://github.com/hbx12/aura-work">${tr("GitHub")}</a>
    <a href="https://github.com/hbx12/aura-work/blob/main/CODE_OF_CONDUCT.md">مدونة السلوك</a>
    <a href="https://github.com/hbx12/aura-work/security/policy">الأمان</a>
  </div>
</footer>`;
}

function wrapPageAr(title, bodyContent, pageId = "docs") {
  const isHub = pageId === "hub";
  const mainContent = isHub
    ? bodyContent
    : `<div class="layout">
        ${getSidebarArHTML(pageId)}
        <main class="content">
          ${bodyContent}
        </main>
       </div>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" data-page="aura-work">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — وثائق Aura Work</title>
<meta name="description" content="وثائق Aura Work — ${title}">
<meta property="og:title" content="${title} — Aura Work">
<meta property="og:description" content="وثائق Aura Work — ${title}">
<meta property="og:url" content="https://aura-work.shop/">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="../assets/css/main.css">
<style>
  html[dir="rtl"] .layout { direction: rtl; }
  html[dir="rtl"] .back-link { flex-direction: row-reverse; }
  html[dir="rtl"] .sidebar { text-align: right; }
  .hero { padding: 4rem 0 2.5rem; position: relative; overflow: hidden; }
  .hero::before { content: ''; position: absolute; top: -50%; right: -20%; width: 60%; height: 200%; background: radial-gradient(ellipse at center, var(--bg-accent-subtle) 0%, transparent 70%); pointer-events: none; }
  .hero h1 { position: relative; z-index: 1; }
  .hero .subtitle { position: relative; z-index: 1; }
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: .75rem; color: var(--text-weak); text-decoration: none; margin-bottom: 1.5rem; transition: color .15s; }
  .back-link:hover { color: var(--text-accent); }
  .section:first-of-type { padding-top: 2rem; }
  .local-badge { display: inline-block; padding: 1px 6px; font-size: .5625rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; border-radius: 3px; font-family: var(--font-mono); }
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
${pageHeaderAr(pageId)}
${isHub ? '<main>' : ''}
${isHub ? '' : `<a href="docs.ar.html" class="back-link">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
  ${tr("Back to Docs Hub")}
</a>`}
${mainContent}
${isHub ? '</main>' : ''}
${pageFooterAr()}
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

    // Copy code button injection (adjusted left offset for RTL)
    document.querySelectorAll('pre').forEach(pre => {
      const btn = document.createElement('button');
      btn.className = 'copy-code-btn';
      btn.textContent = 'نسخ';
      btn.onclick = function() {
        navigator.clipboard.writeText(pre.querySelector('code').textContent).then(() => {
          btn.textContent = 'تم النسخ!';
          setTimeout(() => btn.textContent = 'نسخ', 2000);
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

// ─── Page Generators ────────────────────────────────────────────────────────────

function generateDocsHubAr() {
  const version = getVersion();
  const skills = getSkills();
  const languages = getLanguages();
  const themes = getThemes();
  const providers = getProviders();
  const sidecars = getSidecars();
  const routes = getRoutingPolicies();

  const sections = [
    { href: "overview.ar.html", title: tr("Overview"), desc: tr("What is Aura Work and why it exists"), icon: "◆", color: "#c2683f" },
    { href: "quickstart.ar.html", title: tr("Quick Start"), desc: tr("Install, configure, run your first task"), icon: "▶", color: "#1a7f64" },
    { href: "providers.ar.html", title: `${tr("Providers")} (${providers.length})`, desc: tr("AI model providers with auto-discovery"), icon: "◆", color: "#c48b5c" },
    { href: "routing.ar.html", title: `${tr("Routing")} (${routes.length})`, desc: tr("Intelligent 5-policy model routing engine"), icon: "↗", color: "#4b5bb0" },
    { href: "skills.ar.html", title: `${tr("Skills")} (${skills.length})`, desc: `${skills.length} ${tr("pre-built agent skills in the registry")}`, icon: "⚡", color: "#7a5c8e" },
    { href: "sidecars.ar.html", title: `${tr("Sidecars")} (${sidecars.length})`, desc: `${sidecars.length} ${tr("modular background service daemons")}`, icon: "▤", color: "#1988a2" },
    { href: "languages.ar.html", title: `${tr("Languages")} (${languages.length})`, desc: `${languages.length} ${tr("human languages with RTL support")}`, icon: "🌐", color: "#3a6fc4" },
    { href: "themes.ar.html", title: `${tr("Themes")} (${themes.length})`, desc: `${themes.length} ${tr("hand-crafted visual themes")}`, icon: "◐", color: "#a855f7" },
    { href: "permissions.ar.html", title: tr("Permissions"), desc: tr("3 permission profiles: read-only, safe-automation, research"), icon: "🔒", color: "#e05c2b" },
    { href: "architecture.ar.html", title: tr("Architecture"), desc: tr("Tauri 2 + React 19 + Rust multi-process architecture"), icon: "◈", color: "#645d4e" },
    { href: "cli.ar.html", title: tr("CLI"), desc: tr("Command-line bridge client for remote control"), icon: "⌘", color: "#1a7f64" },
    { href: "mcp.ar.html", title: tr("MCP"), desc: tr("Model Context Protocol for third-party tool integration"), icon: "⇌", color: "#c2683f" },
  ];

  const hero = `<div class="hero">
    <div class="meta-badge">v${version}</div>
    <h1>${tr("Documentation")}</h1>
    <p class="subtitle">${tr("Everything you need to understand, extend, and contribute to Aura Work — the open-source multi-provider desktop AI agent platform.")}</p>
  </div>`;

  const statsBar = `<div class="stats-bar">
    ${[{ num: version, lbl: tr("Version") }, { num: providers.length, lbl: tr("Providers") }, { num: skills.length, lbl: tr("Skills") }, { num: sidecars.length, lbl: tr("Sidecars") }, { num: languages.length, lbl: tr("Languages") }, { num: themes.length, lbl: tr("Themes") }].map((s, i) => `<div class="stat-card fade-in delay-${i+1}"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>`).join("\n")}
  </div>`;

  const cards = sections.map((s, i) => `<a href="${s.href}" class="fade-in delay-${(i % 6) + 1}" style="text-decoration:none;display:block">
    <div class="detail-card" style="cursor:pointer">
      <h3><span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:${s.color};color:#fff;font-size:.75rem;font-family:var(--font-mono);flex-shrink:0">${s.icon}</span> ${s.title}</h3>
      <p>${s.desc}</p>
    </div>
  </a>`).join("\n");

  const quickLinks = `<section class="section">
    <div class="section-label">روابط سريعة</div>
    <h2>ابدأ من هنا</h2>
    <p>سواء كنت مستخدماً جديداً أو مطوراً يريد المساهمة في الكود المصدري، إليك أسرع الطرق للوصول إلى ما تحتاجه بالضبط:</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:1rem">
      <div class="detail-card">
        <h3>👋 مستخدم جديد؟</h3>
        <p>ابدأ بصفحة <a href="overview.ar.html">نظرة عامة</a> لفهم فلسفة Aura Work، ثم انتقل إلى <a href="quickstart.ar.html">البداية السريعة</a> لتثبيت التطبيق وتشغيل أول مهمة خلال دقائق.</p>
      </div>
      <div class="detail-card">
        <h3>🧑‍💻 مطور أو مساهم؟</h3>
        <p>راجع صفحة <a href="architecture.ar.html">الهندسة</a> لفهم بنية النظام متعددة العمليات، ثم <a href="skills.ar.html">المهارات</a> و <a href="mcp.ar.html">بروتوكول السياق (MCP)</a> لإضافة قدرات جديدة للوكيل.</p>
      </div>
      <div class="detail-card">
        <h3>🔐 مهتم بالخصوصية والأمان؟</h3>
        <p>اطلع على <a href="permissions.ar.html">الأذونات</a> و <a href="routing.ar.html">التوجيه</a> لمعرفة كيف يبقى Aura Work محلي البيانات وآمناً بشكل افتراضي دون أي تنازلات.</p>
      </div>
      <div class="detail-card">
        <h3>⌘ تفضل الطرفية (Terminal)؟</h3>
        <p>راجع صفحة <a href="cli.ar.html">واجهة الأوامر</a> للتحكم الكامل في Aura Work من سطر الأوامر — إنشاء المهام ومتابعتها عن بُعد.</p>
      </div>
    </div>
  </section>`;

  const pagesTable = `<section class="section">
    <div class="section-label">فهرس كامل للوثائق</div>
    <h2>كل صفحات الوثائق</h2>
    <table style="margin-top:.75rem">
      <thead><tr><th>الصفحة</th><th>الوصف</th></tr></thead>
      <tbody>
        <tr><td><a href="overview.ar.html">نظرة عامة</a></td><td>ما هو Aura Work، فلسفة تصميمه، ولماذا وُجد</td></tr>
        <tr><td><a href="quickstart.ar.html">بداية سريعة</a></td><td>التثبيت والإعداد وتشغيل أول مهمة خلال دقائق</td></tr>
        <tr><td><a href="providers.ar.html">المزوّدون</a></td><td>${providers.length} مزوّد نماذج ذكاء اصطناعي، سحابي ومحلي، مع الاكتشاف التلقائي للنماذج</td></tr>
        <tr><td><a href="routing.ar.html">التوجيه</a></td><td>محرك التوجيه الذكي و${routes.length} سياسات لاختيار النموذج الأمثل لكل مهمة</td></tr>
        <tr><td><a href="skills.ar.html">المهارات</a></td><td>${skills.length} مهارة جاهزة ومُسندبة يمكن للوكيل استخدامها فوراً</td></tr>
        <tr><td><a href="sidecars.ar.html">الخدمات المساعدة</a></td><td>${sidecars.length} خدمة خلفية معيارية تشغّل قدرات النظام المختلفة</td></tr>
        <tr><td><a href="languages.ar.html">اللغات</a></td><td>${languages.length} لغة بشرية مدعومة مع دعم كامل للكتابة من اليمين لليسار</td></tr>
        <tr><td><a href="themes.ar.html">الثيمات</a></td><td>${themes.length} ثيم بصري مصمم يدوياً بين الفاتح والداكن والفاخر</td></tr>
        <tr><td><a href="permissions.ar.html">الأذونات</a></td><td>نظام أذونات دقيق يتحكم في كل ما يفعله الوكيل على جهازك</td></tr>
        <tr><td><a href="architecture.ar.html">الهندسة</a></td><td>بنية Tauri 2 + React 19 + Rust متعددة العمليات بالتفصيل</td></tr>
        <tr><td><a href="cli.ar.html">واجهة الأوامر</a></td><td>عميل سطر أوامر (CLI) للتحكم في Aura Work عن بعد</td></tr>
        <tr><td><a href="mcp.ar.html">بروتوكول السياق (MCP)</a></td><td>دمج أدوات وخوادم الطرف الثالث عبر بروتوكول سياق النماذج</td></tr>
      </tbody>
    </table>
  </section>`;

  return wrapPageAr(tr("Documentation Hub"), hero + `<section class="section">${statsBar}<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">${cards}</div></section>` + quickLinks + pagesTable, "hub");
}

function generateOverviewAr() {
  const version = getVersion();
  const body = `<div class="hero">
    <h1><span>${tr("Overview")}</span></h1>
    <p class="subtitle">${tr("What is Aura Work and why it exists")}</p>
  </div>
  <section class="section">
    <p>Aura Work هي <strong>منصة وكلاء ذكاء اصطناعي مكتبية متعددة المزوّدين</strong> مبنية للمطورين الذين يريدون مساعدة ذكاء اصطناعي <strong>محلية أولاً ومقيدة بالأذونات وقابلة للاستضافة الذاتية</strong>. تدعم 10 مزوّدي ذكاء اصطناعي فورياً، مع محرك توجيه ذكي يختار النموذج المناسب لكل مهمة.</p>
    <p>على عكس الأدوات السحابية فقط، التي ترسل شيفرتك إلى خوادم خارجية، يحتفظ Aura Work ببياناتك على جهازك. يستخدم هندسة إضافات مع تنفيذ معزول، وتخزين مشفر للبيانات الاعتمادية، وتحكم دقيق في الأذونات. المنصة مصممة للمطورين الذين يريدون تحكماً كاملاً في أدوات الذكاء الاصطناعي الخاصة بهم — لا تغادر أي بيانات جهازك إلا إذا اخترت المزامنة صراحةً.</p>

    <h2 style="margin-top:2rem">لماذا Aura Work؟</h2>
    <p>معظم أدوات الذكاء الاصطناعي البرمجية إما سحابية فقط (ترسل شيفرتك لخوادم خارجية) أو محدودة بمزود واحد. Aura Work يحل كلا المشكلتين:</p>
    <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>متعدد المزوّدين</strong> — استخدم OpenAI و Anthropic و Gemini و DeepSeek و Ollama والمزيد من واجهة واحدة</li>
      <li><strong>محلي أولاً</strong> — بياناتك تبقى على جهازك، مشفرة بمفاتيح مرتبطة بالجهاز</li>
      <li><strong>مقيد بالأذونات</strong> — كل إجراء يتطلب موافقة صريحة (أو ملفات تعريف مُعدّة مسبقاً)</li>
      <li><strong>قابل للاستضافة الذاتية</strong> — شغّل خادم المزامنة السحابية الخاص بك، دون اعتماد على بنيتنا التحتية</li>
      <li><strong>قابل للتوسيع</strong> — أضف قدرات عبر المهارات وخوادم MCP والإضافات</li>
    </ul>

    <div class="detail-card">
      <h3>🎯 القدرات الأساسية</h3>
      <p>Aura Work أكثر من مجرد واجهة محادثة. إنه بيئة تطوير كاملة تشمل:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>محرك المهام</strong> — تنفيذ مهام متعددة الخطوات مع مراحل التخطيط والتنفيذ والمراجعة</li>
        <li><strong>عمليات الملفات</strong> — قراءة وكتابة وبحث وإدارة الملفات مع ضوابط أذونات</li>
        <li><strong>تكامل Git</strong> — الحالة، الفرق، الالتزام، وإدارة الفروع مباشرة من الوكيل</li>
        <li><strong>أتمتة المتصفح</strong> — تصفح المواقع واستخراج البيانات وملء النماذج عبر Puppeteer</li>
        <li><strong>استخدام الحاسوب</strong> — التحكم بتطبيقات سطح المكتب عبر لقطات الشاشة والفأرة ولوحة المفاتيح</li>
        <li><strong>صندوق الرمل الافتراضي</strong> — تنفيذ أوامر shell في بيئات WSL2 أو حاويات معزولة</li>
        <li><strong>المزامنة السحابية</strong> — مزامنة مشفرة من طرف إلى طرف عبر الأجهزة، بخادم قابل للاستضافة الذاتية</li>
        <li><strong>المهام المجدولة</strong> — أتمتة المهام المتكررة بجدولة شبيهة بـ cron</li>
        <li><strong>18 مهارة مدمجة</strong> — مستندات، جداول بيانات، ملفات PDF، بحث، تصميم، والمزيد</li>
        <li><strong>دعم MCP</strong> — الاتصال بأي خادم MCP لتوسّع غير محدود</li>
      </ul>
    </div>
  </section>
  <section class="section">
    <div class="section-label">${tr("Key Facts")}</div>
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">v${version}</div><div class="lbl">${tr("Current version")}</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">Tauri 2</div><div class="lbl">${tr("Desktop framework")}</div></div>
      <div class="stat-card fade-in delay-3"><div class="num">React 19</div><div class="lbl">${tr("UI framework")}</div></div>
      <div class="stat-card fade-in delay-4"><div class="num">Rust</div><div class="lbl">${tr("Core backend")}</div></div>
    </div>
    <h2 style="margin-top:2rem">${tr("Architecture at a glance")}</h2>
    <div class="detail-card">
      <h3>🖥️ تطبيق سطح المكتب</h3>
      <p>غلاف Tauri 2 يستضيف واجهة React 19 الأمامية. يدير النوافذ وعلبة النظام والقوائم الأصلية والتواصل (IPC) مع العمليات المساعدة. يتولى الجزء الخلفي المبني بـ Rust العمليات الحساسة للأداء وتكامل النظام.</p>
      <p style="margin-top:.75rem">يوفر تطبيق سطح المكتب 14 صفحة رئيسية: لوحة التحكم، المهام، الملفات، Git، الطرفية، المزوّدون، الإضافات، المتصفح، التحكم بالحاسوب، المهام المجدولة، الذاكرة، سجل التدقيق، السحابة، والإضافات.</p>
    </div>
    <div class="detail-card">
      <h3>⚙️ الخدمات المساعدة (Sidecars)</h3>
      <p>8 خدمات Node.js مستقلة لتنفيذ الوكيل، أتمتة المتصفح، صندوق الرمل الافتراضي، المزامنة السحابية، التحكم بالحاسوب، والمزيد. كل خدمة تعمل في مساحة عملية خاصة بها بدورة حياة مستقلة، وتتواصل عبر IPC أو HTTP.</p>
      <p style="margin-top:.75rem">الخدمات المساعدة: Agent (47821)، VM Helper (47822)، Browser Helper (47823)، Plugins Helper (47824)، Cloud Sync (47825)، Bridge (47826)، Computer Use (47828)، Cloud Server (47830).</p>
    </div>
    <div class="detail-card">
      <h3>🤖 محرك الوكيل</h3>
      <p>تنسيق متعدد الوكلاء بأدوار متخصصة: <strong>المخطط (Planner)</strong> يفكك المهام إلى خطوات، <strong>المنفذ (Executor)</strong> ينفذ كل خطوة، <strong>المراجع (Reviewer)</strong> يتحقق من صحة المخرجات، و<strong>الأمان (Safety)</strong> يفرض الحدود. يدعم الأدوات المخصصة وخوادم MCP.</p>
      <p style="margin-top:.75rem">يمكن للوكيل استخدام أي مزيج من الأدوات المدمجة والمهارات وخوادم MCP والإضافات لإتمام المهام، ويختار تلقائياً أفضل أداة لكل خطوة حسب متطلبات المهمة.</p>
    </div>
    <div class="detail-card">
      <h3>🔀 محرك التوجيه</h3>
      <p>موجّه نماذج ذكي عبر 10 مزوّدين بـ 5 سياسات توجيه: <strong>الجودة أولاً</strong> (أفضل نموذج للمهمة)، <strong>التكلفة أولاً</strong> (الخيار الأرخص)، <strong>الخصوصية أولاً</strong> (محلي فقط)، <strong>محلي فقط</strong> (Ollama/LM Studio)، أو <strong>يدوي</strong> (أنت تختار).</p>
      <p style="margin-top:.75rem">يحلل محرك التوجيه نوع كل مهمة وحساسيتها والقدرات المطلوبة لاختيار المزود والنموذج الأمثلين، ويمكنه التراجع إلى مزوّدين بديلين إذا فشل المزوّد الأساسي.</p>
    </div>
  </section>
  <section class="section">
    <div class="section-label">كيف يعمل النظام</div>
    <h2>سير العمل</h2>
    <p>عندما تكتب طلباً في Aura Work، إليك ما يحدث:</p>
    <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2.5">
      <li><strong>1. إنشاء المهمة</strong> — يتحول طلبك إلى مهمة في قاعدة بيانات SQLite</li>
      <li><strong>2. التخطيط</strong> — وكيل المخطط يحلل المهمة وينشئ خطة خطوة بخطوة</li>
      <li><strong>3. التوجيه</strong> — محرك التوجيه يختار أفضل مزود/نموذج حسب سياستك</li>
      <li><strong>4. فحص الأذونات</strong> — كل خطوة تُفحص مقابل ملف الأذونات النشط</li>
      <li><strong>5. التنفيذ</strong> — وكيل المنفذ ينفذ كل خطوة، مستدعياً الأدوات عند الحاجة</li>
      <li><strong>6. المراجعة</strong> — وكيل المراجع يتحقق من صحة المخرجات وسلامتها</li>
      <li><strong>7. الإنجاز</strong> — تُعرض النتائج وتُسجَّل في سجل التدقيق</li>
    </ol>
    <p style="margin-top:1.5rem">الإجراءات عالية التأثير (كتابة الملفات، أوامر shell، أتمتة المتصفح) تتطلب موافقة صريحة في وضع <code>ask-first</code>. يمكنك ضبط الموافقة التلقائية للعمليات الموثوقة من الإعدادات ← الأذونات.</p>
  </section>
  <section class="section">
    <div class="section-label">الأمان والخصوصية</div>
    <h2>بياناتك تبقى ملكك</h2>
    <p>بُني Aura Work مع الأمان كأولوية أساسية:</p>
    <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>مفاتيح API لا تغادر جهازك أبداً</strong> — تُخزَّن في خزنة مشفرة بمفاتيح مرتبطة بالجهاز (DPAPI في Windows، Keychain في macOS، Secret Service في Linux)</li>
      <li><strong>لا قياس عن بعد افتراضياً</strong> — لا تُجمع أي بيانات استخدام ما لم تختر ذلك</li>
      <li><strong>مزامنة سحابية مشفرة من طرف إلى طرف</strong> — إذا استخدمت Aura Cloud، تُشفَّر البيانات بـ XChaCha20-Poly1305 قبل مغادرة جهازك</li>
      <li><strong>سجل تدقيق</strong> — كل إجراء يُسجَّل مع الفاعل والفئة والإجراء والهدف ومستوى المخاطرة والنتيجة</li>
      <li><strong>نظام أذونات</strong> — تحكم دقيق فيما يمكن للوكيل الوصول إليه (ملفات، shell، متصفح، شبكة)</li>
    </ul>
  </section>
  <section class="section">
    <div class="section-label">حالات الاستخدام</div>
    <h2>لمن صُمم Aura Work؟</h2>
    <div class="detail-card">
      <h3>👨‍💻 للمطورين</h3>
      <p>ابدأ ميزة جديدة بجملة واحدة: <code>"أضف مصادقة JWT إلى واجهة API"</code>. سيحلل Aura قاعدة الشيفرة وينشئ خطة ويكتب الكود ويشغل الاختبارات ويفتح طلب سحب — كل ذلك مع مراجعتك في كل خطوة حساسة.</p>
    </div>
    <div class="detail-card">
      <h3>✍️ للكتّاب والمحللين</h3>
      <p>حلّل مستنداً: <code>"حلّل التقرير السنوي واستخرج أهم النقاط"</code>، ثم <code>"أنشئ عرضاً تقديمياً من هذه النتائج"</code>. مهارات المستندات وجداول البيانات وملفات PDF مدمجة وجاهزة.</p>
    </div>
    <div class="detail-card">
      <h3>🛠️ لمديري الأنظمة</h3>
      <p>راقب خادماً: <code>"افحص استخدام القرص وأنشئ تقريراً"</code>. ادمج مع أدوات المراقبة الخاصة بك عبر خوادم MCP، وجدول المهام المتكررة تلقائياً.</p>
    </div>
    <div class="detail-card">
      <h3>🔬 للباحثين</h3>
      <p>اجمع معلومات من مصادر متعددة: <code>"قارن بين PostgreSQL و MongoDB لحالتنا الاستخدامية"</code>. مهارة البحث تصفح الويب وتلخص وتذكر مصادرها.</p>
    </div>
  </section>
  <section class="section">
    <div class="section-label">لمحة معمارية</div>
    <h2>مخطط النظام</h2>
    <pre><code>┌─────────────────────────────────────────────┐
│           تطبيق Aura Work (Tauri 2)          │
│   React 19 + قذيفة Rust + IPC + علبة النظام   │
└───────────────────────┬───────────────────────┘
                         │ IPC / HTTP محلي
      ┌──────────────────┼──────────────────┐
      │                  │                  │
┌─────▼─────┐     ┌──────▼──────┐    ┌──────▼──────┐
│  Agent    │     │  Browser    │    │  VM Helper  │
│  :47821   │     │  Helper     │    │  :47822     │
│ (المخطط،  │     │  :47823     │    │ (صندوق رمل  │
│  المنفذ،  │     │ (أتمتة الويب)│    │  معزول)     │
│  المراجع) │     └─────────────┘    └─────────────┘
└─────┬─────┘
      │ محرك التوجيه (5 سياسات)
┌─────▼─────────────────────────────────────────┐
│   10 مزوّدي ذكاء اصطناعي (سحابي + محلي)        │
│   OpenAI · Anthropic · Gemini · Ollama · ...   │
└─────────────────────────────────────────────────┘</code></pre>
  </section>`;
  return wrapPageAr(tr("Overview"), body, "overview");
}

function generateQuickStartAr() {
  const body = `<div class="hero">
    <h1><span>${tr("Quick Start")}</span></h1>
    <p class="subtitle">من الصفر إلى تشغيل أول مهمة ذكاء اصطناعي.</p>
  </div>
  <section class="section">
    <p>هذا الدليل سيأخذك من التثبيت إلى أول مهمة مدعومة بالذكاء الاصطناعي في أقل من 5 دقائق. Aura Work متوفر لأنظمة <strong>Windows و macOS و Linux</strong>.</p>

    <h2 style="margin-top:2rem">${tr("Prerequisites")}</h2>
    <table style="margin-top:.75rem">
      <thead><tr><th>المنصة</th><th>المتطلبات</th></tr></thead>
      <tbody>
        <tr><td><strong>Windows</strong></td><td>Windows 10 فأحدث (يتضمن WebView2)، 4 جيجابايت رام كحد أدنى</td></tr>
        <tr><td><strong>macOS</strong></td><td>macOS 11 فأحدث، أدوات Xcode Command Line</td></tr>
        <tr><td><strong>Linux</strong></td><td>Ubuntu 20.04 فأحدث، libwebkit2gtk-4.1-dev، libappindicator3-dev</td></tr>
      </tbody>
    </table>

    <div class="detail-card">
      <h3>1. التثبيت</h3>
      <p>حمّل أحدث إصدار من <a href="https://github.com/hbx12/aura-work/releases/latest">إصدارات GitHub</a>. برامج التثبيت متوفرة لـ Windows (.msi) و macOS (.dmg) و Linux (.deb، .AppImage).</p>
      <p style="margin-top:.75rem"><strong>Windows:</strong> شغّل ملف .msi واتبع التعليمات. سيُضاف التطبيق إلى قائمة ابدأ.</p>
      <p style="margin-top:.5rem"><strong>macOS:</strong> افتح ملف .dmg واسحب Aura Work إلى مجلد Applications.</p>
      <p style="margin-top:.5rem"><strong>Linux:</strong> ثبّت حزمة .deb عبر <code>sudo dpkg -i aura-work.deb</code> أو شغّل ملف .AppImage مباشرة.</p>
    </div>

    <div class="detail-card">
      <h3>2. التشغيل</h3>
      <p>افتح Aura Work. يبدأ التطبيق بمشروع افتراضي ولوحة الوكيل جاهزة. سترى واجهة المحادثة حيث يمكنك كتابة أول مهمة.</p>
      <p style="margin-top:.75rem">عند التشغيل الأول، سيقوم التطبيق بـ:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li>إنشاء قاعدة بيانات SQLite محلية للمشاريع والمهام</li>
        <li>تهيئة الخزنة المشفرة لمفاتيح API</li>
        <li>تشغيل الخدمة المساعدة Agent (المنفذ 47821)</li>
        <li>اكتشاف لغة نظامك وتطبيق الثيم المناسب</li>
      </ul>
    </div>

    <div class="detail-card">
      <h3>3. تكوين مزوّد</h3>
      <p>اذهب إلى <strong>الإعدادات ← المزوّدون</strong>. تحتاج إلى مزوّد ذكاء اصطناعي واحد على الأقل لاستخدام Aura Work. الخيارات:</p>

      <h4 style="margin-top:1rem;margin-bottom:.5rem">الخيار أ: مزوّد سحابي (موصى به للبدء)</h4>
      <ol style="padding-right:1.25rem;margin-top:.5rem;line-height:2">
        <li><strong>1.</strong> اضغط على مزوّد (OpenAI، Anthropic، Gemini، إلخ)</li>
        <li><strong>2.</strong> أدخل مفتاح API الخاص بك</li>
        <li><strong>3.</strong> اضغط "تحقق" لاختبار الاتصال</li>
        <li><strong>4.</strong> اختر النماذج التي تريد استخدامها</li>
      </ol>

      <h4 style="margin-top:1rem;margin-bottom:.5rem">الخيار ب: مزوّد محلي (مجاني، دون حاجة لمفتاح API)</h4>
      <ol style="padding-right:1.25rem;margin-top:.5rem;line-height:2">
        <li><strong>1.</strong> ثبّت <a href="https://ollama.ai">Ollama</a> على جهازك</li>
        <li><strong>2.</strong> اسحب نموذجاً: <code>ollama pull llama3</code></li>
        <li><strong>3.</strong> في Aura Work، فعّل مزوّد Ollama</li>
        <li><strong>4.</strong> يكتشف التطبيق النماذج المتاحة تلقائياً</li>
      </ol>
      <p style="margin-top:.75rem">المزوّدون المحليون يبقون كل البيانات على جهازك — بدون مفاتيح API، وبدون حاجة للإنترنت.</p>
    </div>

    <div class="detail-card">
      <h3>4. تشغيل أول مهمة</h3>
      <p>اكتب طلباً في واجهة المحادثة. إليك بعض الأمثلة لتجربتها:</p>
      <pre><code># مهام برمجية
"أنشئ مكوّن React جديد يجلب بيانات من واجهة API"
"أصلح الخلل في auth.ts حيث يفشل تسجيل الدخول مع الرموز الخاصة"
"أضف اختبارات وحدة لصنف UserService"

# مهام مستندات
"أنشئ تقرير PDF يلخص بنية المشروع"
"أنشئ جدول بيانات بنتائج الاختبارات"

# مهام بحث
"ابحث عن أحدث أفضل ممارسات أمان Node.js"
"قارن بين PostgreSQL و MongoDB لحالتنا الاستخدامية"

# مهام متصفح
"تصفح https://example.com واستخرج كل العناوين"
"املأ نموذج التواصل على الموقع"</code></pre>
      <p style="margin-top:.75rem">سيقوم الوكيل بـ:</p>
      <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> تحليل طلبك وإنشاء خطة</li>
        <li><strong>2.</strong> اختيار أفضل مزوّد ونموذج (حسب سياسة التوجيه لديك)</li>
        <li><strong>3.</strong> تنفيذ كل خطوة، مستدعياً الأدوات عند الحاجة</li>
        <li><strong>4.</strong> عرض النتائج عليك وطلب الموافقة على الإجراءات عالية التأثير</li>
      </ol>
    </div>

    <div class="detail-card">
      <h3>5. الاستكشاف</h3>
      <p>الآن بعد أن أصبحت أول مهمة تعمل، استكشف هذه الميزات:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>المهارات</strong> — جرّب "استخدم مهارة البحث لـ..." أو "أنشئ جدول بيانات بـ..."</li>
        <li><strong>خوادم MCP</strong> — ثبّت خوادم MCP من لوحة الإضافات لقدرات إضافية</li>
        <li><strong>سياسات التوجيه</strong> — غيّر سياسة التوجيه من الإعدادات ← التوجيه</li>
        <li><strong>المهام المجدولة</strong> — أنشئ مهاماً متكررة من صفحة المهام المجدولة</li>
        <li><strong>واجهة الأوامر</strong> — ثبّت CLI للتحكم من الطرفية: <code>npm install -g @aura-work/cli</code></li>
        <li><strong>أتمتة المتصفح</strong> — جرّب "تصفح هذا الموقع و..." لمهام الويب</li>
        <li><strong>التحكم بالحاسوب</strong> — فعّل ميزة التحكم بالحاسوب التجريبية لأتمتة سطح المكتب</li>
      </ul>
    </div>
  </section>
  <section class="section">
    <div class="section-label">الإعدادات</div>
    <h2>الإعدادات الأساسية</h2>

    <div class="detail-card">
      <h3>🔀 سياسة التوجيه</h3>
      <p>اضبط كيفية اختيار الوكيل للمزوّدين من <strong>الإعدادات ← التوجيه</strong>:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>الجودة أولاً</strong> — يستخدم أفضل نموذج متاح (موصى به للمهام المهمة)</li>
        <li><strong>التكلفة أولاً</strong> — يستخدم أرخص نموذج قادر على التعامل مع المهمة</li>
        <li><strong>الخصوصية أولاً</strong> — يستخدم المزوّدين المحليين فقط (Ollama، LM Studio)</li>
        <li><strong>محلي فقط</strong> — مثل الخصوصية أولاً، لكن بفرض أكثر صرامة</li>
        <li><strong>يدوي</strong> — أنت تختار المزوّد لكل مهمة</li>
      </ul>
    </div>

    <div class="detail-card">
      <h3>🔐 الأذونات</h3>
      <p>اضبط ما يمكن للوكيل فعله من <strong>الإعدادات ← الأذونات</strong>:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>اسأل أولاً</strong> (افتراضي) — يسأل الوكيل قبل كل إجراء عالي التأثير</li>
        <li><strong>قراءة فقط</strong> — يمكن للوكيل فقط قراءة الملفات، لا تعديلات</li>
        <li><strong>وصول كامل</strong> — يمكن للوكيل فعل أي شيء (استخدم بحذر)</li>
      </ul>
      <p style="margin-top:.75rem">يمكنك أيضاً ضبط أذونات لكل فئة (ملفات، shell، متصفح، إلخ) وإنشاء ملفات تعريف مخصصة.</p>
    </div>

    <div class="detail-card">
      <h3>🎨 الثيم</h3>
      <p>اختر من بين أكثر من 35 ثيماً من <strong>الإعدادات ← عام ← الثيم</strong>. تشمل الخيارات الفاتح والداكن وAMOLED وثيمات فاخرة. ثيم <code>system</code> يطابق تلقائياً تفضيل نظام التشغيل لديك.</p>
    </div>
  </section>
  <section class="section">
    <div class="section-label">استكشاف الأخطاء وإصلاحها</div>
    <h2>مشاكل شائعة وحلولها</h2>
    <table style="margin-top:.75rem">
      <thead><tr><th>المشكلة</th><th>الحل</th></tr></thead>
      <tbody>
        <tr><td>لا يبدأ التطبيق</td><td>تأكد من تحديث WebView2 (Windows) أو تثبيت متطلبات libwebkit2gtk (Linux)</td></tr>
        <tr><td>فشل التحقق من مزوّد سحابي</td><td>تحقق من صحة مفتاح API ووجود رصيد كافٍ في حساب المزوّد</td></tr>
        <tr><td>Ollama لا يظهر في القائمة</td><td>تأكد من تشغيل <code>ollama serve</code> وسحب نموذج واحد على الأقل</td></tr>
        <tr><td>الخدمة المساعدة لا تستجيب</td><td>راجع الإعدادات ← التشخيص وأعد تشغيل الخدمة المتعطلة يدوياً</td></tr>
        <tr><td>المهمة عالقة في "بانتظار الموافقة"</td><td>افتح لوحة الموافقات وراجع الإجراء المطلوب، أو غيّر ملف الأذونات</td></tr>
      </tbody>
    </table>
  </section>
  <section class="section">
    <div class="section-label">${tr("Next Steps")}</div>
    <h2>${tr("Going deeper")}</h2>
    <p>${tr("Read about")} <a href="providers.ar.html">${tr("Providers")}</a>, <a href="routing.ar.html">${tr("Routing")}</a>, <a href="skills.ar.html">${tr("Skills")}</a>, ${tr("or")} <a href="architecture.ar.html">${tr("Architecture")}</a>. ${tr("For contributors, see the")} <a href="https://github.com/hbx12/aura-work/blob/main/CONTRIBUTING.md">دليل المساهمة</a> و <a href="https://github.com/hbx12/aura-work/blob/main/docs/new-contributor.md">دليل المساهم الجديد</a>.</p>
  </section>
  <section class="section">
    <div class="section-label">التثبيت المتقدم</div>
    <h2>خيارات التثبيت الأخرى</h2>
    <div class="detail-card">
      <h3>باستخدام Homebrew (macOS و Linux)</h3>
      <pre><code>brew install aura-work</code></pre>
    </div>
    <div class="detail-card">
      <h3>باستخدام Winget (Windows)</h3>
      <pre><code>winget install aura-work</code></pre>
    </div>
    <div class="detail-card">
      <h3>البناء من المصدر</h3>
      <pre><code>git clone https://github.com/hbx12/aura-work.git
cd aura-work
npm install
npm run build
npm link</code></pre>
    </div>
    <p style="margin-top:1rem">يتطلب Node.js 18+. يدعم Windows و macOS و Linux مع حزم منفصلة لكل منصة.</p>
  </section>
  <section class="section">
    <div class="section-label">الاستخدام الأول</div>
    <h2>تجربتك الأولى مع CLI</h2>
    <p>بعد التثبيت، جرّب هذه الأوامر للتعرف على Aura Work:</p>
    <pre><code>aura --help
aura --version
aura config list
aura --dry-run "أنشئ مشروع Node.js جديد"</code></pre>
  </section>`;
  return wrapPageAr(tr("Quick Start"), body, "quickstart");
}

function generateProvidersAr() {
  const providers = getProviders();
  const localCount = providers.filter(p => p.local).length;
  const cloudCount = providers.length - localCount;

  // Provider descriptions in Arabic
  const providerDesc = {
    "Aura Cloud Models": tr("Hosted models via aura.work API. Includes Aura Fast (text+tools), Aura Coder (reasoning), and Aura Premium (vision+reasoning). Requires Aura Cloud sign-in."),
    "Anthropic": tr("Claude Sonnet 4 and Claude 3.5 Haiku. Best-in-class reasoning, code generation, and vision capabilities. API key required."),
    "OpenAI": tr("GPT-4o and GPT-4o mini. Industry-standard language models with broad tool-calling support. Also supports GitHub Copilot Codex accounts."),
    "Google Gemini": tr("Gemini 2.0 Flash and Gemini 2.5 Pro. Strong reasoning with massive context windows. API key required."),
    "DeepSeek": tr("DeepSeek V3 and DeepSeek R1. Cost-effective models with competitive reasoning. API key required."),
    "Ollama": tr("Fully local. Run any model from the Ollama library. No API key needed, no data leaves your machine. Auto-discovers running models."),
    "OpenAI Compatible": tr("Custom endpoints that mimic the OpenAI API. Use with any OpenAI-compatible service (vLLM, Together, etc.)."),
    "Minimax": tr("Minimax models (MiniMax-Text-01). API key required."),
    "Qwen": tr("Qwen models (Qwen-Plus, Qwen-Turbo). API key required."),
    "LM Studio": tr("Fully local. Connect to LM Studio's local inference server. No API key needed. Auto-discovers running models."),
  };

  const authGuide = {
    "Aura Cloud Models": "سجّل الدخول بحساب Aura Cloud من الإعدادات ← المزوّدون ← Aura Cloud. لا حاجة لمفتاح API منفصل — يتم استخدام رمز الجلسة المرتبط بحسابك.",
    "Anthropic": "أنشئ مفتاح API من console.anthropic.com، ثم الصقه في الإعدادات ← المزوّدون ← Anthropic واضغط 'تحقق'.",
    "OpenAI": "أنشئ مفتاح API من platform.openai.com/api-keys. يدعم أيضاً حسابات GitHub Copilot عبر تسجيل الدخول بـ OAuth.",
    "Google Gemini": "أنشئ مفتاح API من Google AI Studio (aistudio.google.com)، ثم أضفه في إعدادات المزوّد.",
    "DeepSeek": "أنشئ مفتاح API من platform.deepseek.com. الأسعار منخفضة جداً مقارنة بالمزودين الآخرين.",
    "Ollama": "ثبّت Ollama من ollama.ai، شغّل <code>ollama serve</code>، ثم اسحب نموذجاً بـ <code>ollama pull llama3</code>. لا حاجة لمفتاح API.",
    "OpenAI Compatible": "أدخل عنوان URL الأساسي (base URL) للخادم المتوافق مع OpenAI، ومفتاح API إن وجد.",
    "Minimax": "أنشئ مفتاح API من منصة Minimax الرسمية وأضفه في إعدادات المزوّد.",
    "Qwen": "أنشئ مفتاح API من منصة Alibaba Cloud DashScope وأضفه في إعدادات المزوّد.",
    "LM Studio": "ثبّت LM Studio من lmstudio.ai، حمّل نموذجاً، وشغّل الخادم المحلي من تبويب 'Local Server'. لا حاجة لمفتاح API.",
  };

  const colors = ["#c48b5c","#c2683f","#1a7f64","#3a6fc4","#4b5bb0","#7a5c8e","#1988a2","#a9761f","#a855f7","#e05c2b"];
  const colorDots = ["#c48b5c","#c2683f","#1a7f64","#3a6fc4","#4b5bb0","#7a5c8e","#1988a2","#a9761f","#a855f7","#e05c2b"];

  const body = `<div class="hero">
    <h1><span>${tr("Providers")}</span></h1>
    <p class="subtitle">${tr("Connect to 10 different AI providers — cloud-hosted models or fully local.")}</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${providers.length}</div><div class="lbl">${tr("Total Providers")}</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">${cloudCount}</div><div class="lbl">${tr("Cloud Providers")}</div></div>
      <div class="stat-card fade-in delay-3"><div class="num">${localCount}</div><div class="lbl">${tr("Local Providers")}</div></div>
    </div>
    <p>${tr("Aura Work supports 10 AI providers covering both cloud-hosted and local (Ollama, LM Studio, Custom Endpoint) models. Each provider has its own adapter that handles authentication, model discovery, and chat completions. Providers marked as local never send data off your machine.")}</p>

    <h2 style="margin-top:2rem">ما هي المزوّدات؟</h2>
    <p>المزوّدات هي الجسر بين Aura Work ونماذج الذكاء الاصطناعي. كل مزوّد ينفّذ واجهة موحدة تتعامل مع:</p>
    <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>المصادقة</strong> — مفاتيح API، رموز OAuth، أو اتصالات محلية</li>
      <li><strong>اكتشاف النماذج</strong> — اكتشاف تلقائي للنماذج المتوفرة</li>
      <li><strong>إكمالات المحادثة</strong> — إرسال الطلبات واستلام الردود</li>
      <li><strong>تتبع الاستخدام</strong> — عدّ الرموز (tokens) وتقدير التكلفة</li>
    </ul>

    ${providers.map((p, i) => {
      const desc = providerDesc[p.name] || "";
      return `<div class="detail-card fade-in delay-${(i % 4) + 1}">
        <h3><span style="display:inline-flex;width:10px;height:10px;border-radius:50%;background:${colorDots[i]};flex-shrink:0"></span> ${p.name}</h3>
        <div class="meta">
          ${p.models ? `<span>${p.models} نماذج</span>` : `<span>نماذج متعددة</span>`}
          <span class="local-badge ${p.local ? 'yes' : 'no'}">${p.local ? tr("Local") : tr("Cloud")}</span>
        </div>
        <p>${desc}</p>
        <p style="margin-top:.5rem;font-size:.8125rem;color:var(--color-text-weak)">🔑 ${authGuide[p.name] || ""}</p>
      </div>`;
    }).join("\n")}
  </section>
  <section class="section">
    <div class="section-label">مقارنة</div>
    <h2>محلي مقابل سحابي</h2>
    <table style="margin-top:.75rem">
      <thead><tr><th>المعيار</th><th>مزوّدات محلية</th><th>مزوّدات سحابية</th></tr></thead>
      <tbody>
        <tr><td><strong>الخصوصية</strong></td><td>كاملة — لا تغادر البيانات جهازك</td><td>تُرسل الطلبات لخوادم المزوّد</td></tr>
        <tr><td><strong>التكلفة</strong></td><td>مجانية بعد التثبيت</td><td>دفع لكل رمز (token) مستخدم</td></tr>
        <tr><td><strong>الجودة</strong></td><td>جيدة، تعتمد على قوة جهازك</td><td>الأفضل عادةً (نماذج ضخمة)</td></tr>
        <tr><td><strong>السرعة</strong></td><td>تعتمد على معدات الجهاز (GPU/CPU)</td><td>سريعة عادةً مع بنية تحتية قوية</td></tr>
        <tr><td><strong>الاتصال بالإنترنت</strong></td><td>غير مطلوب</td><td>مطلوب</td></tr>
        <tr><td><strong>الأفضل لـ</strong></td><td>بيانات حساسة، عمل بدون اتصال، توفير التكلفة</td><td>مهام معقدة، أفضل جودة ممكنة</td></tr>
      </tbody>
    </table>

    <h2 style="margin-top:2rem">اختيار النموذج المناسب</h2>
    <div class="detail-card">
      <h3>🎯 دليل اختيار النموذج</h3>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>للبرمجة المعقدة</strong> — Claude Sonnet 4 أو GPT-4o أو DeepSeek R1 (تفكير متقدم)</li>
        <li><strong>للمهام السريعة/البسيطة</strong> — Claude 3.5 Haiku أو GPT-4o mini أو Gemini 2.0 Flash</li>
        <li><strong>للسياق الطويل جداً</strong> — Gemini 2.5 Pro (نافذة سياق ضخمة)</li>
        <li><strong>للخصوصية القصوى</strong> — أي نموذج عبر Ollama أو LM Studio</li>
        <li><strong>لأقل تكلفة ممكنة</strong> — DeepSeek V3 أو نموذج محلي عبر Ollama</li>
      </ul>
    </div>
  </section>
  <section class="section">
    <div class="section-label">نظرة عامة على المزودين</div>
    <h2>المزودون المدعومون</h2>
    <p>يدعم Aura Work 10 مزودين لضمان المرونة القصوى. لكل مزود نقاط قوته:</p>
    <div class="detail-card">
      <h3>السحابيون (Cloud)</h3>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>OpenAI</strong> - GPT-4o, GPT-4.5, o1, o3. أداء متميز في البرمجة والتحليل</li>
        <li><strong>Anthropic</strong> - Claude Opus, Sonnet, Haiku. سياق طويل ورؤية حاسوبية</li>
        <li><strong>Google Gemini</strong> - Gemini 2.5 Pro, Flash. متعدد الوسائط ونماذج خفيفة</li>
        <li><strong>DeepSeek</strong> - DeepSeek-V3, R1. أداء قوي بتكلفة منخفضة</li>
        <li><strong>xAI Grok</strong> - Grok-3. نماذج متطورة من xAI</li>
      </ul>
    </div>
    <div class="detail-card">
      <h3>المحليون (Local)</h3>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>Ollama</strong> - LLama, Mistral, Gemma, Qwen. خصوصية كاملة</li>
        <li><strong>LM Studio</strong> - واجهة رسومية لتشغيل النماذج محليا</li>
        <li><strong>LocalAI</strong> - OpenAI-compatible API محلية</li>
      </ul>
    </div>
  </section>
  <section class="section">
    <div class="section-label">الأمان والموثوقية</div>
    <h2>حماية بيانات الاعتماد</h2>
    <p>تُشفَّر مفاتيح API باستخدام الخزنة المرتبطة بالجهاز قبل التخزين. تستخدم الخزنة:</p>
    <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>Windows</strong> — DPAPI (واجهة حماية البيانات)</li>
      <li><strong>macOS</strong> — Keychain</li>
      <li><strong>Linux</strong> — Secret Service (GNOME Keyring / KWallet)</li>
    </ul>
    <p style="margin-top:.75rem">بيانات الاعتماد لا تُسجَّل أبداً، ولا تُعرَض للوكيل، ولا تُدرَج في سجلات التدقيق.</p>

    <div class="detail-card">
      <h3>🔄 التراجع وإعادة المحاولة</h3>
      <p>إذا فشل مزوّد، يمكن لـ Aura Work إعادة المحاولة تلقائياً مع بديل:</p>
      <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> يفشل المزوّد الأساسي (حد المعدل، مهلة، خطأ)</li>
        <li><strong>2.</strong> يفحص النظام عن مزوّدين احتياطيين في إعداداتك</li>
        <li><strong>3.</strong> إذا وُجد احتياطي، يعيد المحاولة مع المزوّد البديل</li>
        <li><strong>4.</strong> إذا لم يوجد احتياطي، يُعلمك ويطلب تدخلاً يدوياً</li>
      </ol>
    </div>

    <div class="detail-card">
      <h3>💡 نصائح لتحسين التكلفة</h3>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>استخدم سياسة التكلفة أولاً</strong> للمهام الروتينية</li>
        <li><strong>أعدّ Ollama</strong> للتطوير والاختبار (مجاني)</li>
        <li><strong>استخدم DeepSeek</strong> لمهام الكود (أرخص من OpenAI/Anthropic)</li>
        <li><strong>راقب الاستخدام</strong> في لوحة التحكم لتحديد الأنماط المكلفة</li>
        <li><strong>عيّن حدوداً للرموز</strong> لكل مهمة لمنع التكاليف المتزايدة</li>
      </ul>
    </div>
  </section>
  <section class="section">
    <div class="section-label">التكوين</div>
    <h2>كيفية تكوين المزودين</h2>
    <p>استخدم الامر التالي لتكوين مزود:</p>
    <pre><code>aura config set providers.openai.apiKey sk-...
aura config set providers.anthropic.apiKey sk-ant-...</code></pre>
    <p>للمزودين المحليين:</p>
    <pre><code>aura config set providers.ollama.baseUrl http://localhost:11434
aura config set providers.ollama.model llama3.2</code></pre>
    <p>كل المفاتيح تخزن مشفرة باستخدام تشفير على مستوى النظام (Keytar على macOS، DPAPI على Windows، libsecret على Linux).</p>
  </section>`;
  return wrapPageAr(tr("Providers"), body, "providers");
}

function generateRoutingAr() {
  const routes = getRoutingPolicies();
  const body = `<div class="hero">
    <h1><span>${tr("Routing")}</span></h1>
    <p class="subtitle">${tr("How Aura Work picks the right model for every task")}</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${routes.length}</div><div class="lbl">${tr("Routing Policies")}</div></div>
    </div>
    <p>محرك التوجيه هو عقل عملية اختيار المزوّد في Aura Work. يقيّم كل مهمة بناءً على نوعها وحساسيتها والقدرات المطلوبة وسياستك المُعدّة لاختيار النموذج الأمثل. هذا يضمن حصولك دائماً على أفضل النتائج مع التحكم في التكلفة والخصوصية.</p>

    <h2 style="margin-top:2rem">كيف يعمل التوجيه</h2>
    <p>عند إرسال طلب، يقوم محرك التوجيه بـ:</p>
    <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2.5">
      <li><strong>1. تحليل المهمة</strong> — يحدد إذا كانت برمجة، بحثاً، عمل مستندات، تحليل بيانات، أتمتة متصفح، إلخ</li>
      <li><strong>2. فحص القدرات</strong> — هل تحتاج المهمة رؤية؟ استدعاء أدوات؟ سياقاً طويلاً؟ تفكيراً معقداً؟</li>
      <li><strong>3. تقييم الحساسية</strong> — هل البيانات عادية أم حساسة أم عالية المخاطر؟</li>
      <li><strong>4. تطبيق سياستك</strong> — الجودة أولاً، التكلفة أولاً، الخصوصية أولاً، محلي فقط، أو يدوي</li>
      <li><strong>5. اختيار النموذج</strong> — يختار أفضل توليفة مزوّد + نموذج</li>
      <li><strong>6. إرجاع قرار</strong> — يشمل النموذج المختار والتكلفة المقدرة ومستوى الثقة</li>
    </ol>

    <div class="detail-card">
      <h3>📊 أنواع المهام</h3>
      <p>يتعرف محرك التوجيه على أنواع المهام التالية:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>النوع</th><th>الوصف</th><th>أفضل المزوّدين</th></tr></thead>
        <tbody>
          <tr><td><code>coding</code></td><td>توليد الكود، إعادة الهيكلة، تصحيح الأخطاء</td><td>Anthropic، DeepSeek، OpenAI</td></tr>
          <tr><td><code>research</code></td><td>جمع المعلومات، التحليل</td><td>OpenAI، Gemini، Anthropic</td></tr>
          <tr><td><code>document</code></td><td>الكتابة، التحرير، التنسيق</td><td>OpenAI، Anthropic، Gemini</td></tr>
          <tr><td><code>data</code></td><td>تحليل البيانات، عمل جداول البيانات</td><td>OpenAI، Gemini، DeepSeek</td></tr>
          <tr><td><code>browser</code></td><td>تصفح الويب، ملء النماذج</td><td>OpenAI، Anthropic (رؤية)</td></tr>
          <tr><td><code>review</code></td><td>مراجعة الكود، الملاحظات</td><td>Anthropic، OpenAI</td></tr>
          <tr><td><code>security</code></td><td>تحليل الأمان، كشف الثغرات</td><td>Anthropic، OpenAI</td></tr>
          <tr><td><code>general</code></td><td>محادثة عامة، أسئلة وأجوبة</td><td>أي مزوّد</td></tr>
        </tbody>
      </table>
    </div>

    ${routes.map((r, i) => {
      const descMap = {
        "Quality First": tr("Prioritizes the most capable model for each task regardless of cost. Uses premium models for complex work, budget models for simple tasks."),
        "Cost First": tr("Optimizes for minimum cost while meeting capability requirements. Prefers cheaper models when they can handle the task."),
        "Privacy First": tr("Routes only to local providers (Ollama, LM Studio). Never sends data to cloud services. Falls back if no local models are available."),
        "Local Only": tr("Strictly local execution. Fails if no local provider is configured. Ideal for air-gapped environments."),
        "Manual": tr("User picks the provider and model explicitly for each session. No automatic routing."),
      };
      return `<div class="detail-card fade-in delay-${(i % 5) + 1}">
        <h3><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:4px;background:${i === 0 ? "#c2683f" : i === 3 ? "#1a7f64" : "#4b5bb0"};color:#fff;font-size:.625rem;font-family:var(--font-mono);flex-shrink:0">${i+1}</span> ${tr(r.label)}</h3>
        <p>${descMap[r.label]}</p>
      </div>`;
    }).join("\n")}
  </section>
  <section class="section">
    <div class="section-label">استراتيجيات التوجيه</div>
    <h2>خمس استراتيجيات توجيه</h2>
    <div class="detail-card">
      <h3>الجودة أولا (quality-first)</h3>
      <p>يوجه الطلب إلى أفضل مزود متاح. يستخدم مقاييس الجودة (دقة HumanEval، سرعة الاستجابة، إلخ). مناسب للمهام الحرجة.</p>
    </div>
    <div class="detail-card">
      <h3>التكلفة أولا (cost-first)</h3>
      <p>يختار أرخص مزود يلبي الحد الأدنى من الجودة. مناسب للمهام البسيطة أو معالجة البيانات الكبيرة.</p>
    </div>
    <div class="detail-card">
      <h3>الخصوصية أولا (privacy-first)</h3>
      <p>يفضل المزودين المحليين (Ollama، LM Studio). لا يرسل بيانات إلى السحابة. يتطلب مزودا محليا واحدا على الأقل.</p>
    </div>
    <div class="detail-card">
      <h3>محلي فقط (local-only)</h3>
      <p>يستخدم المزودين المحليين حصرا. يفشل إذا لم يتوفر أي مزود محلي. للبيئات المعزولة تماما.</p>
    </div>
    <div class="detail-card">
      <h3>يدوي (manual)</h3>
      <p>تحدد المزود والنموذج يدويا لكل طلب: <code>aura --provider openai --model gpt-4o</code></p>
    </div>
  </section>
  <section class="section">
    <div class="section-label">التكلفة والخصوصية</div>
    <h2>تحسين التكلفة</h2>
    <p>لتقليل تكاليف الذكاء الاصطناعي دون التضحية بالجودة:</p>
    <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>استخدم سياسة التكلفة أولاً</strong> للمهام الروتينية اليومية (تنسيق، بحث بسيط، أسئلة)</li>
      <li><strong>خصّص سياسة لكل مشروع</strong> — مشاريع الإنتاج تستخدم الجودة أولاً، بينما التجارب تستخدم التكلفة أولاً</li>
      <li><strong>راقب استخدام الرموز</strong> من لوحة التحكم لاكتشاف الأنماط المكلفة مبكراً</li>
      <li><strong>استخدم Ollama محلياً</strong> للتطوير والاختبار المتكرر بدون أي تكلفة</li>
      <li><strong>عيّن حدود تكلفة صارمة</strong> لكل مهمة أو لكل يوم لمنع الفواتير غير المتوقعة</li>
    </ul>

    <h2 style="margin-top:2rem">التوجيه القائم على الخصوصية</h2>
    <p>عند التعامل مع كود ملكية خاصة أو بيانات حساسة أو معلومات شخصية، سياسة <strong>الخصوصية أولاً</strong> تضمن عدم مغادرة أي بيانات لجهازك أبداً:</p>
    <div class="detail-card">
      <h3>🔒 كيف تعمل الخصوصية أولاً</h3>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li>يحلل محرك التوجيه حساسية البيانات في كل طلب (كلمات مرور، مفاتيح، بيانات شخصية)</li>
        <li>إذا اكتُشفت حساسية عالية، يُقصر التوجيه على المزوّدين المحليين فقط</li>
        <li>إذا لم يتوفر مزوّد محلي، تفشل المهمة بدلاً من إرسال بيانات حساسة للسحابة</li>
        <li>يمكنك فرض هذا السلوك دائماً عبر سياسة <strong>محلي فقط</strong> بغض النظر عن الحساسية المكتشفة</li>
      </ul>
    </div>
  </section>
  <section class="section">
    <div class="section-label">الإعدادات</div>
    <h2>إعداد التوجيه</h2>
    <p>اضبط سياسة التوجيه من <strong>الإعدادات ← التوجيه</strong>:</p>
    <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>1.</strong> اختر سياستك الافتراضية (تُطبَّق على جميع المهام ما لم تُستبدل)</li>
      <li><strong>2.</strong> اضبط سياسات لكل مشروع اختيارياً (تجاوز لمشاريع معينة)</li>
      <li><strong>3.</strong> اضبط مزوّدين احتياطيين (ماذا تستخدم إذا فشل الأساسي)</li>
      <li><strong>4.</strong> عيّن حدود تكلفة (أقصى رموز/تكلفة لكل مهمة)</li>
    </ol>

    <div class="detail-card">
      <h3>💡 متى تستخدم كل سياسة</h3>
      <table style="margin-top:.75rem">
        <thead><tr><th>السياسة</th><th>الأفضل لـ</th><th>المقايضات</th></tr></thead>
        <tbody>
          <tr><td><strong>الجودة أولاً</strong></td><td>مهام مهمة، كود إنتاجي، عمل العملاء</td><td>تكلفة أعلى، أبطأ</td></tr>
          <tr><td><strong>التكلفة أولاً</strong></td><td>مهام روتينية، تطوير، اختبار</td><td>قد يستخدم نماذج أضعف</td></tr>
          <tr><td><strong>الخصوصية أولاً</strong></td><td>بيانات حساسة، كود ملكية خاصة، معلومات شخصية</td><td>محدود بالنماذج المحلية</td></tr>
          <tr><td><strong>محلي فقط</strong></td><td>عمل بدون اتصال، بيئات معزولة تماماً</td><td>يتطلب معدات محلية</td></tr>
          <tr><td><strong>يدوي</strong></td><td>التعلم، مقارنة المزوّدين، احتياجات نموذج محدد</td><td>سير عمل أبطأ</td></tr>
        </tbody>
      </table>
    </div>

    <div class="detail-card">
      <h3>🔄 سلسلة التراجع (Fallback)</h3>
      <p>إذا فشل المزوّد الأساسي، يحاول محرك التوجيه البدائل:</p>
      <pre><code>// مثال على إعداد التراجع
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
      <p style="margin-top:.75rem">يحاول المحرك كل بديل بالترتيب حتى ينجح أحدها. إذا فشلت جميعها، يُعلمك ويطلب تدخلاً يدوياً.</p>
    </div>
  </section>`;
  return wrapPageAr(tr("Routing"), body, "routing");
}

function generateSkillsAr() {
  const skills = getSkills();
  const categories = [...new Set(skills.flatMap(s => s.categories || []))].sort();
  const catMapping = {
    "Development": "تطوير",
    "Research": "البحث الاستقصائي",
    "Data": "البيانات",
    "Utility": "الأدوات المساعدة",
    "System": "النظام",
    "Design": "التصميم",
    "Marketing": "التسويق",
    "Writing": "الكتابة",
    "Security": "الأمان",
    "Automation": "الأتمتة"
  };
  const trCat = (cat) => catMapping[cat] || cat;

  const body = `<div class="hero">
    <h1><span>${tr("Skills")}</span></h1>
    <p class="subtitle">${skills.length} ${tr("pre-built agent skills from the registry")}</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${skills.length}</div><div class="lbl">${tr("Total Skills")}</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">${categories.length}</div><div class="lbl">الفئات</div></div>
      <div class="stat-card fade-in delay-3"><div class="num">${skills.filter(s => (s.risk||"low")==='low').length}</div><div class="lbl">مخاطرة منخفضة</div></div>
    </div>
    <p>المهارات هي آلية التوسّع الأساسية في Aura Work. كل مهارة هي <strong>بيان JSON مُرقّم بإصدار</strong> يحدد قدرة معينة يمكن للوكيل استخدامها — من إنشاء المستندات وجداول البيانات إلى أتمتة المتصفحات وتحليل البيانات. تُنشر المهارات في السجل ضمن <code>registry/skills/</code> ويمكن تثبيتها من السوق.</p>

    <h2 style="margin-top:2rem">ما هي المهارة؟</h2>
    <p>المهارة قدرة وكيل قائمة بذاتها تتضمن:</p>
    <ul style="padding-right:1.25rem;margin-bottom:1.5rem;line-height:2">
      <li><strong>الهوية</strong> — معرّف فريد واسم وإصدار وناشر</li>
      <li><strong>الفئات</strong> — وسوم للتصفية (مستندات، كود، بيانات، متصفح، إلخ)</li>
      <li><strong>الأدوات</strong> — الدوال الفعلية التي يمكن للوكيل استدعاؤها</li>
      <li><strong>الأذونات</strong> — ما تحتاج المهارة للوصول إليه (ملفات، shell، متصفح، إلخ)</li>
      <li><strong>مستوى المخاطرة</strong> — منخفض أو متوسط أو عالٍ حسب الأذونات المطلوبة</li>
      <li><strong>تعليمات التثبيت</strong> — كيفية إعداد المهارة</li>
    </ul>

    <div class="detail-card">
      <h3>🎯 كيف تعمل المهارات</h3>
      <p>عندما تطلب من الوكيل تنفيذ مهمة، يحلل طلبك ويحدد المهارات المطلوبة. ثم يحمّل الوكيل بيان المهارة، يفحص الأذونات، وينفذ الأدوات المطلوبة. كل استدعاء أداة يمر عبر بوابة الأذونات — إذا احتاجت المهارة وصولاً للملفات أو أوامر shell، سيُطلب منك الموافقة (ما لم يكن ملف التعريف مضبوطاً على السماح التلقائي).</p>
      <p style="margin-top:.75rem">المهارات <strong>معزولة (sandboxed)</strong> — يمكنها الوصول فقط لما يعلنه بيانها. مهارة المستندات لا يمكنها تنفيذ أوامر shell ما لم يُمنح ذلك صراحة. هذا يضمن الأمان حتى مع مهارات الطرف الثالث من السوق.</p>
    </div>

    <div class="detail-card">
      <h3>🔧 استخدام المهارات</h3>
      <p>تُستخدم المهارات تلقائياً عند تفاعلك مع الوكيل. على سبيل المثال:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>"أنشئ تقرير PDF"</strong> ← يستخدم الوكيل مهارة <code>aura-pdf</code></li>
        <li><strong>"حلّل هذا الجدول"</strong> ← يستخدم الوكيل مهارة <code>aura-spreadsheets</code></li>
        <li><strong>"تصفح هذا الموقع واستخرج البيانات"</strong> ← يستخدم الوكيل مهارة <code>aura-browser-assistant</code></li>
        <li><strong>"حوّل هذه الصورة إلى WebP"</strong> ← يستخدم الوكيل مهارة <code>aura-file-converter</code></li>
      </ul>
      <p style="margin-top:.75rem">يمكنك أيضاً طلب مهارة باسمها صراحة: <code>"استخدم مهارة البحث للعثور على معلومات حول..."</code></p>
    </div>

    <div class="detail-card">
      <h3>📋 صيغة بيان المهارة</h3>
      <p>تُعرَّف كل مهارة في ملف JSON بهذا الهيكل:</p>
      <pre><code>{
  "id": "aura-documents",
  "name": "Documents",
  "version": "1.0.0",
  "summary": "إنشاء وتحرير وتنسيق المستندات",
  "description": "معالجة مستندات كاملة تشمل...",
  "publisher": "aura-work",
  "categories": ["documents", "productivity"],
  "risk": "low",
  "permissions": [
    { "category": "file", "action": "write", "target": "*.md" }
  ],
  "tools": [
    {
      "name": "create_document",
      "description": "إنشاء مستند جديد",
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
      <h3>🏗️ إنشاء مهارات مخصصة</h3>
      <p>يمكنك إنشاء مهاراتك الخاصة باتباع هذه الخطوات:</p>
      <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> أنشئ ملف JSON جديد في <code>registry/skills/</code></li>
        <li><strong>2.</strong> عرّف هوية المهارة (معرّف، اسم، إصدار، ناشر)</li>
        <li><strong>3.</strong> أضف الفئات وحدد مستوى المخاطرة</li>
        <li><strong>4.</strong> صرّح بالأذونات المطلوبة (ملفات، shell، متصفح، إلخ)</li>
        <li><strong>5.</strong> عرّف الأدوات مع معاملاتها وأوصافها</li>
        <li><strong>6.</strong> أضف تعليمات التثبيت إذا لزم</li>
        <li><strong>7.</strong> تحقق باستخدام <code>node scripts/validate-marketplace-manifests.js</code></li>
        <li><strong>8.</strong> أرسل طلب سحب (PR) إلى السجل</li>
      </ol>
      <p style="margin-top:.75rem">راجع <code>registry/skills/aura-documents.json</code> كمثال كامل.</p>
    </div>

    <div class="detail-card">
      <h3>📊 شرح مستويات المخاطرة</h3>
      <p>كل مهارة لها مستوى مخاطرة حسب الأذونات المطلوبة:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>المستوى</th><th>الوصف</th><th>مثال</th></tr></thead>
        <tbody>
          <tr><td><code>low</code></td><td>وصول للقراءة فقط، بدون آثار جانبية</td><td>البحث، تحليل البيانات</td></tr>
          <tr><td><code>medium</code></td><td>كتابة الملفات، طلبات الشبكة</td><td>إنشاء المستندات، أتمتة المتصفح</td></tr>
          <tr><td><code>high</code></td><td>تنفيذ shell، وصول للنظام</td><td>الأتمتة، عمليات الآلة الافتراضية</td></tr>
        </tbody>
      </table>
      <p style="margin-top:.75rem">المهارات عالية المخاطرة تتطلب موافقة صريحة في وضع <code>ask-first</code>. يمكنك ضبط الموافقة التلقائية لفئات معينة من الإعدادات ← الأذونات.</p>
    </div>

    <div class="detail-card">
      <h3>🏪 السوق (Marketplace)</h3>
      <p>يجمّع السوق (<code>registry/marketplace.json</code>) المهارات وخوادم MCP والإضافات. كل إدخال يشمل:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>أوصاف مترجمة</strong> — متوفرة بـ 20 لغة</li>
        <li><strong>أيقونات وصور غلاف</strong> — أصول SVG في <code>registry/assets/</code></li>
        <li><strong>سجل الإصدارات</strong> — للتحديثات والتراجع</li>
        <li><strong>توثيق الناشر</strong> — مهارات رسمية مقابل مهارات مجتمعية</li>
        <li><strong>معلومات التوافق</strong> — الحد الأدنى لإصدار Aura Work المطلوب</li>
      </ul>
      <p style="margin-top:.75rem">ثبّت المهارات من لوحة الإضافات في تطبيق سطح المكتب أو استخدم CLI: <code>aura skill install &lt;skill-id&gt;</code></p>
    </div>

    <div class="section-label">تصفية حسب الفئة</div>
    <div class="skills-filter">
      <button class="filter-btn active" onclick="filterSkills('all')">الكل</button>
      ${categories.map(c => `<button class="filter-btn" onclick="filterSkills('${c}')">${trCat(c)}</button>`).join(" ")}
    </div>

    <div class="section-label">${tr("Skills")}</div>
    <div class="card-grid">
      ${skills.map((s, i) => `<div class="detail-card fade-in delay-${(i % 4) + 1}" data-category="${(s.categories || []).join(',')}">
        <h3><span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:#7a5c8e;color:#fff;font-size:.75rem;font-family:var(--font-mono);flex-shrink:0">${(s.name || s.id || "?").charAt(0).toUpperCase()}</span> ${s.name || s.id}</h3>
        <div class="meta">
          <span>v${s.version || "?"}</span>
          <span>${tr("Risk Level")}: ${tr(s.risk || "low")}</span>
          <span>${s.categories ? s.categories.map(trCat).join("، ") : ""}</span>
        </div>
        <p>${s.summary || s.description || ""}</p>
        ${s.tools && s.tools.length ? `<div style="margin-top:.5rem"><strong style="font-size:.75rem;font-family:var(--font-mono);color:var(--color-text-weak)">الأدوات:</strong> ${s.tools.map(t => `<code>${t.name}</code>`).join(" ")}</div>` : ""}
      </div>`).join("\n")}
    </div>
  </section>
  <section class="section">
    <div class="section-label">مهارات مدمجة</div>
    <h2>المهارات الاساسية</h2>
    <div class="detail-card">
      <h3>web-search</h3>
      <p>يبحث في الويب ويستخرج معلومات حديثة مع روابط المصادر. يدعم محركات بحث متعددة.</p>
    </div>
  </section>`;
  return wrapPageAr(tr("Skills"), body, "skills");
}

function generateLanguagesAr() {
  const languages = getLanguages();
  const rtlLanguages = ["ar", "fa"];

  const langNames = {
    ar: "العربية", de: "Deutsch", en: "English", es: "Español", fa: "فارسی",
    fr: "Français", hi: "हिन्दी", id: "Bahasa Indonesia", it: "Italiano",
    ja: "日本語", ko: "한국어", nl: "Nederlands", pl: "Polski", pt: "Português",
    ru: "Русский", th: "ไทย", tr: "Türkçe", vi: "Tiếng Việt",
    "zh-CN": "简体中文", "zh-TW": "繁體中文",
  };

  const body = `<div class="hero">
    <h1><span>${tr("Languages")}</span></h1>
    <p class="subtitle">${languages.length} ${tr("human languages with full RTL support for Arabic and Persian.")}</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${languages.length}</div><div class="lbl">${tr("Languages")}</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">${rtlLanguages.length}</div><div class="lbl">${tr("RTL Languages")}</div></div>
    </div>
    <p>${tr("Aura Work is built for a global audience. The i18n system uses TypeScript source catalogs that emit Weblate-compatible JSON files. Adding a new language is a single PR away.")}</p>

    <h2 style="margin-top:2rem">لماذا يهم التدويل (i18n)</h2>
    <p>يُستخدم Aura Work من قِبل مطورين حول العالم. من خلال دعم ${languages.length} لغة، نضمن ما يلي:</p>
    <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>سهولة الوصول</strong> — يمكن للمطورين استخدام الأداة بلغتهم الأم</li>
      <li><strong>الشمولية</strong> — لغات الكتابة من اليمين لليسار (العربية، الفارسية) مدعومة بالكامل</li>
      <li><strong>المجتمع</strong> — يمكن للمساهمين إضافة ترجمات للغتهم</li>
      <li><strong>الانتشار العالمي</strong> — يمكن استخدام الأداة في أي بلد</li>
    </ul>

    <div class="section-label">${tr("Supported Languages")}</div>
    <div class="lang-grid">${languages.map(l => `<a href="https://github.com/hbx12/aura-work/blob/main/packages/i18n/locales/${l}.json" class="lang-badge fade-in" style="animation: fadeIn .4s ease forwards">${langNames[l] || l} ${rtlLanguages.includes(l) ? `<span class="rtl-mark">${tr("RTL")}</span>` : ""}</a>`).join("\n")}</div>
  </section>
  <section class="section">
    <div class="section-label">${tr("Architecture")}</div>
    <h2>${tr("How i18n works")}</h2>
    <p>يستخدم نظام التدويل هيكلية طبقية مبنية بـ TypeScript:</p>
    <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2.5">
      <li><strong>1. كتالوج المصدر</strong> — سلاسل الترجمة تُعرَّف في <code>packages/i18n/src/catalog.ts</code> ككائن TypeScript مُنمَّط</li>
      <li><strong>2. خطوة البناء</strong> — تشغيل <code>npm run build:locales</code> يُصدِر ملفات JSON إلى <code>packages/i18n/locales/</code></li>
      <li><strong>3. التحميل وقت التشغيل</strong> — يكتشف التطبيق لغة النظام عند التشغيل الأول ويحمّل ملف JSON المناسب</li>
      <li><strong>4. الرجوع الافتراضي</strong> — إذا كانت الترجمة مفقودة، يرجع النظام إلى الإنجليزية</li>
    </ol>

    <div class="detail-card">
      <h3>🌐 إضافة لغة جديدة</h3>
      <p>المساهمة بلغة جديدة عملية مباشرة:</p>
      <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> انسخ <code>packages/i18n/locales/en.json</code> إلى ملف جديد (مثلاً <code>hi.json</code> للهندية)</li>
        <li><strong>2.</strong> ترجم القيم فقط — أبقِ جميع المفاتيح بالإنجليزية</li>
        <li><strong>3.</strong> أضف لغتك إلى <code>SUPPORTED_LOCALES</code> في <code>packages/i18n/src/catalog.ts</code></li>
        <li><strong>4.</strong> شغّل <code>npm run build:locales -w @aura-os/i18n</code></li>
        <li><strong>5.</strong> اختبر ترجماتك في التطبيق</li>
        <li><strong>6.</strong> أرسل طلب سحب (PR) بالتغييرات</li>
      </ol>
      <p style="margin-top:.75rem">يستخدم المشروع <a href="https://weblate.org" style="color:var(--color-accent)">Weblate</a> للترجمات المجتمعية. يمكنك المساهمة بالترجمات عبر Weblate أو مباشرة عبر PR.</p>
    </div>

    <div class="detail-card">
      <h3>📐 دعم RTL</h3>
      <p>تستخدم العربية والفارسية تخطيط <code>dir="rtl"</code>. يشمل دعم RTL:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>اتجاه التخطيط</strong> — تنعكس الواجهة بأكملها أفقياً</li>
        <li><strong>محاذاة النص</strong> — يُحاذى النص لليمين</li>
        <li><strong>التنقل</strong> — الشريط الجانبي والقوائم تعكس اتجاهها</li>
        <li><strong>الطباعة</strong> — خطوط IBM Plex Sans Arabic و Tajawal</li>
        <li><strong>الأيقونات</strong> — الأيقونات الاتجاهية تُعكس (الأسهم، الشيفرونات)</li>
        <li><strong>الحركات</strong> — حركات الانزلاق تحترم اتجاه RTL</li>
      </ul>
      <p style="margin-top:.75rem">يتضمن نظام التصميم طباعة عربية صحيحة مع استبدال خطوط مدمج للمحتوى ثنائي اللغة.</p>
    </div>

    <div class="detail-card">
      <h3>🔧 مفاتيح الترجمة</h3>
      <p>تتبع مفاتيح الترجمة هيكلية هرمية:</p>
      <pre><code>{
  "common": {
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف"
  },
  "dashboard": {
    "title": "لوحة التحكم",
    "welcome": "مرحباً بعودتك، {{name}}",
    "stats": {
      "tasks": "المهام",
      "projects": "المشاريع"
    }
  },
  "errors": {
    "network": "خطأ في الشبكة. يرجى التحقق من الاتصال.",
    "auth": "فشلت المصادقة. يرجى تسجيل الدخول مجدداً."
  }
}</code></pre>
      <p style="margin-top:.75rem">استخدم الترميز النقطي للإشارة للمفاتيح: <code>t('dashboard.stats.tasks')</code>. المتغيرات تُحاط بأقواس معقوفة مزدوجة: <code>{{name}}</code>.</p>
    </div>

    <div class="detail-card">
      <h3>📝 أفضل ممارسات الترجمة</h3>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>أبقِ المفاتيح بالإنجليزية</strong> — ترجم القيم فقط</li>
        <li><strong>استخدم العناصر النائبة</strong> — للمحتوى الديناميكي (مثل <code>{{count}}</code>)</li>
        <li><strong>راعِ السياق</strong> — بعض الكلمات لها ترجمات مختلفة حسب السياق</li>
        <li><strong>اختبر جيداً</strong> — تحقق من فيض النص ومشاكل المحاذاة</li>
        <li><strong>استخدم Weblate</strong> — للترجمات المجتمعية والاتساق</li>
        <li><strong>راجع الترجمات الموجودة</strong> — تفقد <code>en.json</code> للقائمة الكاملة</li>
      </ul>
    </div>
  </section>
  <section class="section">
    <div class="section-label">المساهمة</div>
    <h2>كيف تساهم بلغة جديدة</h2>
    <p>يمكن لأي شخص إضافة لغة جديدة إلى Aura Work. العملية بسيطة ومفتوحة للجميع:</p>
    <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>1.</strong> افتح نقاشاً أو مشكلة (issue) على GitHub لإعلام الفريق برغبتك بإضافة لغة</li>
      <li><strong>2.</strong> اتبع دليل "إضافة لغة جديدة" أعلاه لإنشاء ملف الترجمة</li>
      <li><strong>3.</strong> استخدم أدوات الترجمة الآلية كنقطة بداية، ثم راجعها يدوياً لضمان الدقة والسياق الثقافي</li>
      <li><strong>4.</strong> اختبر لغتك في جميع صفحات التطبيق للتأكد من عدم وجود نصوص مقطوعة</li>
      <li><strong>5.</strong> أرسل طلب السحب وانتظر مراجعة الفريق</li>
    </ol>
    <p style="margin-top:.75rem">جميع المساهمات مُقدَّرة، سواء كانت ترجمة كاملة أو تصحيحات بسيطة على ترجمات موجودة.</p>
  </section>`;
  return wrapPageAr(tr("Languages"), body, "languages");
}

function generateThemesAr() {
  const themes = getThemes();
  const lightThemes = themes.filter(t => t.includes("light") || t === "light" || t.includes("sepia") || t.includes("warm-light"));
  const darkThemes = themes.filter(t => t.includes("dark") || t === "dark");
  const specialThemes = themes.filter(t => t === "amoled" || t.includes("high-contrast"));

  const body = `<div class="hero">
    <h1><span>${tr("Themes")}</span></h1>
    <p class="subtitle">${themes.length} ${tr("hand-crafted visual themes with light, dark, amoled variants")}</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${themes.length}</div><div class="lbl">${tr("Total Themes")}</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">${lightThemes.length}</div><div class="lbl">${tr("Light themes")}</div></div>
      <div class="stat-card fade-in delay-3"><div class="num">${darkThemes.length}</div><div class="lbl">${tr("Dark themes")}</div></div>
      <div class="stat-card fade-in delay-4"><div class="num">${specialThemes.length}</div><div class="lbl">${tr("Special themes")}</div></div>
    </div>
    <p>كل ثيم يستخدم <strong>ألواناً صلبة مسطحة دون تدرجات</strong> — فلسفة تصميم مستوحاة من مساحات العمل المشتركة الدافئة والهادئة. رموز التصميم مبنية بخصائص CSS المخصصة، مما يجعل الثيمات قابلة للتركيب بالكامل.</p>

    <h2 style="margin-top:2rem">فئات الثيمات</h2>
    <p>تُصنَّف الثيمات إلى فئات:</p>
    <table style="margin-top:.75rem">
      <thead><tr><th>الفئة</th><th>الوصف</th><th>أمثلة</th></tr></thead>
      <tbody>
        <tr><td><strong>قياسي</strong></td><td>ثيمات نظيفة واحترافية للاستخدام اليومي</td><td>light، dark، amoled</td></tr>
        <tr><td><strong>ملوّن</strong></td><td>ثيمات نابضة بألوان مميزة</td><td>blue، forest، ocean، sunset</td></tr>
        <tr><td><strong>فاخر</strong></td><td>ثيمات مميزة بألوان غنية وراقية</td><td>mocha، lavender، peach</td></tr>
        <tr><td><strong>خاص</strong></td><td>ثيمات فريدة لأمزجة أو بيئات محددة</td><td>gruvbox، nord، sepia</td></tr>
        <tr><td><strong>إمكانية الوصول</strong></td><td>ثيمات عالية التباين لقراءة أفضل</td><td>high-contrast</td></tr>
        <tr><td><strong>النظام</strong></td><td>يكتشف تفضيل نظام التشغيل تلقائياً (فاتح/داكن)</td><td>system</td></tr>
      </tbody>
    </table>

    <div class="section-label">${tr("Theme Categories")}</div>
    <h2>${tr("Light themes")}</h2>
    <div class="lang-grid">${lightThemes.map(t => `<span class="lang-badge">${t}</span>`).join("\n")}</div>
    <h2>${tr("Dark themes")}</h2>
    <div class="lang-grid">${darkThemes.map(t => `<span class="lang-badge">${t}</span>`).join("\n")}</div>
    <h2>${tr("Special themes")}</h2>
    <div class="lang-grid">${specialThemes.map(t => `<span class="lang-badge">${t}</span>`).join("\n")}</div>
  </section>
  <section class="section">
    <div class="section-label">${tr("Architecture")}</div>
    <h2>${tr("How themes work")}</h2>
    <p>${tr("Aura Work uses a layered token architecture: design tokens cascade from primitives → semantic → component levels. This enables consistent theming across all UI components.")}</p>
    <div class="detail-card"><h3>${tr("Primitive tokens")}</h3><p>${tr("Define raw colors, spacing, typography")}</p></div>
    <div class="detail-card"><h3>${tr("Semantic tokens")}</h3><p>${tr("Map primitives to semantic roles (bg, text, border, accent)")}</p></div>
    <div class="detail-card"><h3>${tr("Component tokens")}</h3><p>${tr("Fine-grained overrides per component (button, card, input)")}</p></div>
    <h2 style="margin-top:2rem">${tr("Theme Switching")}</h2>
    <p>${tr("Themes are applied dynamically via CSS custom properties. Switching between light, dark, amoled, or any of the 35+ themes is instantaneous — no page reload needed.")}</p>

    <div class="detail-card">
      <h3>🎨 الألوان الأساسية (Primitives)</h3>
      <p>لوحة ألوان دافئة قائمة على الطين تشمل:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>محايدات رملية</strong> — رماديات دافئة للخلفيات والنصوص</li>
        <li><strong>لون التمييز الطيني (Terracotta)</strong> — لون تمييز واحد يتغير بين الوضعين الفاتح والداكن</li>
        <li><strong>أخضر دلالي</strong> — لحالات النجاح والتأكيدات</li>
        <li><strong>عنبري للتحذيرات</strong> — لحالات الحذر والتنبيهات</li>
        <li><strong>أحمر للأخطاء</strong> — لحالات الخطأ والإجراءات المدمرة</li>
      </ul>
      <p style="margin-top:.75rem">لون التمييز يتحول بين الوضعين الفاتح والداكن مع الحفاظ على نفس الطابع الدافئ.</p>
    </div>

    <div class="detail-card">
      <h3>📝 جدول رموز CSS المخصصة</h3>
      <p>تستخدم الثيمات خصائص CSS مخصصة لكل الألوان:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>الرمز</th><th>الوصف</th><th>مثال (فاتح)</th></tr></thead>
        <tbody>
          <tr><td><code>--color-bg</code></td><td>خلفية الصفحة الأساسية</td><td>#faf9f5</td></tr>
          <tr><td><code>--color-bg-card</code></td><td>خلفية البطاقات والعناصر المرتفعة</td><td>#ffffff</td></tr>
          <tr><td><code>--color-text</code></td><td>لون النص الأساسي</td><td>#5c5544</td></tr>
          <tr><td><code>--color-text-strong</code></td><td>نص العناوين البارزة</td><td>#28241d</td></tr>
          <tr><td><code>--color-accent</code></td><td>لون التمييز والروابط والأزرار الأساسية</td><td>#c2683f</td></tr>
          <tr><td><code>--color-success</code></td><td>حالات النجاح</td><td>#4f7d47</td></tr>
          <tr><td><code>--color-warning</code></td><td>حالات التحذير</td><td>#a9761f</td></tr>
          <tr><td><code>--color-danger</code></td><td>حالات الخطأ</td><td>#b8482f</td></tr>
          <tr><td><code>--shadow-md</code></td><td>ظل متوسط للبطاقات</td><td>0 4px 16px rgba(...)</td></tr>
        </tbody>
      </table>
      <pre><code>:root {
  /* الخلفيات */
  --color-bg: #faf9f5;
  --color-bg-weak: #f5f3ec;
  --color-bg-card: #ffffff;
  --color-bg-strong: #1e1b16;

  /* النصوص */
  --color-text: #5c5544;
  --color-text-weak: #938a76;
  --color-text-strong: #28241d;

  /* التمييز */
  --color-accent: #c2683f;
  --color-accent-warm: #cf7a52;
  --color-accent-subtle: rgba(194, 104, 63, 0.11);

  /* دلالية */
  --color-success: #4f7d47;
  --color-warning: #a9761f;
  --color-danger: #b8482f;
}</code></pre>
      <p style="margin-top:.75rem">تجاوز هذه الخصائص في ثيمك المخصص لتغيير المظهر بأكمله.</p>
    </div>

    <div class="detail-card">
      <h3>☀️🌙 الوضع الفاتح والداكن</h3>
      <p>كل ثيم في Aura Work له نسخة فاتحة وأخرى داكنة (مثل <code>ocean-light</code> و <code>ocean-dark</code>). يتم التبديل بينهما فورياً دون إعادة تحميل الصفحة. ثيم <code>system</code> الخاص يتبع تلقائياً تفضيل نظام التشغيل عبر خاصية <code>prefers-color-scheme</code> ويبدّل تلقائياً عند تغيير إعدادات الجهاز (مثلاً غروب الشمس في macOS).</p>
    </div>

    <div class="detail-card">
      <h3>🔧 إنشاء ثيمات مخصصة</h3>
      <p>أنشئ ثيمك الخاص باتباع هذه الخطوات:</p>
      <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> انسخ ثيماً موجوداً (مثل <code>light.css</code>)</li>
        <li><strong>2.</strong> تجاوز خصائص CSS المخصصة بألوانك</li>
        <li><strong>3.</strong> أضف ثيمك إلى <code>packages/ui/src/themes/</code></li>
        <li><strong>4.</strong> سجّله في قائمة الثيمات</li>
        <li><strong>5.</strong> اختبره في الوضعين الفاتح والداكن</li>
        <li><strong>6.</strong> أرسل طلب سحب (PR)</li>
      </ol>
      <p style="margin-top:.75rem">راجع <code>packages/ui/src/themes/</code> لكل ملفات الثيمات.</p>
    </div>

    <div class="detail-card">
      <h3>📱 RTL وإمكانية الوصول</h3>
      <p>يتضمن نظام الثيمات:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>ثيم عالي التباين</strong> — لإمكانية الوصول (متوافق مع WCAG AA)</li>
        <li><strong>دعم RTL كامل</strong> — للعربية والفارسية</li>
        <li><strong>اكتشاف تفضيل النظام</strong> — عبر <code>prefers-color-scheme</code></li>
        <li><strong>تقليل الحركة</strong> — يحترم <code>prefers-reduced-motion</code></li>
        <li><strong>تحجيم الخط</strong> — يدعم تعديلات حجم الخط في المتصفح</li>
      </ul>
    </div>
  </section>
  <section class="section">
    <div class="section-label">السمات المخصصة</div>
    <h2>انشاء سمة مخصصة يدوياً</h2>
    <p>يمكنك انشاء سمة مخصصة بتعريف مجموعة من متغيرات CSS. ضع ملف السمة في <code>~/.config/aura/themes/</code> وسيتم تحميله تلقائيا.</p>
    <pre><code>{
  "name": "my-theme",
  "colors": {
    "bg-primary": "#1a1b26",
    "fg-primary": "#c0caf5",
    "accent": "#7aa2f7"
  }
}</code></pre>
    <p style="margin-top:1rem">يمكنك تصدير السمات ومشاركتها مع المجتمع. السمات المميزة من المجتمع تضاف إلى المعرض الرسمي.</p>
  </section>`;
  return wrapPageAr(tr("Themes"), body, "themes");
}

function generatePermissionsAr() {
  const profiles = getPermissionProfiles();
  const body = `<div class="hero">
    <h1><span>الأذونات</span></h1>
    <p class="subtitle">نظام أذونات دقيق قائم على الملفات الشخصية — أنت تتحكم فيما يمكن للوكلاء الوصول إليه.</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${profiles.length}</div><div class="lbl">ملف أذونات</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">ask-first</div><div class="lbl">الوضع الافتراضي</div></div>
    </div>
    <p>Aura Work يستخدم <strong>نظام أذونات ثلاثي المستويات</strong> للتحكم فيما يمكن للوكيل فعله. كل إجراء مصنف (ملفات، shell، متصفح، شبكة، إلخ) ويتم فحصه مقابل ملف الأذونات النشط. هذا يضمن أن الوكيل لا يمكنه أبداً فعل شيء لم توافق عليه.</p>
    
    <h2 style="margin-top:2rem">لماذا الأذونات مهمة</h2>
    <p>وكلاء AI أقوياء — يمكنهم قراءة/كتابة الملفات، تنفيذ أوامر shell، تصفح الويب، والتفاعل مع الخدمات الخارجية. بدون ضوابط مناسبة، يمكن للوكيل:</p>
    <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li>تعديل أو حذف ملفات مهمة</li>
      <li>تنفيذ أوامر shell مدمرة</li>
      <li>إرسال بيانات لخدمات خارجية</li>
      <li>تثبيت برامج غير مرغوب فيها</li>
      <li>إجراء استدعاءات API غير مصرح بها</li>
    </ul>
    <p style="margin-top:.75rem">نظام الأذونات يمنع هذا بطلب موافقة صريحة للإجراءات عالية التأثير. أنت تبقى مسيطراً في جميع الأوقات.</p>

    <div class="detail-card">
      <h3>🔐 مستويات الأذونات الثلاثة</h3>
      <table style="margin-top:.75rem">
        <thead><tr><th>المستوى</th><th>الوصف</th><th>حالة الاستخدام</th></tr></thead>
        <tbody>
          <tr><td><code>read-only</code></td><td>الوكيل يمكنه فقط قراءة الملفات والبيانات. لا تعديلات.</td><td>مراجعة الكود، البحث، التحليل</td></tr>
          <tr><td><code>ask-first</code></td><td>الوكيل يسأل قبل كل إجراء عالي التأثير. أنت توافق أو ترفض.</td><td>الوضع الافتراضي، تحكم متوازن</td></tr>
          <tr><td><code>full-access</code></td><td>الوكيل يمكنه فعل أي شيء بدون سؤال. استخدم بحذر.</td><td>أتمتة موثوقة، CI/CD</td></tr>
        </tbody>
      </table>
    </div>

    <div class="detail-card">
      <h3>📋 فئات الأذونات</h3>
      <p>الإجراءات مجمعة في فئات للتحكم الدقيق:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>الفئة</th><th>تتحكم في</th><th>أمثلة</th></tr></thead>
        <tbody>
          <tr><td><code>file</code></td><td>عمليات قراءة/كتابة الملفات</td><td>قراءة الكود، كتابة ملفات جديدة، حذف ملفات</td></tr>
          <tr><td><code>shell</code></td><td>تنفيذ أوامر shell</td><td>npm install، تشغيل سكريبتات، ترجمة كود</td></tr>
          <tr><td><code>browser</code></td><td>أتمتة المتصفح</td><td>تصفح المواقع، ملء النماذج، استخراج البيانات</td></tr>
          <tr><td><code>network</code></td><td>طلبات الشبكة</td><td>استدعاءات API، تنزيلات، webhooks</td></tr>
          <tr><td><code>git</code></td><td>عمليات Git</td><td>Commit، push، branch، merge</td></tr>
          <tr><td><code>plugin</code></td><td>استدعاءات MCP/الإضافات</td><td>استدعاء أدوات MCP، تشغيل دوال الإضافات</td></tr>
          <tr><td><code>computer-use</code></td><td>أتمتة سطح المكتب</td><td>نقر، كتابة، لقطة شاشة، تحكم بالتطبيقات</td></tr>
        </tbody>
      </table>
    </div>

    ${profiles.map((p, i) => `<div class="detail-card fade-in delay-${i+1}">
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <div style="margin-top:.75rem">
        <strong style="font-size:.75rem;font-family:var(--font-mono);color:var(--color-text-weak)">يمنح:</strong>
        <ul>${p.grants.map(g => `<li><code>${g.category}</code> — ${g.action}: <code>${g.target}</code></li>`).join("\n")}</ul>
      </div>
    </div>`).join("\n")}
  </section>
  
  <section class="section">
    <div class="section-label">الإعدادات</div>
    <h2>إعداد الأذونات</h2>
    <p>اضبط الأذونات في <strong>الإعدادات → الأذونات</strong>:</p>
    <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>1.</strong> اختر مستوى الأذونات الافتراضي (read-only, ask-first, full-access)</li>
      <li><strong>2.</strong> حدد ملف أذونات جاهز أو أنشئ ملفاً مخصصاً</li>
      <li><strong>3.</strong> اضبط الأذونات لكل فئة (ملفات، shell، متصفح، إلخ)</li>
      <li><strong>4.</strong> عيّن "السماح دائماً" أو "الرفض دائماً" لعمليات محددة</li>
    </ol>

    <div class="detail-card">
      <h3>⚙️ ملفات أذونات مخصصة</h3>
      <p>أنشئ ملفات أذونات مخصصة لسير العمل المختلف:</p>
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
    </div>

    <div class="detail-card">
      <h3>🚨 إجراءات عالية التأثير</h3>
      <p>هذه الإجراءات تتطلب دائماً موافقة صريحة في وضع <code>ask-first</code>:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>حذف دائم</strong> — حذف ملفات أو بيانات</li>
        <li><strong>تنفيذ shell</strong> — تشغيل أوامر (خاصة المدمرة)</li>
        <li><strong>التحكم بالحاسوب</strong> — التحكم بتطبيقات سطح المكتب</li>
        <li><strong>إرسال عن بعد</strong> — إرسال مهام لـ Aura Cloud</li>
        <li><strong>كتابة ملفات</strong> — تعديل ملفات موجودة</li>
        <li><strong>Git commits</strong> — إنشاء commits أو push</li>
        <li><strong>نماذج المتصفح</strong> — إرسال نماذج على المواقع</li>
      </ul>
    </div>
  </section>
  
  <section class="section">
    <div class="section-label">سجل التدقيق</div>
    <h2>كل إجراء مسجل</h2>
    <p>جميع طلبات الأذونات والموافقات والرفض مسجلة في سجل التدقيق بتفاصيل كاملة:</p>
    <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>الفاعل</strong> — من قام بالإجراء (وكيل أو مستخدم)</li>
      <li><strong>الفئة</strong> — ملفات، shell، متصفح، git، إضافات، إلخ</li>
      <li><strong>الإجراء</strong> — قراءة، كتابة، تنفيذ، commit، إلخ</li>
      <li><strong>الهدف</strong> — مسار الملف، URL، الأمر، إلخ</li>
      <li><strong>مستوى المخاطرة</strong> — منخفض، متوسط، عالي، حرج</li>
      <li><strong>القرار</strong> — سماح، رفض، موافقة، معلق</li>
      <li><strong>النتيجة</strong> — نجاح، فشل، معلق</li>
    </ul>

    <div class="detail-card">
      <h3>🔐 الخزنة المشفرة</h3>
      <p>الأسرار ومفاتيح API ورموز الجلسات تخزن في خزنة مشفرة مرتبطة بالجهاز:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>التشفير</strong> — ChaCha20-Poly1305 مع Argon2 لاشتقاق المفاتيح</li>
        <li><strong>مرتبطة بالجهاز</strong> — المفاتيح مرتبطة بجهازك (DPAPI/Keychain/Secret Service)</li>
        <li><strong>فتح بيومتري</strong> — يدعم بصمة الإصبع/الوجه على المنصات المدعومة</li>
        <li><strong>أسرار مرقمة</strong> — تتبع تغييرات مفاتيح API عبر الزمن</li>
        <li><strong>حذف آمن</strong> — الأسرار تمسح بشكل آمن عند إزالتها</li>
      </ul>
    </div>
  </section>`;
  return wrapPageAr("الأذونات", body, "permissions");
}

function generateArchitectureAr() {
  const body = `<div class="hero">
    <h1><span>الهندسة المعمارية</span></h1>
    <p class="subtitle">Tauri 2 + React 19 + Rust — منصة سطح مكتب متعددة العمليات حديثة.</p>
  </div>
  <section class="section">
    <p>Aura Work مبني على <strong>هندسة متعددة العمليات</strong> حيث يستضيف غلاف Tauri 2 واجهة React 19 ويدير 8 عمليات sidecar مستقلة، كل منها معزولة ومصادق عليها. هذا التصميم يضمن الأمان والعزل وقابلية التوسع.</p>
    
    <h2 style="margin-top:2rem">هندسة النظام</h2>
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
      <h3>🖥️ غلاف سطح المكتب (Tauri 2 + Rust)</h3>
      <p>الغلاف الخارجي مبني بـ Tauri 2 و Rust. يدير:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>إدارة النوافذ</strong> — نوافذ أصلية، علبة النظام، القوائم</li>
        <li><strong>جسر IPC</strong> — التواصل بين الواجهة والخدمات المساعدة</li>
        <li><strong>نظام الملفات</strong> — عمليات ملفات آمنة مع فحص الأذونات</li>
        <li><strong>دورة حياة العمليات</strong> — تشغيل وإيقاف ومراقبة sidecars</li>
        <li><strong>الخزنة</strong> — تخزين مشفر لمفاتيح API والأسرار</li>
        <li><strong>قاعدة بيانات SQLite</strong> — تخزين محلي للمشاريع والمهام والإعدادات</li>
      </ul>
    </div>
    
    <div class="detail-card">
      <h3>🎨 الواجهة الأمامية (React 19 + TypeScript)</h3>
      <p>طبقة UI مبنية بـ React 19 و Vite. توفر:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>14 صفحة رئيسية</strong> — لوحة التحكم، المهام، الملفات، Git، الطرفية، المزوّدون، الإضافات، المتصفح، التحكم بالحاسوب، المهام المجدولة، الذاكرة، سجل التدقيق، السحابة، الامتدادات</li>
        <li><strong>10 علامات تبويب إعدادات</strong> — عام، الخزنة، VM، السحابة، الامتداد، الحيوان الأليف، الجاهزية، التشخيص، النموذج المحلي، الموافقات</li>
        <li><strong>واجهة محادثة</strong> — نقطة التفاعل الرئيسية مع الوكيل</li>
        <li><strong>محرر Monaco</strong> — تحرير الأكواد مع تلوين الصيغة</li>
        <li><strong>نظام تصميم</strong> — 35+ ثيم، دعم RTL، تخطيط متجاوب</li>
      </ul>
    </div>
    
    <div class="detail-card">
      <h3>⚙️ محرك الوكيل (TypeScript)</h3>
      <p>عقل Aura Work — نظام تنسيق متعدد الوكلاء:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>المخطط (Planner)</strong> — يفكك المهام إلى خطط خطوة بخطوة</li>
        <li><strong>المنفذ (Executor)</strong> — ينفذ كل خطوة، مستدعياً الأدوات</li>
        <li><strong>المراجع (Reviewer)</strong> — يتحقق من صحة وسلامة المخرجات</li>
        <li><strong>الأمان (Safety)</strong> — يفرض الحدود وفحص الأذونات</li>
      </ul>
      <p style="margin-top:.75rem">الوكيل يدعم الأدوات المخصصة وخوادم MCP والإضافات. يمكنه استخدام أي مجموعة من القدرات لإكمال المهام.</p>
    </div>
    
    <div class="detail-card">
      <h3>🔗 جسر Bridge (TypeScript)</h3>
      <p>API HTTP لربط العملاء الخارجيين:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>CLI</strong> — تحكم من الطرفية عبر أمر <code>aura</code></li>
        <li><strong>Chrome extension</strong> — تكامل المتصفح لقراءة الصفحات</li>
        <li><strong>Office add-in</strong> — تفويض المستندات من Word/Excel</li>
      </ul>
      <p style="margin-top:.75rem">الجسر يعمل على المنفذ 47826 ويتطلب مصادقة بالجلسة. يستمع فقط على localhost للأمان.</p>
    </div>
  </section>
  
  <section class="section">
    <div class="section-label">تدفق البيانات</div>
    <h2>كيف تتحرك البيانات</h2>
    <p>عندما تكتب أمراً، هذا هو تدفق البيانات الكامل:</p>
    <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2.5">
      <li><strong>1. إدخال المستخدم</strong> — تكتب في واجهة محادثة React</li>
      <li><strong>2. استدعاء IPC</strong> — الواجهة ترسل الأمر لخلفية Rust عبر Tauri IPC</li>
      <li><strong>3. إنشاء مهمة</strong> — Rust تنشئ مهمة في SQLite بحالة "planning"</li>
      <li><strong>4. تنسيق الوكيل</strong> — Rust تستدعي Agent sidecar (المنفذ 47821)</li>
      <li><strong>5. التخطيط</strong> — وكيل المخطط ينشئ خطة خطوة بخطوة</li>
      <li><strong>6. التوجيه</strong> — محرك التوجيه يختار أفضل مزوّد/نموذج</li>
      <li><strong>7. فحص الأذونات</strong> — كل خطوة تُفحص مقابل ملف الأذونات</li>
      <li><strong>8. التنفيذ</strong> — وكيل المنفذ ينفذ كل خطوة</li>
      <li><strong>9. استدعاءات الأدوات</strong> — الأدوات قد تستدعي sidecars أخرى</li>
      <li><strong>10. المراجعة</strong> — وكيل المراجع يتحقق من المخرجات</li>
      <li><strong>11. الرد</strong> — النتائج ترسل للواجهة عبر IPC</li>
      <li><strong>12. العرض</strong> — الواجهة تعرض النتائج في المحادثة</li>
    </ol>
    <p style="margin-top:1.5rem">جميع التفاعلات تُسجل في سجل التدقيق. عمليات الملفات تمر عبر بوابة الأذونات قبل الوصول لنظام الملفات.</p>
  </section>
  
  <section class="section">
    <div class="section-label">المكدس التقني</div>
    <h2>التقنيات المستخدمة</h2>
    <table>
      <thead><tr><th>الطبقة</th><th>التقنية</th><th>الغرض</th></tr></thead>
      <tbody>
        <tr><td>غلاف سطح المكتب</td><td>Tauri 2</td><td>نوافذ أصلية، قوائم، علبة نظام، IPC</td></tr>
        <tr><td>الخلفية الأساسية</td><td>Rust</td><td>عمليات الأداء والأمان</td></tr>
        <tr><td>الواجهة الأمامية</td><td>React 19 + Vite</td><td>عرض UI، تحديث فوري، TypeScript</td></tr>
        <tr><td>Sidecars</td><td>Node.js / TypeScript</td><td>خدمات خلفية</td></tr>
        <tr><td>محرك الوكيل</td><td>TypeScript</td><td>تنسيق متعدد الوكلاء</td></tr>
        <tr><td>التخزين</td><td>SQLite (rusqlite)</td><td>تخزين بيانات محلي</td></tr>
        <tr><td>التشفير</td><td>ChaCha20-Poly1305 + Argon2</td><td>أمان الاعتمادات</td></tr>
        <tr><td>نظام البناء</td><td>npm workspaces + esbuild</td><td>أدوات monorepo</td></tr>
      </tbody>
    </table>
  </section>
  
  <section class="section">
    <div class="section-label">هيكل المشروع</div>
    <h2>تنظيم الكود</h2>
    <pre><code>aura-work/
├── apps/desktop/           # تطبيق Tauri المكتبي
│   ├── src/                # مكونات وصفحات React
│   └── src-tauri/src/      # أوامر Rust ومنطق الأعمال
├── packages/
│   ├── ui/src/             # نظام التصميم (tokens, components)
│   ├── shared/             # أنواع TypeScript والثوابت
│   ├── i18n/               # التعريب (20 لغة)
│   └── aura-plugin/        # SDK الإضافات
├── sidecar/
│   ├── aura-agent/         # محرك المهام + المزوّدون
│   ├── aura-vm-helper/     # تنفيذ VM/shell
│   ├── aura-browser-helper/# أتمتة المتصفح
│   ├── aura-plugins-helper/# إدارة MCP/الإضافات
│   ├── aura-cloud-sync/    # عميل مزامنة E2EE
│   ├── aura-bridge/        # جسر الامتدادات
│   ├── aura-computer-use/  # مساعد التحكم بالحاسوب
│   └── aura-cloud/         # خادم سحابي ذاتي الاستضافة
├── cli/aura-cli/           # CLI المرافق
├── registry/               # سجل marketplace
├── docs/                   # توثيق الميزات
├── examples/               # أمثلة إضافات وخوادم MCP
├── qa/                     # مجموعة اختبارات القبول
└── scripts/                # سكريبتات البناء والإصدار</code></pre>
  </section>`;
  return wrapPageAr("الهندسة المعمارية", body, "architecture");
}

function generateCLIAr() {
  const body = `<div class="hero">
    <h1><span>واجهة الأوامر</span></h1>
    <p class="subtitle">عميل أوامر للتحكم عن بعد بتطبيق Aura Work من الطرفية — أتمتة، CI/CD، وسير عمل قابل للبرمجة.</p>
  </div>
  <section class="section">
    <p>أداة <code>aura</code> CLI تتصل بتطبيق Aura Work المكتبي عبر جسر Bridge. تسمح بإنشاء المهام، متابعة الحالة، وإدارة المشاريع — كل ذلك من الطرفية. CLI مثالي للأتمتة، خطوط CI/CD، والمطورين الذين يفضلون سير العمل عبر الطرفية.</p>
    
    <h2 style="margin-top:2rem">التثبيت</h2>
    <p>ثبّت CLI عبر npm:</p>
    <pre><code>npm install -g @aura-work/cli</code></pre>
    <p style="margin-top:.75rem">أو استخدمها مباشرة مع npx:</p>
    <pre><code>npx @aura-work/cli status</code></pre>

    <div class="detail-card">
      <h3>📋 مرجع الأوامر الكامل</h3>
      <table style="margin-top:.75rem">
        <thead><tr><th>الأمر</th><th>الوصف</th><th>مثال</th></tr></thead>
        <tbody>
          <tr><td><code>aura status</code></td><td>فحص حالة الجسر والاتصال</td><td><code>aura status</code></td></tr>
          <tr><td><code>aura pair --code &lt;code&gt;</code></td><td>ربط CLI بالتطبيق المكتبي</td><td><code>aura pair --code ABC123</code></td></tr>
          <tr><td><code>aura projects</code></td><td>عرض جميع المشاريع</td><td><code>aura projects</code></td></tr>
          <tr><td><code>aura task create</code></td><td>إنشاء وبدء مهمة</td><td><code>aura task create --prompt "أضف مصادقة"</code></td></tr>
          <tr><td><code>aura task get &lt;id&gt;</code></td><td>تفاصيل المهمة وحالتها</td><td><code>aura task get task_abc123</code></td></tr>
          <tr><td><code>aura task logs &lt;id&gt;</code></td><td>بث سجلات تنفيذ المهمة</td><td><code>aura task logs task_abc123</code></td></tr>
          <tr><td><code>aura open task &lt;id&gt;</code></td><td>فتح المهمة في التطبيق المكتبي</td><td><code>aura open task task_abc123</code></td></tr>
        </tbody>
      </table>
    </div>

    <div class="detail-card">
      <h3>🔐 عملية الاقتران</h3>
      <p>تتصل CLI بالتطبيق المكتبي عبر جسر Bridge. إليك طريقة الإعداد:</p>
      <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> افتح التطبيق المكتبي واذهب إلى <strong>الإضافات → ربط جهاز جديد</strong></li>
        <li><strong>2.</strong> سيظهر رمز اقتران (صالح لمدة 10 دقائق)</li>
        <li><strong>3.</strong> شغّل <code>aura pair --code &lt;code&gt;</code> في الطرفية</li>
        <li><strong>4.</strong> CLI تحفظ رمز الجلسة في <code>~/.aura/config.json</code></li>
        <li><strong>5.</strong> جميع الأوامر اللاحقة تستخدم هذا الرمز للمصادقة</li>
      </ol>
      <p style="margin-top:.75rem">الاقتران ينشئ جلسة آمنة. يمكنك إلغاء الوصول في أي وقت من التطبيق المكتبي تحت الإضافات → الأجهزة المرتبطة.</p>
    </div>

    <div class="detail-card">
      <h3>🔄 أمثلة استخدام</h3>
      
      <h4 style="margin-top:1rem;margin-bottom:.5rem">إنشاء مهمة من الطرفية</h4>
      <pre><code># إنشاء مهمة في المشروع الحالي
aura task create --prompt "أصلح خطأ تسجيل الدخول في auth.ts"

# إنشاء مهمة في مشروع محدد
aura task create --project my-web-app --prompt "أضف صفحة الملف الشخصي"

# إنشاء مهمة بأذونات محددة
aura task create --prompt "أعد هيكلة قاعدة البيانات" --permissions "file,shell"</code></pre>

      <h4 style="margin-top:1rem;margin-bottom:.5rem">متابعة تقدم المهمة</h4>
      <pre><code># حالة المهمة
aura task get task_abc123

# بث مباشر للسجلات
aura task logs task_abc123

# فتح المهمة في التطبيق المكتبي للمراقبة البصرية
aura open task task_abc123</code></pre>

      <h4 style="margin-top:1rem;margin-bottom:.5rem">سكريبت أتمتة</h4>
      <pre><code>#!/bin/bash
# تشغيل مهمة وانتظار اكتمالها
TASK_ID=$(aura task create --prompt "شغّل الاختبارات" --json | jq -r '.id')
echo "تم إنشاء المهمة: $TASK_ID"

# استطلاع حتى الاكتمال
while true; do
  STATUS=$(aura task get $TASK_ID --json | jq -r '.status')
  if [ "$STATUS" = "completed" ]; then
    echo "اكتملت المهمة!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "فشلت المهمة!"
    exit 1
  fi
  sleep 5
done</code></pre>
    </div>

    <div class="detail-card">
      <h3>🔒 نموذج الأمان</h3>
      <p>تتصل CLI عبر جسر Bridge المحلي (المنفذ 47826). مميزات الأمان الرئيسية:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>مصادقة بالجلسة</strong> — كل جلسة CLI لها رمز فريد</li>
        <li><strong>احترام الأذونات</strong> — CLI لا يمكنها تجاوز أي إذن، تتبع نفس ملفات الأذونات مثل التطبيق المكتبي</li>
        <li><strong>محلي فقط</strong> — Bridge يستمع فقط على localhost، لا وصول عن بعد</li>
        <li><strong>إلغاء الرمز</strong> — يمكنك إلغاء وصول CLI في أي وقت من التطبيق المكتبي</li>
        <li><strong>سجل التدقيق</strong> — جميع إجراءات CLI مسجلة في سجل التدقيق</li>
      </ul>
    </div>

    <div class="detail-card">
      <h3>⚡ التكامل مع CI/CD</h3>
      <p>استخدم CLI في خطوط الأتمتة:</p>
      <pre><code># مثال GitHub Actions
name: تشغيل مهمة AI
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
      - run: aura task create --prompt "راجع تغييرات الكود" --wait</code></pre>
      <p style="margin-top:.75rem">خزّن رمز الاقتران كـ GitHub secret. العلم <code>--wait</code> يمنع الاستمرار حتى اكتمال المهمة.</p>
    </div>

    <div class="detail-card">
      <h3>🛠️ الإعدادات</h3>
      <p>CLI تخزّن إعداداتها في <code>~/.aura/config.json</code>:</p>
      <pre><code>{
  "sessionToken": "abc123...",
  "bridgeHost": "localhost",
  "bridgePort": 47826,
  "defaultProject": "my-project",
  "outputFormat": "text"  // أو "json"
}</code></pre>
      <p style="margin-top:.75rem">اضبط <code>outputFormat</code> إلى <code>json</code> للإخراج المقروء آلياً في السكريبتات.</p>
    </div>

  <section class="section">
    <div class="section-label">أوامر متقدمة</div>
    <h2>إدارة متقدمة عبر CLI</h2>
    <div class="card-grid">
      <div class="detail-card">
        <h3>📋 إدارة الجلسات</h3>
        <pre><code>aura session list          # عرض الجلسات النشطة
aura session resume &lt;id&gt;  # استئناف جلسة سابقة
aura session kill &lt;id&gt;    # إنهاء جلسة</code></pre>
      </div>
      <div class="detail-card">
        <h3>⭐ إدارة المهارات</h3>
        <pre><code>aura skill list            # عرض المهارات المثبتة
aura skill install &lt;name&gt;  # تثبيت مهارة من marketplace
aura skill create          # إنشاء مهارة جديدة</code></pre>
      </div>
      <div class="detail-card">
        <h3>🔌 إدارة MCP</h3>
        <pre><code>aura mcp list              # عرض خوادم MCP
aura mcp add &lt;name&gt;        # إضافة خادم MCP
aura mcp remove &lt;name&gt;     # إزالة خادم MCP</code></pre>
      </div>
      <div class="detail-card">
        <h3>☁ المزامنة</h3>
        <pre><code>aura sync push             # رفع التغييرات للسحابة
aura sync pull              # تنزيل التغييرات من السحابة
aura sync status            # حالة المزامنة</code></pre>
      </div>
      <div class="detail-card">
        <h3>⚙️ التكوين</h3>
        <pre><code>aura config list           # عرض جميع الإعدادات
aura config set &lt;k&gt; &lt;v&gt;    # تعيين إعداد
aura config reset           # إعادة للإعدادات الافتراضية</code></pre>
      </div>
      <div class="detail-card">
        <h3>📦 المشاريع</h3>
        <pre><code>aura projects list         # عرض المشاريع
aura projects create &lt;name&gt; # إنشاء مشروع جديد
aura projects delete &lt;name&gt; # حذف مشروع</code></pre>
      </div>
    </div>
  </section>
  </section>`;
  return wrapPageAr("واجهة الأوامر", body, "cli");
}

function generateMCPAr() {
  const body = `<div class="hero">
    <h1><span>بروتوكول السياق</span></h1>
    <p class="subtitle">بروتوكول MCP — وسّع قدرات الوكيل بأدوات وخدمات الطرف الثالث.</p>
  </div>
  <section class="section">
    <p>MCP (Model Context Protocol) هو <strong>معيار مفتوح</strong> لربط وكلاء الذكاء الاصطناعي بالأدوات ومصادر البيانات الخارجية. Aura Work يدعم خوادم MCP كآلية توسيع من الدرجة الأولى إلى جانب المهارات المدمجة والإضافات. MCP يسمح لك بإضافة قدرات جديدة بدون تعديل التطبيق الأساسي — فقط ثبّت خادم وسيتمكن الوكيل من استخدام أدواته.</p>
    
    <h2 style="margin-top:2rem">ما هو MCP؟</h2>
    <p>MCP هو بروتوكول يسمح لوكلاء الذكاء الاصطناعي بالتواصل مع الخدمات الخارجية عبر واجهة موحدة. فكّر فيه كـ <strong>محول عالمي</strong> لأدوات AI — بدلاً من بناء تكاملات مخصصة لكل خدمة، يوفر MCP لغة مشتركة يفهمها كل من الوكيل والخدمة.</p>
    <p style="margin-top:.75rem">مع MCP، يمكنك ربط الوكيل بـ:</p>
    <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>قواعد البيانات</strong> — استعلام PostgreSQL و MySQL و SQLite و MongoDB</li>
      <li><strong>واجهات API</strong> — تفاعل مع GitHub و Slack و Discord و Jira</li>
      <li><strong>أنظمة الملفات</strong> — الوصول للتخزين السحابي (S3 و GCS و Azure Blob)</li>
      <li><strong>أدوات التطوير</strong> — linters و formatters ومشغلات الاختبارات</li>
      <li><strong>خدمات مخصصة</strong> — أدواتك و APIs الداخلية</li>
    </ul>

    <div class="detail-card">
      <h3>⚙️ كيف يعمل MCP في Aura Work</h3>
      <p>خوادم MCP تدار بواسطة خدمة <strong>مساعد الإضافات</strong> (المنفذ 47824). عند إضافة خادم MCP:</p>
      <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> مساعد الإضافات يشغّل عملية الخادم (stdio) أو يتصل به (SSE)</li>
        <li><strong>2.</strong> الخادم يعلن عن قدراته (أدوات، موارد، أوامر)</li>
        <li><strong>3.</strong> هذه القدرات تُسجّل في محرك الوكيل</li>
        <li><strong>4.</strong> عندما يحتاج الوكيل أداة، يمكنه الآن استدعاء أدوات خادم MCP</li>
        <li><strong>5.</strong> كل استدعاء أداة يمر عبر بوابة الأذونات للموافقة</li>
      </ol>
      <p style="margin-top:.75rem">الوكيل يكتشف تلقائياً أدوات MCP المتاحة ويختارها عندما تكون مناسبة — لا تحتاج أن تخبره صراحةً باستخدام أداة MCP.</p>
    </div>

    <div class="detail-card">
      <h3>🔌 طرق النقل المدعومة</h3>
      <p>MCP يدعم آليتي نقل:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>النقل</th><th>كيف يعمل</th><th>الأفضل لـ</th></tr></thead>
        <tbody>
          <tr><td><code>stdio</code></td><td>الخادم يعمل كعملية فرعية. التواصل عبر stdin/stdout.</td><td>الأدوات المحلية، مغلفات CLI، التكاملات البسيطة</td></tr>
          <tr><td><code>SSE</code></td><td>الخادم يعمل كخدمة HTTP. التواصل عبر Server-Sent Events.</td><td>الخدمات البعيدة، الخوادم في الحاويات</td></tr>
        </tbody>
      </table>
      <p style="margin-top:.75rem">معظم خوادم MCP المجتمعية تستخدم <code>stdio</code> لأنه أبسط — لا حاجة لإعدادات الشبكة.</p>
    </div>

    <div class="detail-card">
      <h3>📦 تثبيت خوادم MCP</h3>
      <p>هناك ثلاث طرق لإضافة خوادم MCP:</p>
      
      <h4 style="margin-top:1rem;margin-bottom:.5rem">الطريقة 1: Marketplace (موصى بها)</h4>
      <p>افتح <strong>لوحة الإضافات</strong> في التطبيق المكتبي، ابحث عن خادم MCP، واضغط تثبيت. marketplace يدير الإصدارات والتحديثات والتبعيات.</p>
      
      <h4 style="margin-top:1rem;margin-bottom:.5rem">الطريقة 2: إعداد يدوي</h4>
      <p>أضف خادم يدوياً في الإعدادات → الإضافات → خوادم MCP:</p>
      <pre><code>{
  "name": "my-database-server",
  "command": "node",
  "args": ["path/to/mcp-server.js"],
  "env": { "DATABASE_URL": "postgresql://localhost/mydb" }
}</code></pre>
      
      <h4 style="margin-top:1rem;margin-bottom:.5rem">الطريقة 3: إعداد على مستوى المشروع</h4>
      <p>أضف خوادم MCP إلى ملف <code>aura.jsonc</code> في مشروعك:</p>
      <pre><code>{
  "mcp": {
    "test-project-server": {
      "type": "local",
      "command": ["node", "/path/to/test-mcp-server.js"],
      "enabled": true,
      "environment": { "TEST_ENV_VAR": "مرحباً" }
    }
  }
}</code></pre>
    </div>

    <div class="detail-card">
      <h3>🔐 الأمان والأذونات</h3>
      <p>استدعاءات أدوات MCP تخضع لنفس نظام الأذونات مثل الأدوات المدمجة:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>موافقة لكل أداة</strong> — كل أداة MCP يمكن الموافقة عليها أو رفضها بشكل فردي</li>
        <li><strong>تنفيذ معزول</strong> — خوادم MCP تعمل في عمليات معزولة</li>
        <li><strong>تصريح بالأذونات</strong> — الخوادم يجب أن تعلن ما تحتاج الوصول إليه</li>
        <li><strong>سجل التدقيق</strong> — جميع استدعاءات MCP مسجلة بالتفصيل</li>
      </ul>
      <p style="margin-top:.75rem">في وضع <code>ask-first</code>، سيُطلب منك التأكيد قبل كل استدعاء أداة MCP.</p>
    </div>

    <div class="detail-card">
      <h3>🛒 Marketplace</h3>
      <p>المتجر (<code>registry/marketplace.json</code>) يتضمن خوادم MCP إلى جانب المهارات والإضافات. كل إدخال يتضمن: بيان الخادم، وصف الأدوات، وصف مترجم بـ 20 لغة، معلومات الإصدار، وتقييم المخاطر.</p>
    </div>

    <div class="detail-card">
      <h3>🛠️ تطوير خوادم MCP</h3>
      <p>يمكنك إنشاء خوادم MCP خاصة بك باستخدام MCP SDK الرسمي:</p>
      <pre><code>// my-mcp-server.js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "my-custom-server",
  version: "1.0.0"
}, { capabilities: { tools: {} } });

// تعريف أداة
server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "my_tool",
    description: "تقوم بشيء مفيد",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "نص الاستعلام" }
      },
      required: ["query"]
    }
  }]
}));

// معالجة استدعاءات الأدوات
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  if (name === "my_tool") {
    return { content: [{ type: "text", text: "النتيجة: " + args.query }] };
  }
});

// بدء الخادم
const transport = new StdioServerTransport();
await server.connect(transport);</code></pre>
      <p style="margin-top:.75rem">راجع <code>examples/mcp-server/</code> لمثال عملي كامل.</p>
    </div>

    <div class="detail-card">
      <h3>💡 خوادم MCP شائعة</h3>
      <table style="margin-top:.75rem">
        <thead><tr><th>الخادم</th><th>الغرض</th><th>النقل</th></tr></thead>
        <tbody>
          <tr><td><code>filesystem</code></td><td>قراءة/كتابة الملفات، البحث</td><td>stdio</td></tr>
          <tr><td><code>github</code></td><td>إدارة المستودعات و issues و PRs</td><td>stdio</td></tr>
          <tr><td><code>postgres</code></td><td>استعلام قواعد بيانات PostgreSQL</td><td>stdio</td></tr>
          <tr><td><code>slack</code></td><td>إرسال رسائل وقراءة القنوات</td><td>stdio</td></tr>
          <tr><td><code>puppeteer</code></td><td>أتمتة المتصفح مع Chrome</td><td>stdio</td></tr>
          <tr><td><code>brave-search</code></td><td>بحث الويب عبر Brave API</td><td>stdio</td></tr>
        </tbody>
      </table>
      <p style="margin-top:.75rem">اعثر على المزيد في <a href="https://github.com/modelcontextprotocol/servers" style="color:var(--color-accent)">github.com/modelcontextprotocol/servers</a></p>
    </div>
  </section>`;
  return wrapPageAr("بروتوكول السياق", body, "mcp");
}

function generateSidecarsAr() {
  const sidecars = getSidecars();
  const sidecarNames = {
    "agent": "المحرك الأساسي", "bridge": "جسر التواصل", "browser-helper": "مساعد المتصفح",
    "cloud-sync": "مزامنة سحابية", "computer-use": "التحكم بالحاسوب",
    "vm-helper": "مساعد الآلة الافتراضية", "plugins-helper": "مساعد الإضافات", "prompt-system": "نظام الأوامر"
  };
  const sidecarDesc = {
    "agent": "محرك تنفيذ الوكيل الأساسي — يدير تخطيط المهام وتنفيذها خطوة بخطوة مع دعم المزوّدين المتعددين",
    "bridge": "جسر HTTP للتواصل مع التطبيقات الخارجية — يمكن CLI و Chrome extension من التحكم بالتطبيق",
    "browser-helper": "أتمتة المتصفح واستخراج البيانات — يستخدم Playwright للتفاعل مع صفحات الويب",
    "cloud-sync": "مزامنة الحالة والإعدادات عبر الأجهزة — بتشفير E2EE كامل",
    "computer-use": "أتمتة سطح المكتب — تحكم كامل بالماوس ولوحة المفاتيح والملفات",
    "vm-helper": "تنفيذ أكواد معزول في بيئة آمنة — يدعم Docker و WSL2",
    "plugins-helper": "تحميل وإدارة الإضافات الديناميكية — يدير MCP والمهارات والمكونات الإضافية",
    "prompt-system": "إدارة وقوالب الأوامر النظامية — يتحكم بكيفية تواصل الوكيل",
  };
  const sidecarIcons = { "agent": "◎", "bridge": "⇄", "browser-helper": "◉", "cloud-sync": "☁", "computer-use": "🖥", "vm-helper": "▣", "plugins-helper": "◆", "prompt-system": "☆" };
  const sidecarDetails = {
    "agent": "المحرك الرئيسي للوكيل — يستقبل المهام من المستخدم، يحللها، يخطط للخطوات، وينفذها. يتواصل مع جميع المزوّدين (OpenAI, Anthropic, Ollama, Gemini وغيرها) عبر محرك التوجيه. يدير دورة حياة المهمة كاملة من التخطيط إلى المراجعة. يدعم أكثر من 50 مهارة جاهزة ويمكن توسيعه بمهارات مخصصة.",
    "bridge": "خادم HTTP يعمل كجسر بين تطبيق Aura المكتبي والعملاء الخارجيين. يُمكّن CLI من إنشاء المهام ومتابعتها من الطرفية، ويمكن إضافة Chrome extension للتحكم من المتصفح. يستمع على المنفذ 47826 ويتطلب مصادقة بالجلسة. لا يقبل الاتصالات إلا من localhost للأمان.",
    "browser-helper": "محرك أتمتة متصفح كامل باستخدام Playwright. يمكنه فتح المواقع، ملء النماذج، التقاط لقطات الشاشة، استخراج البيانات، والتفاعل مع عناصر الصفحة. يدعم متصفحات Chromium و Firefox و WebKit. مثالي لمهام البحث والأتمتة على الويب.",
    "cloud-sync": "خدمة مزامنة مشفرة بالكامل (E2EE) بين الأجهزة. تستخدم WebSocket للاتصال الفوري وتشفير ChaCha20-Poly1305 لكل جهاز. تخزّن المفاتيح محلياً فقط — حتى خوادم Aura لا تستطيع قراءة بياناتك.",
    "computer-use": "خدمة تحكم كامل بسطح المكتب — تحريك الماوس، النقر، الكتابة، التقاط الشاشة، وإدارة النوافذ. تسمح للوكيل بالتفاعل مع أي تطبيق على جهازك. تتطلب أذونات صريحة لكل إجراء. مثالية لأتمتة المهام المتكررة.",
    "vm-helper": "بيئة تنفيذ معزولة وآمنة للأكواد. تدير حاويات Docker و WSL2 لتشغيل الأكواد في بيئة منفصلة تماماً عن النظام. تمنع الوصول غير المصرح للملفات والشبكة. مثالية لاختبار الأكواد وتجربة المكتبات الجديدة بأمان.",
    "plugins-helper": "مدير الإضافات الديناميكي — يحمّل ويدير خوادم MCP والمهارات والمكونات الإضافية. يستمع على المنفذ 47824. يكتشف الإضافات تلقائياً من marketplace ويدير دورة حياتها (تثبيت، تشغيل، إيقاف، تحديث).",
    "prompt-system": "نظام إدارة الأوامر النصية — يتحكم في كيفية تواصل الوكيل مع المستخدم والنظام. يدعم قوالب ديناميكية، تخصيص حسب المزوّد، وإدارة السياق. يضمن تجربة متسقة عبر جميع المزوّدين والنماذج.",
  };
  const sidecarPorts = {
    "agent": "47821", "bridge": "47826", "browser-helper": "47823",
    "cloud-sync": "47825", "computer-use": "47828",
    "vm-helper": "47822", "plugins-helper": "47824", "prompt-system": "47829"
  };

  const body = `<div class="hero">
    <h1><span>الخدمات المساعدة</span></h1>
    <p class="subtitle">${sidecars.length} خدمات خلفية معيارية تشغّل قدرات Aura Work</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${sidecars.length}</div><div class="lbl">خدمات مساعدة</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">Node.js</div><div class="lbl">لغة البرمجة</div></div>
      <div class="stat-card fade-in delay-3"><div class="num">IPC+HTTP</div><div class="lbl">آلية التواصل</div></div>
    </div>
    <p>الخدمات المساعدة (Sidecars) هي <strong>عمليات Node.js مستقلة</strong> تديرها نواة Tauri. كل خدمة تعمل في مساحة عملية منفصلة مع دورة حياة مستقلة، وتتواصل عبر IPC أو HTTP. توفر هذه الخدمات قدرات معزولة وآمنة يمكن لمحرك الوكيل استدعاؤها.</p>
    
    <h2 style="margin-top:2rem">لماذا Sidecars؟</h2>
    <p>هذه الهيكلية توفر عدة مزايا:</p>
    <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>العزل</strong> — كل خدمة في عملية منفصلة، الأعطال لا تؤثر على التطبيق الرئيسي</li>
      <li><strong>الأمان</strong> — الخدمات معزولة ومصادق عليها، صلاحيات محدودة</li>
      <li><strong>القابلية للتوسيع</strong> — إمكانيات جديدة تُضاف كخدمات جديدة بدون تعديل النواة</li>
      <li><strong>إدارة الموارد</strong> — كل خدمة يمكن تشغيلها وإيقافها بشكل مستقل</li>
      <li><strong>مرونة اللغة</strong> — الخدمات يمكن كتابتها بأي لغة (حالياً جميعها TypeScript)</li>
    </ul>

    <div class="section-label">الخدمات المساعدة</div>
    <div class="card-grid">
      ${sidecars.map((s, i) => `<div class="detail-card fade-in delay-${(i % 4) + 1}">
        <h3><span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:var(--color-accent);color:#fff;font-size:.75rem;font-family:var(--font-mono);flex-shrink:0">${sidecarPorts[s] ? sidecarPorts[s].slice(-2) : "◆"}</span> ${sidecarNames[s] || s}</h3>
        <p style="margin-top:.5rem">${sidecarDetails[s] || sidecarDesc[s] || ""}</p>
        <div class="meta" style="margin-top:.5rem"><span>المنفذ: ${sidecarPorts[s] || "N/A"}</span><span>${sidecarIcons[s] || ""} TypeScript</span></div>
      </div>`).join("\n")}
    </div>
  </section>
  
  <section class="section">
    <div class="section-label">التواصل</div>
    <h2>كيف تتواصل Sidecars</h2>
    <div class="detail-card">
      <h3>🔌 طرق التواصل</h3>
      <p>تتواصل الخدمات المساعدة مع التطبيق الرئيسي عبر:</p>
      <table style="margin-top:.75rem">
        <thead><tr><th>الطريقة</th><th>المنفذ</th><th>الاستخدام</th></tr></thead>
        <tbody>
          <tr><td><strong>HTTP API</strong></td><td>47821-47830</td><td>نقاط REST لإدارة المهام والفحص الصحي</td></tr>
          <tr><td><strong>IPC</strong></td><td>—</td><td>تواصل مباشر بين العمليات للعمليات السريعة</td></tr>
          <tr><td><strong>WebSocket</strong></td><td>47826</td><td>بث مباشر للسجلات والأحداث</td></tr>
        </tbody>
      </table>
      <p style="margin-top:.75rem">جميع الخدمات تعرض نقطة <code>GET /health</code> تعيد الحالة والإصدار ومعلومات المرحلة.</p>
    </div>

    <div class="detail-card">
      <h3>📊 المنافذ والفحص الصحي</h3>
      <table style="margin-top:.75rem">
        <thead><tr><th>الخدمة</th><th>المنفذ</th><th>نقطة الفحص</th></tr></thead>
        <tbody>
          ${sidecars.map(s => `<tr><td>${sidecarNames[s] || s}</td><td>${sidecarPorts[s] || "N/A"}</td><td>GET /health</td></tr>`).join("\n")}
        </tbody>
      </table>
    </div>
  </section>
  
  <section class="section">
    <div class="section-label">الفحص الصحي</div>
    <h2>مراقبة حالة الخدمات</h2>
    <p>كل خدمة تعرض نقطة فحص صحي. يمكنك فحص جميع الخدمات دفعة واحدة:</p>
    <pre><code># فحص صحة خدمة Agent
curl http://localhost:47821/health

# الاستجابة:
{
  "phase": 7,
  "version": "0.1.0-alpha",
  "status": "ready",
  "uptime": 3600
}</code></pre>
    <p style="margin-top:.75rem">تطبيق سطح المكتب يراقب صحة الخدمات تلقائياً ويعيد تشغيل الخدمات المتعطلة. يمكنك أيضاً التحقق من الحالة في <strong>الإعدادات → التشخيص</strong>.</p>
  </section>
  
  <section class="section">
    <div class="section-label">نموذج الأمان</div>
    <h2>مصادقة Sidecars</h2>
    <p>جميع الخدمات تستخدم نظام مصادقة موحد مع رموز (tokens):</p>
    <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
      <li><strong>مصادقة بالرمز</strong> — كل طلب بين العمليات يجب أن يتضمن رمز sidecar صالح</li>
      <li><strong>تحميل وقت التشغيل</strong> — الرموز تُنشأ عند بدء التطبيق وتُحمّل في كل خدمة</li>
      <li><strong>التحقق من الطلبات</strong> — كل طلب يُفحص مقابل الرمز</li>
      <li><strong>رفض 401</strong> — الطلبات غير المصرحة تُرفض بـ <code>401 Unauthorized</code></li>
    </ul>

    <div class="detail-card">
      <h3>🛡️ العزل</h3>
      <p>كل خدمة تعمل في مساحة عملية منفصلة مع:</p>
      <ul style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>عملية Node.js منفصلة</strong> — لا ذاكرة أو حالة مشتركة</li>
        <li><strong>وصول محدود لنظام الملفات</strong> — فقط المجلدات التي تحتاجها</li>
        <li><strong>لا وصول للشبكة افتراضياً</strong> — يجب منحه صراحة</li>
        <li><strong>حدود الموارد</strong> — استخدام CPU والذاكرة مراقب</li>
      </ul>
    </div>
  </section>
  
  <section class="section">
    <div class="section-label">التطوير</div>
    <h2>بناء Sidecars</h2>
    <p>الخدمات المساعدة تُبنى بـ TypeScript وتُجمع بـ esbuild:</p>
    <pre><code># بناء جميع الخدمات
npm run build:sidecars

# بناء خدمة محددة
npm run build:sidecar -w sidecar/aura-agent

# تشغيل خدمة في وضع التطوير
npm run sidecar          # Agent
npm run vm-helper        # VM Helper
npm run browser-helper   # Browser Helper</code></pre>

    <div class="detail-card">
      <h3>📝 إنشاء Sidecar جديدة</h3>
      <ol style="padding-right:1.25rem;margin-top:.75rem;line-height:2">
        <li><strong>1.</strong> أنشئ مجلد جديد في <code>sidecar/</code></li>
        <li><strong>2.</strong> أضف <code>package.json</code> مع التبعيات</li>
        <li><strong>3.</strong> نفّذ نقطة الفحص الصحي: <code>GET /health</code></li>
        <li><strong>4.</strong> نفّذ نقاط منطق العمل الخاص بك</li>
        <li><strong>5.</strong> أضف المصادقة باستخدام <code>sidecar-auth.ts</code></li>
        <li><strong>6.</strong> سجّل الخدمة في مدير العمليات للتطبيق الرئيسي</li>
        <li><strong>7.</strong> أضف سكريبت البناء إلى <code>package.json</code> الرئيسي</li>
      </ol>
    </div>
  </section>`;
  return wrapPageAr("الخدمات المساعدة", body, "sidecars");
}

// ─── Main ───────────────────────────────────────────────────────────────────────

console.log("⚡ Aura Work — Docs Generator (Arabic)\n");
console.log("Scanning codebase...");
console.log(`  Version: ${getVersion()}`);
console.log(`  Skills: ${getSkills().length}`);
console.log(`  Languages: ${getLanguages().length}`);
console.log(`  Themes: ${getThemes().length}`);
console.log(`  Providers: ${getProviders().length}`);
console.log(`  Sidecars: ${getSidecars().length}`);
console.log(`\nGenerating Arabic pages...\n`);

mkdirSync(DOCS_PAGES_DIR, { recursive: true });

const pages = {
  "docs/docs.ar.html": generateDocsHubAr(),
  "docs/overview.ar": generateOverviewAr(),
  "docs/quickstart.ar": generateQuickStartAr(),
  "docs/providers.ar": generateProvidersAr(),
  "docs/routing.ar": generateRoutingAr(),
  "docs/skills.ar": generateSkillsAr(),
  "docs/sidecars.ar": generateSidecarsAr(),
  "docs/languages.ar": generateLanguagesAr(),
  "docs/themes.ar": generateThemesAr(),
  "docs/permissions.ar": generatePermissionsAr(),
  "docs/architecture.ar": generateArchitectureAr(),
  "docs/cli.ar": generateCLIAr(),
  "docs/mcp.ar": generateMCPAr(),
};

for (const [relPath, html] of Object.entries(pages)) {
  const fullPath = join(DOCS_DIR, relPath.endsWith(".html") ? relPath : relPath + ".html");
  const dir = dirname(fullPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, html, "utf-8");
  console.log(`  ✓ ${fullPath.replace(ROOT, "").replace(/\\/g, "/")}`);
}

// Redirect for /docs/ (Arabic)
const redirect = `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=https://aura-work.shop/docs/docs.ar.html"><title>تحويل</title></head><body><a href="https://aura-work.shop/docs/docs.ar.html">الوثائق</a></body></html>`;
writeFileSync(join(DOCS_DIR, "docs", "index.ar.html"), redirect, "utf-8");
console.log("  ✓ /docs/docs/index.ar.html (redirect)");

console.log(`\n✅ Done! All Arabic pages generated in docs/docs/`);
