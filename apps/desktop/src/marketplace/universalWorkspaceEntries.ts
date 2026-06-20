import type { MarketplaceEntry, MarketplaceTool } from "@aura-os/shared";

type LocalizedFields = Record<string, {
  name?: string;
  summary?: string;
  description?: string;
  setup?: string[];
  tools?: MarketplaceTool[];
  categories?: string[];
}>;

type UniversalEntry = Omit<MarketplaceEntry, "type" | "version" | "publisher" | "risk" | "auth" | "permissions" | "setup" | "homepage" | "repository" | "license"> & {
  localized?: LocalizedFields;
  risk?: MarketplaceEntry["risk"];
  setup?: string[];
  permissions?: string[];
};

const publisher = { name: "HBX", github: "hbx12", verified: true };

function svgDataUri(title: string, glyph: string, from: string, to: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-opacity="0.25"/></filter></defs><rect width="240" height="160" rx="28" fill="url(#g)"/><circle cx="198" cy="28" r="44" fill="rgba(255,255,255,0.12)"/><circle cx="36" cy="138" r="54" fill="rgba(0,0,0,0.14)"/><rect x="26" y="28" width="188" height="104" rx="22" fill="rgba(10,10,10,0.36)" stroke="rgba(255,255,255,0.22)"/><text x="54" y="89" font-size="42" font-family="Arial, sans-serif" filter="url(#s)">${glyph}</text><text x="112" y="76" font-size="18" font-weight="700" font-family="Arial, sans-serif" fill="white">${title}</text><text x="112" y="102" font-size="12" font-family="Arial, sans-serif" fill="rgba(255,255,255,0.74)">Aura Work by HBX</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function skill(entry: UniversalEntry): MarketplaceEntry {
  return {
    type: "skill",
    version: "1.0.0",
    publisher,
    risk: "low",
    auth: { type: "none" },
    permissions: ["read_file", "write_file", "browse_url", "run_shell"],
    setup: ["Install the skill.", "Ask Aura Work for the artifact you want.", "Review generated edits when the app asks."],
    homepage: "https://github.com/hbx12/aura-work",
    repository: "https://github.com/hbx12/aura-work",
    license: "MIT",
    ...entry,
  } as MarketplaceEntry;
}

function tools(items: [string, string][]): MarketplaceTool[] {
  return items.map(([name, description]) => ({ name, description }));
}

export const universalWorkspaceEntries: MarketplaceEntry[] = [
  skill({
    id: "skill.aura-documents",
    name: "Aura Documents",
    summary: "Create and edit formal documents, letters, reports, resumes, and policies.",
    description: "A document specialist for Word-style work. It understands requests like ملف نص, خطاب, تقرير, عقد, or سيرة ذاتية and treats the document as the deliverable.",
    icon: svgDataUri("Docs", "▤", "#3b0764", "#9333ea"),
    cover: svgDataUri("Documents", "▤", "#18181b", "#7c3aed"),
    categories: ["Documents", "Productivity", "Writing"],
    tags: ["docx", "word", "writing", "reports", "resume"],
    install: { kind: "skill", prompt: "You are Aura Documents. Create and edit structured documents in the user's language. Use headings, sections, tables, and clear formatting. Prefer document-style output for formal text, Markdown for drafts, and plain text only when requested." },
    tools: tools([["document_create", "Draft structured documents."], ["document_edit", "Apply focused document edits."], ["document_export", "Prepare document-style outputs."]]),
    localized: { ar: { name: "Aura للمستندات", summary: "ينشئ ويعدل الخطابات والتقارير والسير الذاتية والملفات النصية الرسمية.", description: "مهارة للمستندات تفهم طلبات مثل ملف نص، خطاب، تقرير، عقد، أو سيرة ذاتية.", setup: ["ثبّت المهارة.", "اطلب المستند بلغتك الطبيعية.", "راجع التعديل عند طلب الإذن."], categories: ["مستندات", "إنتاجية", "كتابة"], tools: tools([["إنشاء مستند", "كتابة مستند منظم."], ["تعديل مستند", "تعديلات دقيقة."], ["تصدير", "تجهيز الناتج."]]) } }
  }),
  skill({
    id: "skill.aura-spreadsheets",
    name: "Aura Spreadsheets",
    summary: "Build Excel-style tables, budgets, trackers, formulas, charts, and dashboards.",
    description: "A spreadsheet analyst for tables, budgets, expenses, sales, CSV analysis, formulas, dashboards, and charts.",
    icon: svgDataUri("Sheets", "▦", "#064e3b", "#22c55e"),
    cover: svgDataUri("Spreadsheets", "▦", "#052e16", "#16a34a"),
    categories: ["Spreadsheets", "Data", "Productivity"],
    tags: ["xlsx", "excel", "csv", "tables", "charts", "budget"],
    install: { kind: "skill", prompt: "You are Aura Spreadsheets. If the user asks for a table, spreadsheet, budget, expenses, sales, CSV, formula, chart, or dashboard, infer spreadsheet work. Prefer formulas for visible calculations, protect existing data, and verify ranges and totals." },
    tools: tools([["spreadsheet_create", "Create tables and spreadsheet files."], ["spreadsheet_formula", "Add formulas for visible calculations."], ["spreadsheet_chart", "Create charts and summaries."]]),
    localized: { ar: { name: "Aura للجداول", summary: "ينشئ جداول Excel وميزانيات ومصاريف وفورملا ورسوم ولوحات متابعة.", description: "مهارة تفهم طلبات الجداول والميزانيات والمصاريف وCSV والرسوم.", setup: ["ثبّت المهارة.", "قل مثلًا: اعمل لي جدول مصاريف شهرية.", "راجع الملف الناتج."], categories: ["جداول", "بيانات", "إنتاجية"], tools: tools([["إنشاء جدول", "إنشاء جداول متوافقة مع Excel."], ["معادلات", "إضافة حسابات قابلة للفحص."], ["رسوم", "إنشاء رسوم ولوحات متابعة."]]) } }
  }),
  skill({
    id: "skill.aura-presentations",
    name: "Aura Presentations",
    summary: "Create PowerPoint-style decks with storylines, slide structure, and visual polish.",
    description: "A presentation designer for slides, lessons, proposals, timelines, pitch decks, and visual reports.",
    icon: svgDataUri("Slides", "▣", "#7c2d12", "#f97316"),
    cover: svgDataUri("Presentations", "▣", "#431407", "#ea580c"),
    categories: ["Presentations", "Design", "Productivity"],
    tags: ["pptx", "powerpoint", "slides", "pitch", "deck"],
    install: { kind: "skill", prompt: "You are Aura Presentations. If the user asks for slides, PowerPoint, a pitch deck, a lesson, or a proposal, infer presentation work. Plan a clear storyline, write concise slide copy, and verify readability and layout." },
    tools: tools([["deck_storyline", "Plan slide titles and flow."], ["slide_create", "Create slide content."], ["slide_verify", "Check readability and layout."]]),
    localized: { ar: { name: "Aura للعروض", summary: "ينشئ عروض بوربوينت بشرائح مرتبة وقصة واضحة وشكل احترافي.", description: "مهارة للعروض والشرائح والمحاضرات والـ pitch decks.", setup: ["ثبّت المهارة.", "اطلب عرضك مثل: سو لي بوربوينت.", "راجع خطة الشرائح عند الحاجة."], categories: ["عروض", "تصميم", "إنتاجية"], tools: tools([["قصة العرض", "تخطيط تسلسل الشرائح."], ["إنشاء شرائح", "بناء محتوى الشرائح."], ["فحص العرض", "فحص القراءة والتنسيق."]]) } }
  }),
  skill({
    id: "skill.aura-pdf",
    name: "Aura PDF",
    summary: "Summarize, convert, search, and extract tables from PDFs.",
    description: "A PDF specialist for summaries, questions, table extraction, conversion, and report generation.",
    icon: svgDataUri("PDF", "◫", "#7f1d1d", "#ef4444"),
    cover: svgDataUri("PDF Tools", "◫", "#450a0a", "#dc2626"),
    categories: ["PDF", "Documents", "Research"],
    tags: ["pdf", "summary", "ocr", "tables", "conversion"],
    install: { kind: "skill", prompt: "You are Aura PDF. Summarize, search, convert, and extract tables from PDFs. Preserve page references when possible and flag unclear text or layout uncertainty." },
    tools: tools([["pdf_summarize", "Summarize with page references."], ["pdf_extract_tables", "Extract tables."], ["pdf_convert", "Prepare PDF content for another format."]]),
    localized: { ar: { name: "Aura للـ PDF", summary: "يلخص ويحوّل ويبحث داخل ملفات PDF ويستخرج الجداول.", description: "مهارة للـ PDF تلخص وتستخرج الجداول وتحول المحتوى.", setup: ["ثبّت المهارة.", "ارفع PDF أو اطلب تلخيصه.", "اطلب استخراج الجداول عند الحاجة."], categories: ["PDF", "مستندات", "بحث"], tools: tools([["تلخيص PDF", "تلخيص مع مراجع صفحات."], ["استخراج الجداول", "استخراج الجداول."], ["تحويل", "تجهيز المحتوى لصيغة أخرى."]]) } }
  }),
  skill({
    id: "skill.aura-research",
    name: "Aura Research",
    summary: "Research, compare, verify sources, and create cited reports.",
    description: "A research assistant for current facts, comparisons, market research, academic topics, product research, and source-backed reports.",
    icon: svgDataUri("Research", "⌕", "#0f172a", "#2563eb"),
    cover: svgDataUri("Research", "⌕", "#020617", "#1d4ed8"),
    categories: ["Research", "Web", "Reports"],
    tags: ["research", "web", "citations", "comparison", "sources"],
    install: { kind: "skill", prompt: "You are Aura Research. For search, comparison, current information, prices, laws, products, travel, market research, or niche facts, use research tools when available. Prefer official sources and cite claims." },
    tools: tools([["research_plan", "Plan source strategy."], ["source_compare", "Compare sources."], ["cited_report", "Create reports with citations."]]),
    localized: { ar: { name: "Aura للبحث", summary: "يبحث ويقارن ويتحقق من المصادر وينشئ تقارير موثقة.", description: "مهارة للبحث والمقارنات والمعلومات الحديثة والتقارير الموثقة.", setup: ["ثبّت المهارة.", "اطلب بحثًا أو مقارنة.", "راجع المصادر والنتائج."], categories: ["بحث", "ويب", "تقارير"], tools: tools([["خطة بحث", "تحديد نطاق البحث."], ["مقارنة مصادر", "مقارنة النتائج."], ["تقرير موثق", "إنشاء تقرير بالمصادر."]]) } }
  }),
  skill({
    id: "skill.aura-image-studio",
    name: "Aura Image Studio",
    summary: "Create banners, icons, posters, image prompts, and visual assets.",
    description: "A visual asset specialist for banners, icons, social images, posters, product visuals, and image briefs.",
    icon: svgDataUri("Images", "◆", "#701a75", "#ec4899"),
    cover: svgDataUri("Image Studio", "◆", "#4a044e", "#db2777"),
    categories: ["Images", "Design", "Marketing"],
    tags: ["image", "banner", "icon", "poster", "logo"],
    install: { kind: "skill", prompt: "You are Aura Image Studio. Create strong image briefs, banners, icons, posters, and visual asset plans. Respect exact dimensions, brand identity, readable text, and composition." },
    tools: tools([["image_brief", "Create image briefs."], ["banner_design", "Design banner directions."], ["icon_logo_concept", "Create icon and logo concepts."]]),
    localized: { ar: { name: "Aura للصور", summary: "ينشئ بانرات وأيقونات وبوسترات ووصف صور احترافي.", description: "مهارة للتصاميم البصرية والبانرات والأيقونات والبوسترات.", setup: ["ثبّت المهارة.", "اكتب طلب التصميم والمقاس.", "راجع الوصف أو الملف الناتج."], categories: ["صور", "تصميم", "تسويق"], tools: tools([["وصف صورة", "صياغة وصف دقيق."], ["تصميم بانر", "إعداد بانرات."], ["أيقونة/لوقو", "اقتراح اتجاهات بصرية."]]) } }
  }),
  skill({
    id: "skill.aura-data-analyst",
    name: "Aura Data Analyst",
    summary: "Clean, analyze, visualize, and explain datasets.",
    description: "A data analyst for CSV, Excel, JSON, logs, survey data, and business metrics.",
    icon: svgDataUri("Data", "◬", "#083344", "#06b6d4"),
    cover: svgDataUri("Data Analyst", "◬", "#164e63", "#0891b2"),
    categories: ["Data", "Analytics", "Charts"],
    tags: ["data", "csv", "analytics", "charts", "statistics"],
    install: { kind: "skill", prompt: "You are Aura Data Analyst. Profile data before conclusions. Check columns, missing values, duplicates, and anomalies. Use charts when helpful and explain findings in plain language." },
    tools: tools([["data_profile", "Inspect schema and missing values."], ["data_clean", "Prepare data."], ["data_visualize", "Create charts and summaries."]]),
    localized: { ar: { name: "Aura لتحليل البيانات", summary: "ينظف ويحلل البيانات وينشئ رسومًا وملخصات واضحة.", description: "مهارة لتحليل CSV وExcel وJSON والاستبيانات والمبيعات.", setup: ["ثبّت المهارة.", "ارفع ملف البيانات أو اشرحها.", "اطلب تحليلًا أو رسومًا."], categories: ["بيانات", "تحليلات", "رسوم"], tools: tools([["فحص البيانات", "قراءة الأعمدة والقيم الناقصة."], ["تنظيف", "ترتيب البيانات."], ["تصور", "إنشاء رسوم ونتائج."]]) } }
  }),
  skill({
    id: "skill.aura-file-converter",
    name: "Aura File Converter",
    summary: "Convert files between Markdown, CSV, HTML, text, document, and report formats.",
    description: "A file conversion specialist that chooses the right target format from natural language and preserves structure.",
    icon: svgDataUri("Convert", "⇄", "#1e1b4b", "#6366f1"),
    cover: svgDataUri("File Converter", "⇄", "#111827", "#4f46e5"),
    categories: ["Files", "Conversion", "Productivity"],
    tags: ["convert", "files", "markdown", "csv", "html", "txt"],
    install: { kind: "skill", prompt: "You are Aura File Converter. Infer target format from the request and preserve headings, lists, tables, links, and source data. Use Markdown for reports, CSV for tables, HTML for previews, and TXT only when requested." },
    tools: tools([["format_infer", "Infer the output format."], ["convert_content", "Convert while preserving structure."], ["verify_output", "Verify generated files."]]),
    localized: { ar: { name: "Aura لتحويل الملفات", summary: "يحوّل الملفات بين Markdown وCSV وHTML والنصوص والتقارير.", description: "مهارة لتحويل المحتوى مع الحفاظ على العناوين والجداول والقوائم.", setup: ["ثبّت المهارة.", "اطلب التحويل.", "راجع الملف الناتج."], categories: ["ملفات", "تحويل", "إنتاجية"], tools: tools([["تحديد الصيغة", "فهم الصيغة المناسبة."], ["تحويل المحتوى", "تحويل مع الحفاظ على البنية."], ["التحقق", "فحص الناتج."]]) } }
  }),
  skill({
    id: "skill.aura-automation",
    name: "Aura Automation",
    summary: "Plan and run repeatable workflows, reminders, browser tasks, and connector actions.",
    description: "An automation planner for scheduled work, browser actions, file workflows, and connector-based workflows.",
    icon: svgDataUri("Auto", "⚙", "#312e81", "#8b5cf6"),
    cover: svgDataUri("Automation", "⚙", "#1e1b4b", "#7c3aed"),
    categories: ["Automation", "Workflow", "Productivity"],
    tags: ["automation", "schedule", "browser", "workflow", "tasks"],
    risk: "medium",
    install: { kind: "skill", prompt: "You are Aura Automation. For automation, schedules, monitoring, repeated workflows, organization, or browser tasks, identify steps, needed connectors, approval points, and verification. Use available tools directly when present." },
    tools: tools([["workflow_plan", "Break work into safe steps."], ["approval_points", "Identify confirmation points."], ["automation_verify", "Check workflow completion."]]),
    localized: { ar: { name: "Aura للأتمتة", summary: "يخطط وينفذ مهام متكررة وتذكيرات وتصفح وتكاملات بأمان.", description: "مهارة للأتمتة والجداول والتنبيهات وسير العمل.", setup: ["ثبّت المهارة.", "اشرح المهمة أو سير العمل.", "وافق على الإجراءات عند الحاجة."], categories: ["أتمتة", "سير عمل", "إنتاجية"], tools: tools([["خطة سير العمل", "تقسيم الأتمتة إلى خطوات."], ["نقاط موافقة", "تحديد ما يحتاج تأكيد."], ["تحقق", "فحص اكتمال العمل."]]) } }
  })
];
