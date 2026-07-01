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
        <li><a href="https://hbx12.github.io/aura-work/" >${tr("Home")}</a></li>
        <li><a href="https://hbx12.github.io/aura-work/docs/docs.ar.html" class="active">${tr("Docs")}</a></li>
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
<meta property="og:url" content="https://hbx12.github.io/aura-work/">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${getBaseCSS()}</style>
<style>
  .hero { padding: 4rem 0 2.5rem; position: relative; overflow: hidden; }
  .hero::before { content: ''; position: absolute; top: -50%; right: -20%; width: 60%; height: 200%; background: radial-gradient(ellipse at center, var(--color-accent-subtle) 0%, transparent 70%); pointer-events: none; }
  .hero h1 { position: relative; z-index: 1; }
  .hero .subtitle { position: relative; z-index: 1; }
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: .75rem; color: var(--color-text-weak); text-decoration: none; margin-bottom: 1.5rem; transition: color .15s; }
  .back-link:hover { color: var(--color-accent); }
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
${isHub ? '' : `<a href="docs.ar.html" class="back-link" style="flex-direction:row-reverse">
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

  return wrapPageAr(tr("Documentation Hub"), hero + `<section class="section">${statsBar}<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">${cards}</div></section>`, "hub");
}

function generateOverviewAr() {
  const version = getVersion();
  const body = `<div class="hero">
    <h1><span>${tr("Overview")}</span></h1>
    <p class="subtitle">${tr("What is Aura Work and why it exists")}</p>
  </div>
  <section class="section">
    <p>Aura Work هي <strong>منصة وكلاء ذكاء اصطناعي مكتبية متعددة المزوّدين</strong> مبنية للمطورين الذين يريدون مساعدة ذكاء اصطناعي <strong>محلية أولاً ومقيدة بالأذونات وقابلة للاستضافة الذاتية</strong>. تدعم 10 مزوّدي ذكاء اصطناعي فورياً، مع محرك توجيه ذكي يختار النموذج المناسب لكل مهمة.</p>
    <p>على عكس الأدوات السحابية فقط، يحتفظ Aura Work ببياناتك على جهازك. يستخدم هندسة إضافات مع تنفيذ معزول وتخزين مشفر للبيانات الاعتمادية وتحكم دقيق في الأذونات.</p>
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
    <div class="detail-card"><h3>${tr("Desktop App")}</h3><p>${tr("Tauri 2 shell hosting the React 19 frontend. Manages windows, system tray, native menus, and IPC with sidecar processes.")}</p></div>
    <div class="detail-card"><h3>${tr("Sidecar Services")}</h3><p>${tr("8 independent Node.js daemons for agent execution, browser automation, VM sandboxing, cloud sync, computer-use, and more.")}</p></div>
    <div class="detail-card"><h3>${tr("Agent Engine")}</h3><p>${tr("Multi-agent orchestration with planner, executor, reviewer, and safety roles. Supports custom tools and MCP servers.")}</p></div>
    <div class="detail-card"><h3>${tr("Routing Engine")}</h3><p>${tr("Smart model router across 10 providers with 5 routing policies: quality-first, cost-first, privacy-first, local-only, or manual.")}</p></div>
  </section>`;
  return wrapPageAr(tr("Overview"), body, "overview");
}

function generateQuickStartAr() {
  const body = `<div class="hero">
    <h1><span>${tr("Quick Start")}</span></h1>
    <p class="subtitle">${tr("Install, configure, run your first task")}</p>
  </div>
  <section class="section">
    <div class="section-label">${tr("Installation")}</div>
    <h2>${tr("Prerequisites")}</h2>
    <ul>
      <li><strong>نظام التشغيل:</strong> Windows 10+ أو macOS 12+ أو أي توزيعة Linux حديثة</li>
      <li><strong>مساحة تخزين:</strong> ~200 MB للتطبيق + نموذج Ollama للاستخدام المحلي</li>
      <li><strong>اتصال بالإنترنت:</strong> مطلوب للمزوّدين السحابيين فقط (غير مطلوب لـ Ollama/LM Studio)</li>
    </ul>
    <h2>${tr("Steps")}</h2>
    <div class="detail-card"><h3>1. ${tr("Download from GitHub Releases")}</h3><p>تصفح <a href="https://github.com/hbx12/aura-work/releases">صفحة الإصدارات</a> وحمّل أحدث إصدار لنظام تشغيلك.</p></div>
    <div class="detail-card"><h3>2. ${tr("Extract and run Aura Work")}</h3><p>فك ضغط الملف وشغّل التطبيق. سيظهر في شريط المهام (أو علبة النظام) عند بدء التشغيل.</p></div>
    <div class="detail-card"><h3>3. ${tr("Configure a provider")}</h3><p>${tr("Go to Settings → Providers. Add an API key for any provider (OpenAI, Anthropic, etc.) or start Ollama locally for free. Each provider is validated automatically.")}</p></div>
    <div class="detail-card"><h3>4. ${tr("Run your first task")}</h3><p>${tr('Type a prompt like: "Create a new React component that fetches data from an API". The agent plans the task, executes it step by step, and shows you the results.')}</p></div>
    <div class="detail-card"><h3>5. ${tr("Explore")}</h3><p>${tr("Try skills from the registry, install MCP servers, configure routing policies, set up scheduled tasks, or pair the CLI for terminal-based control.")}</p></div>
  </section>
  <section class="section">
    <div class="section-label">${tr("Next Steps")}</div>
    <h2>${tr("Going deeper")}</h2>
    <p>${tr("Read about")} <a href="providers.ar.html">${tr("Providers")}</a>, <a href="routing.ar.html">${tr("Routing")}</a>, <a href="skills.ar.html">${tr("Skills")}</a>, ${tr("or")} <a href="architecture.ar.html">${tr("Architecture")}</a>. ${tr("For contributors, see the")} <a href="https://github.com/hbx12/aura-work/blob/main/CONTRIBUTING.md">دليل المساهمة</a> و <a href="https://github.com/hbx12/aura-work/blob/main/docs/new-contributor.md">دليل المساهم الجديد</a>.</p>
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
    ${providers.map((p, i) => {
      const desc = providerDesc[p.name] || "";
      return `<div class="detail-card fade-in delay-${(i % 4) + 1}">
        <h3><span style="display:inline-flex;width:10px;height:10px;border-radius:50%;background:${colorDots[i]};flex-shrink:0"></span> ${p.name}</h3>
        <div class="meta">
          ${p.models ? `<span>${p.models} نماذج</span>` : `<span>نماذج متعددة</span>`}
          <span class="local-badge ${p.local ? 'yes' : 'no'}">${p.local ? tr("Local") : tr("Cloud")}</span>
        </div>
        <p>${desc}</p>
      </div>`;
    }).join("\n")}
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
    </div>
    <p>${tr("Agent skills are reusable capabilities registered as JSON definitions in the registry/skills/ directory. Each skill declares its tools, risk level, and allowed categories. Skills can be invoked by the agent at runtime and are sandboxed by the permission system.")}</p>
    
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
      </div>`).join("\n")}
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
    <div class="section-label">${tr("Supported Languages")}</div>
    <div class="lang-grid">${languages.map(l => `<a href="https://github.com/hbx12/aura-work/blob/main/packages/i18n/locales/${l}.json" class="lang-badge fade-in" style="animation: fadeIn .4s ease forwards">${langNames[l] || l} ${rtlLanguages.includes(l) ? `<span class="rtl-mark">${tr("RTL")}</span>` : ""}</a>`).join("\n")}</div>
  </section>
  <section class="section">
    <div class="section-label">${tr("Architecture")}</div>
    <h2>${tr("How i18n works")}</h2>
    <p>${tr("Aura Work uses a TypeScript-first i18n approach. Translation catalogs live in packages/i18n/src/catalog.ts and define locale IDs, native names, RTL flags, and date/number formats. The build pipeline exports JSON files consumed by the UI.")}</p>
    <div class="section-label">${tr("Adding a language")}</div>
    <ul>
      <li>${tr("Add your locale ID to SUPPORTED_LOCALES")}</li>
      <li>${tr("Create a JSON translation file")}</li>
      <li>${tr("Optionally set RTL if your script is right-to-left")}</li>
      <li>${tr("Submit a pull request")}</li>
    </ul>
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
  </section>
  <section class="section">
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
  </section>`;
  return wrapPageAr(tr("Themes"), body, "themes");
}

function generatePermissionsAr() {
  const body = `<div class="hero">
    <h1><span>${tr("Permissions")}</span></h1>
    <p class="subtitle">${tr("permission profiles controlling what agents can do")}</p>
  </div>
  <section class="section">
    <p>${tr("Aura Work uses a tiered permission system with 3 built-in profiles. Each profile grants progressively more access to system resources and tools.")}</p>
    <div class="section-label">${tr("Permission Profiles")}</div>
    <div class="detail-card"><h3><span style="display:inline-flex;width:10px;height:10px;border-radius:50%;background:#4b5bb0;flex-shrink:0"></span> ${tr("Read-Only")}</h3><p>${tr("Read files, search code, browse the web. No modifications to the file system, no code execution, no network calls to external services.")}</p></div>
    <div class="detail-card"><h3><span style="display:inline-flex;width:10px;height:10px;border-radius:50%;background:#a9761f;flex-shrink:0"></span> ${tr("Safe Automation")}</h3><p>${tr("Read and write files, execute approved commands, access network. Sandboxed execution with resource limits and audit logging.")}</p></div>
    <div class="detail-card"><h3><span style="display:inline-flex;width:10px;height:10px;border-radius:50%;background:#c2683f;flex-shrink:0"></span> ${tr("Research")}</h3><p>${tr("Full system access including file system, network, code execution, browser automation, and system commands. All actions are logged and reversible.")}</p></div>
  </section>
  <section class="section">
    <div class="section-label">${tr("Customization")}</div>
    <h2>${tr("Creating a custom profile")}</h2>
    <p>${tr("Define custom profiles in your settings.json by combining individual permissions. Each permission grants access to a specific capability (files.read, files.write, network.http, etc.).")}</p>
    <pre><code>{
  "profiles": [
    {
      "id": "my-custom-profile",
      "permissions": ["files.read", "files.write", "network.http"],
      "extends": "safe-automation"
    }
  ]
}</code></pre>
  </section>`;
  return wrapPageAr(tr("Permissions"), body, "permissions");
}

function generateArchitectureAr() {
  const body = `<div class="hero">
    <h1><span>${tr("Architecture")}</span></h1>
    <p class="subtitle">${tr("Deep dive into the multi-process architecture")}</p>
  </div>
  <section class="section">
    <p>${tr("Aura Work is built on a multi-process architecture using Tauri 2 as the desktop shell, React 19 for the UI, and Rust for core services. Sidecar processes run independently and communicate via IPC.")}</p>
    <div class="section-label">${tr("Tech Stack")}</div>
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">Tauri 2</div><div class="lbl">${tr("Desktop shell with native OS integration")}</div></div>
      <div class="stat-card fade-in delay-2"><div class="num">React 19</div><div class="lbl">${tr("UI framework with streaming SSR support")}</div></div>
      <div class="stat-card fade-in delay-3"><div class="num">Rust</div><div class="lbl">${tr("Core backend services and security")}</div></div>
      <div class="stat-card fade-in delay-4"><div class="num">TypeScript</div><div class="lbl">${tr("Full-stack type safety across the project")}</div></div>
    </div>
  </section>
  <section class="section">
    <div class="section-label">${tr("Process Model")}</div>
    <h2>${tr("Process Model")}</h2>
    <p>${tr("The desktop app spawns sidecar processes on startup. Each sidecar runs as a separate OS process with its own lifecycle. Communication happens over a secure IPC bridge.")}</p>
    <pre><code>┌─────────────────────────────────────────┐
│           Tauri 2 (Desktop Shell)        │
│  ┌────────────────────────────────────┐  │
│  │  React 19 UI (WebView)             │  │
│  └─────────────┬──────────────────────┘  │
│                │ IPC                      │
│  ┌─────────────▼──────────────────────┐  │
│  │  Bridge Sidecar (Rust/Node.js)     │  │
│  └─────────────┬──────────────────────┘  │
├────────────────┼─────────────────────────┤
│  ┌─────────────▼──────────────┐          │
│  │  Agent Sidecar             │          │
│  │  • Planner                 │          │
│  │  • Executor                │          │
│  │  • Reviewer                │          │
│  └─────────────────────────────┘          │
│  ┌─────────────┬──────────────┐           │
│  │ Skills      │  MCP Servers │           │
│  └─────────────┴──────────────┘           │
└─────────────────────────────────────────┘</code></pre>
  </section>
  <section class="section">
    <div class="section-label">${tr("Security Model")}</div>
    <h2>${tr("Security Model")}</h2>
    <p>${tr("All sidecar processes run with minimal permissions. The credential store uses OS-level encryption (Keytar). Code execution is sandboxed in isolated VMs.")}</p>
  </section>`;
  return wrapPageAr(tr("Architecture"), body, "architecture");
}

function generateCLIAr() {
  const body = `<div class="hero">
    <h1><span>${tr("CLI")}</span></h1>
    <p class="subtitle">${tr("The command-line interface for remote agent control, scriptable workflows, and CI/CD integration.")}</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">CLI</div><div class="lbl">${tr("CLI Features")}</div></div>
    </div>
    <p>${tr("The CLI client connects to a running Aura Work instance over a local socket. It authenticates using the same credential store as the desktop app and supports all the same skills, providers, and routing policies.")}</p>
    <pre><code># ربط CLI بنسخة Aura Work عاملة
aura connect

# تشغيل مهمة
aura run "اكتب اختبارات لوحدة المصادقة"

# سير عمل قابل للبرمجة
aura run --script workflow.json

# إخراج JSON
aura run "حلل هذا الكود" --json</code></pre>
    <div class="detail-card"><h3>${tr("Remote agent control from terminal")}</h3></div>
    <div class="detail-card"><h3>${tr("Scriptable workflows for automation")}</h3></div>
    <div class="detail-card"><h3>${tr("CI/CD pipeline integration")}</h3></div>
    <div class="detail-card"><h3>${tr("Multiple session management")}</h3></div>
    <div class="detail-card"><h3>${tr("JSON output for tooling")}</h3></div>
  </section>`;
  return wrapPageAr(tr("CLI"), body, "cli");
}

function generateMCPAr() {
  const body = `<div class="hero">
    <h1><span>${tr("MCP")}</span></h1>
    <p class="subtitle">${tr("The Model Context Protocol integration for connecting third-party tools and services.")}</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">MCP</div><div class="lbl">${tr("MCP Features")}</div></div>
    </div>
    <p>${tr("Aura Work implements the Model Context Protocol (MCP) specification. MCP servers register tools that the agent can discover and invoke at runtime. Each tool is sandboxed by the permission system and can be added dynamically without restarting the agent.")}</p>
    <div class="detail-card"><h3>${tr("Third-party tool integration")}</h3></div>
    <div class="detail-card"><h3>${tr("Standardized protocol for tool discovery")}</h3></div>
    <div class="detail-card"><h3>${tr("Dynamic tool registration at runtime")}</h3></div>
    <div class="detail-card"><h3>${tr("Sandboxed execution with permission gating")}</h3></div>
    <div class="detail-card"><h3>${tr("Community MCP server marketplace")}</h3></div>
  </section>`;
  return wrapPageAr(tr("MCP"), body, "mcp");
}

function generateSidecarsAr() {
  const sidecars = getSidecars();
  const sidecarNames = {
    "agent": tr("Agent"), "bridge": tr("Bridge"), "browser-helper": tr("Browser Helper"),
    "cloud-sync": tr("Cloud Sync"), "computer-use": tr("Computer Use"),
    "vm-helper": tr("VM Helper"), "plugins-helper": tr("Plugins Helper"), "prompt-system": tr("Prompt System")
  };
  const sidecarDesc = {
    "agent": tr("Core agent execution engine"), "bridge": tr("Communication bridge between processes"),
    "browser-helper": tr("Browser automation and web scraping"),
    "cloud-sync": tr("Sync state and configuration across devices"),
    "computer-use": tr("Desktop automation (mouse, keyboard, files)"),
    "vm-helper": tr("Sandboxed code execution in isolated VMs"),
    "plugins-helper": tr("Dynamic plugin loading and management"),
    "prompt-system": tr("System prompt management and templating"),
  };
  const sidecarIcons = { "agent": "◎", "bridge": "⇄", "browser-helper": "◉", "cloud-sync": "☁", "computer-use": "🖥", "vm-helper": "▣", "plugins-helper": "◆", "prompt-system": "☆" };

  const body = `<div class="hero">
    <h1><span>${tr("Sidecars")}</span></h1>
    <p class="subtitle">${sidecars.length} ${tr("modular background services that extend the agent platform")}</p>
  </div>
  <section class="section">
    <div class="stats-bar">
      <div class="stat-card fade-in delay-1"><div class="num">${sidecars.length}</div><div class="lbl">${tr("Total Sidecars")}</div></div>
    </div>
    <p>${tr("Aura Work runs 8 sidecar processes — independent Node.js daemons that provide specialized services to the agent engine. Each sidecar runs in its own process and communicates via IPC.")}</p>
    <div class="card-grid">
      ${sidecars.map((s, i) => `<div class="detail-card fade-in delay-${(i % 4) + 1}">
        <h3><span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:#1988a2;color:#fff;font-size:.75rem;font-family:var(--font-mono);flex-shrink:0">${sidecarIcons[s] || "◆"}</span> ${sidecarNames[s] || s}</h3>
        <p>${sidecarDesc[s] || ""}</p>
      </div>`).join("\n")}
    </div>
  </section>`;
  return wrapPageAr(tr("Sidecars"), body, "sidecars");
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
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=https://hbx12.github.io/aura-work/docs/docs.ar.html"><title>تحويل</title></head><body><a href="https://hbx12.github.io/aura-work/docs/docs.ar.html">الوثائق</a></body></html>`;
writeFileSync(join(DOCS_DIR, "docs", "index.ar.html"), redirect, "utf-8");
console.log("  ✓ /docs/docs/index.ar.html (redirect)");

console.log(`\n✅ Done! All Arabic pages generated in docs/docs/`);
