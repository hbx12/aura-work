import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryDir = path.join(root, "registry");
const skillsDir = path.join(registryDir, "skills");
const assetsDir = path.join(registryDir, "assets");
const aggregatePath = path.join(registryDir, "marketplace.json");

const publisher = {
  name: "HBX",
  github: "hbx12",
  verified: true,
};

const entries = [
  {
    slug: "aura-documents",
    name: "Aura Documents",
    arName: "Aura للمستندات",
    summary: "Create and edit document-style files, reports, letters, resumes, and policies.",
    arSummary: "ينشئ ويعدل المستندات والتقارير والخطابات والسير الذاتية والسياسات.",
    description:
      "A document workspace skill for structured writing. It routes formal text, letters, reports, resumes, policies, and contract drafts into artifact-first document work. It uses available file tools to create Markdown or text deliverables now, keeps DOCX/PDF export as an explicit tool-backed path when available, and verifies generated content before completion.",
    arDescription:
      "مهارة للمستندات والكتابة المنظمة. تفهم الخطابات والتقارير والسير الذاتية والسياسات والعقود كعمل على ملف حقيقي. تستخدم أدوات الملفات المتاحة لإنشاء Markdown أو نص حالياً، ولا تدعي تصدير DOCX/PDF إلا عند توفر أداة فعلية، وتتحقق من الناتج قبل الإنهاء.",
    categories: ["Documents", "Productivity", "Business"],
    arCategories: ["مستندات", "إنتاجية", "أعمال"],
    tags: ["document", "markdown", "report", "letter", "resume"],
    risk: "low",
    permissions: ["read_file", "write_file"],
    tools: [
      ["document_create", "Create structured Markdown or text documents using file tools."],
      ["document_edit", "Apply targeted edits to existing document files."],
      ["document_verify", "Read back generated document content and check headings, tables, and references."],
    ],
    arTools: [
      ["إنشاء مستند", "إنشاء مستند Markdown أو نص منظم باستخدام أدوات الملفات."],
      ["تعديل مستند", "تطبيق تعديلات محددة على ملفات مستندات موجودة."],
      ["تحقق", "قراءة الناتج والتحقق من العناوين والجداول والمراجع."],
    ],
    colors: ["#111827", "#7c3aed"],
    icon: "document",
  },
  {
    slug: "aura-spreadsheets",
    name: "Aura Spreadsheets",
    arName: "Aura للجداول",
    summary: "Build spreadsheet-style tables, budgets, CSV files, formulas, and analysis reports.",
    arSummary: "ينشئ جداول وميزانيات وملفات CSV ومعادلات وتقارير تحليلية.",
    description:
      "A spreadsheet workspace skill for budgets, expenses, sales tables, formulas, CSV analysis, and dashboard-ready tabular outputs. It creates real CSV/Markdown table files with available tools now, uses XLSX export only when a real workbook tool is available, and verifies totals, ranges, and formulas when present.",
    arDescription:
      "مهارة للجداول والميزانيات والمصاريف والمبيعات والمعادلات وتحليل CSV. تنشئ ملفات CSV أو جداول Markdown حقيقية بالأدوات المتاحة حالياً، ولا تستخدم XLSX إلا عند توفر أداة workbook فعلية، وتتحقق من الإجماليات والنطاقات والمعادلات.",
    categories: ["Spreadsheets", "Data", "Productivity"],
    arCategories: ["جداول", "بيانات", "إنتاجية"],
    tags: ["spreadsheet", "csv", "budget", "formula", "dashboard"],
    risk: "low",
    permissions: ["read_file", "write_file"],
    tools: [
      ["spreadsheet_create_table", "Create CSV or Markdown table artifacts."],
      ["spreadsheet_set_formula", "Represent formulas clearly when workbook tooling is available."],
      ["spreadsheet_verify", "Check totals, ranges, and obvious table errors."],
    ],
    arTools: [
      ["إنشاء جدول", "إنشاء CSV أو جدول Markdown كملف حقيقي."],
      ["معادلات", "تمثيل المعادلات بوضوح عند توفر أدوات workbook."],
      ["تحقق", "فحص الإجماليات والنطاقات والأخطاء الواضحة."],
    ],
    colors: ["#052e16", "#16a34a"],
    icon: "spreadsheet",
  },
  {
    slug: "aura-presentations",
    name: "Aura Presentations",
    arName: "Aura للعروض",
    summary: "Plan and create presentation storylines, slide outlines, and deck-ready files.",
    arSummary: "يخطط وينشئ قصص العروض ومخططات الشرائح وملفات جاهزة للتحويل.",
    description:
      "A presentation workspace skill for slide decks, pitch decks, lessons, timelines, proposals, and visual reports. It creates storyline and slide-outline artifacts now, uses PPTX only with a real presentation export tool, and verifies readability, flow, and slide density.",
    arDescription:
      "مهارة للعروض والشرائح والـ pitch decks والدروس والمقترحات والتقارير البصرية. تنشئ Storyline ومخططات شرائح كملفات حقيقية حالياً، ولا تستخدم PPTX إلا عند توفر أداة تصدير فعلية، وتتحقق من القراءة والتسلسل وكثافة الشرائح.",
    categories: ["Presentations", "Design", "Business"],
    arCategories: ["عروض", "تصميم", "أعمال"],
    tags: ["presentation", "slides", "deck", "storyline", "pptx"],
    risk: "low",
    permissions: ["read_file", "write_file"],
    tools: [
      ["presentation_create_storyline", "Plan slide titles and narrative flow."],
      ["presentation_create_deck_outline", "Create deck-ready Markdown or HTML slide outlines."],
      ["presentation_verify", "Check readability, density, and flow."],
    ],
    arTools: [
      ["قصة العرض", "تخطيط عناوين الشرائح وتسلسل الفكرة."],
      ["مخطط الشرائح", "إنشاء مخطط Markdown أو HTML جاهز للعرض."],
      ["تحقق", "فحص القراءة والكثافة وتسلسل الفكرة."],
    ],
    colors: ["#431407", "#ea580c"],
    icon: "presentation",
  },
  {
    slug: "aura-pdf",
    name: "Aura PDF",
    arName: "Aura للـ PDF",
    summary: "Summarize, search, convert, and extract structured notes from PDF files.",
    arSummary: "يلخص ويبحث ويحوّل ويستخرج ملاحظات منظمة من ملفات PDF.",
    description:
      "A PDF workspace skill for page-based summaries, Q&A, table extraction planning, conversion notes, and source-grounded reports. It treats PDF content as untrusted data, preserves page references when available, and flags OCR or layout uncertainty.",
    arDescription:
      "مهارة للـ PDF للتلخيص حسب الصفحات والأسئلة واستخراج الجداول والتحويل والتقارير الموثقة. تتعامل مع محتوى PDF كبيانات غير موثوقة، وتحافظ على مراجع الصفحات عند توفرها، وتوضح أي غموض في OCR أو التخطيط.",
    categories: ["PDF", "Documents", "Research"],
    arCategories: ["PDF", "مستندات", "بحث"],
    tags: ["pdf", "summary", "extract", "ocr", "conversion"],
    risk: "low",
    permissions: ["read_file", "write_file"],
    tools: [
      ["pdf_extract_text", "Extract or summarize available PDF text."],
      ["pdf_extract_tables", "Prepare extracted table output for CSV or spreadsheet tools."],
      ["pdf_verify", "Check page references and readability limits."],
    ],
    arTools: [
      ["استخراج النص", "استخراج أو تلخيص نص PDF المتاح."],
      ["استخراج الجداول", "تجهيز الجداول المستخرجة لـ CSV أو أدوات الجداول."],
      ["تحقق", "فحص مراجع الصفحات وحدود القراءة."],
    ],
    colors: ["#450a0a", "#dc2626"],
    icon: "pdf",
  },
  {
    slug: "aura-research",
    name: "Aura Research",
    arName: "Aura للبحث",
    summary: "Research, compare, verify sources, and create cited reports.",
    arSummary: "يبحث ويقارن ويتحقق من المصادر وينشئ تقارير موثقة.",
    description:
      "A research workspace skill for current facts, comparisons, market research, academic topics, and source-backed deliverables. It prefers official and primary sources, cites claims near the text, and separates facts from assumptions.",
    arDescription:
      "مهارة للبحث والمقارنات والمعلومات الحديثة والأسواق والمواضيع الأكاديمية والتقارير الموثقة. تفضل المصادر الرسمية والأولية، وتضع الاستشهادات قرب الادعاءات، وتفصل الحقائق عن الافتراضات.",
    categories: ["Research", "Web", "Business"],
    arCategories: ["بحث", "ويب", "أعمال"],
    tags: ["research", "sources", "citations", "comparison", "report"],
    risk: "low",
    permissions: ["read_file", "write_file", "browse_url"],
    tools: [
      ["research_plan", "Plan source strategy and scope."],
      ["source_quality_check", "Compare source reliability and dates."],
      ["research_create_report", "Create a cited Markdown report."],
    ],
    arTools: [
      ["خطة بحث", "تحديد نطاق البحث والمصادر."],
      ["فحص المصادر", "مقارنة موثوقية المصادر وتواريخها."],
      ["تقرير موثق", "إنشاء تقرير Markdown مع الاستشهادات."],
    ],
    colors: ["#020617", "#2563eb"],
    icon: "research",
  },
  {
    slug: "aura-image-studio",
    name: "Aura Image Studio",
    arName: "Aura للصور",
    summary: "Create image briefs, banners, icons, SVG concepts, and visual asset plans.",
    arSummary: "ينشئ أوصاف صور وبانرات وأيقونات ومفاهيم SVG وخطط أصول بصرية.",
    description:
      "A visual asset workspace skill for image briefs, banners, posters, icons, logo concepts, and SVG outputs. It respects exact dimensions, brand constraints, readability, contrast, and layout verification.",
    arDescription:
      "مهارة للأصول البصرية مثل أوصاف الصور والبانرات والبوسترات والأيقونات ومفاهيم الشعارات وملفات SVG. تراعي المقاسات والهوية ووضوح النص والتباين وتتحقق من التخطيط.",
    categories: ["Images", "Design", "Marketing"],
    arCategories: ["صور", "تصميم", "تسويق"],
    tags: ["image", "banner", "icon", "svg", "poster"],
    risk: "low",
    permissions: ["read_file", "write_file"],
    tools: [
      ["image_create_brief", "Create precise generation or editing briefs."],
      ["image_export_svg", "Create simple SVG visual assets when appropriate."],
      ["image_verify", "Check dimensions, contrast, and text readability."],
    ],
    arTools: [
      ["وصف صورة", "صياغة وصف دقيق للتوليد أو التعديل."],
      ["تصدير SVG", "إنشاء أصول SVG بسيطة عند الحاجة."],
      ["تحقق", "فحص المقاس والتباين ووضوح النص."],
    ],
    colors: ["#4a044e", "#db2777"],
    icon: "image",
  },
  {
    slug: "aura-design-studio",
    name: "Aura Design Studio",
    arName: "Aura للتصميم",
    summary: "Create UI mockups, HTML previews, dashboards, landing pages, and design systems.",
    arSummary: "ينشئ واجهات وHTML previews ولوحات ومواقع تعريفية وأنظمة تصميم.",
    description:
      "A design workspace skill for UI screens, dashboards, landing pages, components, visual systems, and HTML/CSS previews. It verifies responsive layout, RTL behavior, spacing, contrast, and text overflow.",
    arDescription:
      "مهارة للتصميم والواجهات والداشبورد والصفحات التعريفية والمكونات وأنظمة التصميم وHTML/CSS previews. تتحقق من التجاوب وRTL والمسافات والتباين وتداخل النصوص.",
    categories: ["Design", "Productivity", "Marketing"],
    arCategories: ["تصميم", "إنتاجية", "تسويق"],
    tags: ["design", "ui", "html", "dashboard", "landing-page"],
    risk: "low",
    permissions: ["read_file", "write_file"],
    tools: [
      ["design_create_html", "Create HTML/CSS design previews."],
      ["design_update_html", "Refine existing design files."],
      ["design_verify", "Check responsive layout, RTL, and overflow."],
    ],
    arTools: [
      ["إنشاء HTML", "إنشاء معاينات تصميم HTML/CSS."],
      ["تحديث التصميم", "تحسين ملفات تصميم موجودة."],
      ["تحقق", "فحص التجاوب وRTL وتداخل النصوص."],
    ],
    colors: ["#172554", "#06b6d4"],
    icon: "design",
  },
  {
    slug: "aura-data-analyst",
    name: "Aura Data Analyst",
    arName: "Aura لتحليل البيانات",
    summary: "Profile, clean, transform, chart, and explain datasets.",
    arSummary: "يفحص وينظف ويحوّل ويرسم ويشرح البيانات.",
    description:
      "A data workspace skill for CSV, JSON, logs, survey data, metrics, and business datasets. It profiles columns first, checks missing values and duplicates, uses charts when helpful, and exports cleaned files or reports.",
    arDescription:
      "مهارة للبيانات مثل CSV وJSON والسجلات والاستبيانات والمؤشرات. تفحص الأعمدة أولاً، وتتحقق من القيم الناقصة والتكرارات، وتستخدم الرسوم عند فائدتها، وتصدر ملفات أو تقارير منظمة.",
    categories: ["Data", "Analytics", "Business"],
    arCategories: ["بيانات", "تحليلات", "أعمال"],
    tags: ["data", "csv", "json", "analytics", "charts"],
    risk: "low",
    permissions: ["read_file", "write_file"],
    tools: [
      ["data_profile", "Inspect schema, types, and missing values."],
      ["data_clean", "Normalize and deduplicate datasets."],
      ["data_export_report", "Create a cleaned data report or export."],
    ],
    arTools: [
      ["فحص البيانات", "فحص الأعمدة والأنواع والقيم الناقصة."],
      ["تنظيف", "ترتيب البيانات وإزالة التكرارات."],
      ["تقرير", "إنشاء تقرير أو تصدير منظم."],
    ],
    colors: ["#083344", "#0891b2"],
    icon: "data",
  },
  {
    slug: "aura-file-converter",
    name: "Aura File Converter",
    arName: "Aura لتحويل الملفات",
    summary: "Convert content between Markdown, CSV, HTML, text, and report formats.",
    arSummary: "يحوّل المحتوى بين Markdown وCSV وHTML والنصوص والتقارير.",
    description:
      "A file conversion workspace skill that infers target formats from natural language and preserves headings, lists, links, tables, and source data. It verifies converted files are readable before completion.",
    arDescription:
      "مهارة لتحويل الملفات تفهم الصيغة المطلوبة من كلام المستخدم وتحافظ على العناوين والقوائم والروابط والجداول والبيانات. تتحقق من قابلية قراءة الملف الناتج قبل الإنهاء.",
    categories: ["Files", "Conversion", "Productivity"],
    arCategories: ["ملفات", "تحويل", "إنتاجية"],
    tags: ["convert", "markdown", "csv", "html", "text"],
    risk: "low",
    permissions: ["read_file", "write_file"],
    tools: [
      ["format_infer", "Infer the safest output format."],
      ["convert_content", "Convert content while preserving structure."],
      ["verify_output", "Read back generated files."],
    ],
    arTools: [
      ["تحديد الصيغة", "استنتاج الصيغة المناسبة بأمان."],
      ["تحويل", "تحويل المحتوى مع الحفاظ على البنية."],
      ["تحقق", "قراءة الملف الناتج للتأكد."],
    ],
    colors: ["#1e1b4b", "#6366f1"],
    icon: "convert",
  },
  {
    slug: "aura-automation",
    name: "Aura Automation",
    arName: "Aura للأتمتة",
    summary: "Plan and run repeatable workflows, reminders, monitors, and connector actions.",
    arSummary: "يخطط وينفذ مهام متكررة وتذكيرات ومراقبة وتكاملات.",
    description:
      "An automation workspace skill for scheduled tasks, monitors, browser workflows, file workflows, and connector actions. It identifies approval points and never performs externally visible actions without explicit approval.",
    arDescription:
      "مهارة للأتمتة والجداول والمراقبة والتصفح وسير عمل الملفات والتكاملات. تحدد نقاط الموافقة ولا تنفذ أي إجراء خارجي واضح بدون موافقة صريحة.",
    categories: ["Automation", "Workflow", "Productivity"],
    arCategories: ["أتمتة", "سير عمل", "إنتاجية"],
    tags: ["automation", "schedule", "monitor", "workflow", "connector"],
    risk: "medium",
    permissions: ["read_file", "write_file", "browse_url"],
    tools: [
      ["automation_create_task", "Create a repeatable workflow plan."],
      ["automation_schedule", "Plan scheduled or recurring task behavior."],
      ["automation_verify", "Check that workflow outputs completed."],
    ],
    arTools: [
      ["إنشاء مهمة", "إنشاء خطة سير عمل قابلة للتكرار."],
      ["جدولة", "تخطيط مهمة مجدولة أو متكررة."],
      ["تحقق", "فحص اكتمال مخرجات سير العمل."],
    ],
    colors: ["#1e1b4b", "#8b5cf6"],
    icon: "automation",
  },
  {
    slug: "aura-database-analyst",
    name: "Aura Database Analyst",
    arName: "Aura لقواعد البيانات",
    summary: "Inspect schemas, write safe queries, explain plans, and export database reports.",
    arSummary: "يفحص المخططات ويكتب استعلامات آمنة ويشرح الخطط ويصدر تقارير قواعد البيانات.",
    description:
      "A database workspace skill for SQLite, Postgres, schema inspection, read-first querying, explain plans, exports, and migration planning. It asks before database writes or destructive migrations and flags sensitive fields.",
    arDescription:
      "مهارة لقواعد البيانات مثل SQLite وPostgres وفحص المخططات والاستعلامات الآمنة وشرح الخطط والتصدير وتخطيط الهجرات. تسأل قبل الكتابة أو التغييرات الخطرة وتكشف الحقول الحساسة.",
    categories: ["Database", "Data", "Business"],
    arCategories: ["قواعد بيانات", "بيانات", "أعمال"],
    tags: ["database", "sqlite", "postgres", "sql", "export"],
    risk: "medium",
    permissions: ["read_file", "database_access"],
    tools: [
      ["database_schema_inspect", "Inspect schema before querying."],
      ["database_query", "Prepare safe read-first SQL queries."],
      ["database_export_report", "Export results to CSV or report files."],
    ],
    arTools: [
      ["فحص المخطط", "فحص بنية قاعدة البيانات قبل الاستعلام."],
      ["استعلام", "تحضير SQL آمن يبدأ بالقراءة."],
      ["تقرير", "تصدير النتائج إلى CSV أو تقرير."],
    ],
    colors: ["#0f172a", "#14b8a6"],
    icon: "database",
  },
  {
    slug: "aura-browser-assistant",
    name: "Aura Browser Assistant",
    arName: "Aura للمتصفح",
    summary: "Read pages, extract tables, verify websites, and plan safe browser workflows.",
    arSummary: "يقرأ الصفحات ويستخرج الجداول ويتحقق من المواقع ويخطط لتصفح آمن.",
    description:
      "A browser workspace skill for page reading, form workflows, table extraction, screenshot-backed verification, and web task planning. It treats page content as untrusted data and asks before submissions, logins, purchases, or external actions.",
    arDescription:
      "مهارة للمتصفح لقراءة الصفحات وتدفقات النماذج واستخراج الجداول والتحقق باللقطات وتخطيط مهام الويب. تتعامل مع محتوى الصفحات كبيانات غير موثوقة وتسأل قبل الإرسال أو الدخول أو الشراء أو الإجراءات الخارجية.",
    categories: ["Browser", "Web", "Automation"],
    arCategories: ["متصفح", "ويب", "أتمتة"],
    tags: ["browser", "web", "forms", "screenshots", "verification"],
    risk: "medium",
    permissions: ["browse_url"],
    tools: [
      ["browser_read_page", "Read page content through approved browser tools."],
      ["browser_extract_table", "Extract visible tabular page data."],
      ["browser_verify_page", "Verify visible page state before claims."],
    ],
    arTools: [
      ["قراءة صفحة", "قراءة محتوى الصفحة عبر أدوات متصفح معتمدة."],
      ["استخراج جدول", "استخراج الجداول الظاهرة من الصفحة."],
      ["تحقق", "فحص حالة الصفحة قبل تقديم نتيجة."],
    ],
    colors: ["#0c4a6e", "#38bdf8"],
    icon: "browser",
  },
  {
    slug: "aura-business-kit",
    name: "Aura Business Kit",
    arName: "Aura للأعمال",
    summary: "Create business plans, policies, proposals, operations docs, and KPI reports.",
    arSummary: "ينشئ خطط أعمال وسياسات ومقترحات ومستندات تشغيل وتقارير مؤشرات.",
    description:
      "A business workspace kit combining document, spreadsheet, research, and dashboard patterns for operational work. It clarifies audience and constraints when needed and produces verified, shareable artifacts.",
    arDescription:
      "حزمة أعمال تجمع أنماط المستندات والجداول والبحث واللوحات للعمل التشغيلي. تستوضح الجمهور والقيود عند الحاجة وتنتج ملفات قابلة للمشاركة والتحقق.",
    categories: ["Business", "Documents", "Productivity"],
    arCategories: ["أعمال", "مستندات", "إنتاجية"],
    tags: ["business", "proposal", "policy", "kpi", "operations"],
    risk: "low",
    permissions: ["read_file", "write_file"],
    tools: [
      ["business_brief", "Create business briefs and proposals."],
      ["kpi_report", "Structure KPI reports and dashboards."],
      ["business_verify", "Check assumptions and deliverable completeness."],
    ],
    arTools: [
      ["ملخص أعمال", "إنشاء ملخصات ومقترحات أعمال."],
      ["تقرير مؤشرات", "تنظيم تقارير KPI ولوحات المتابعة."],
      ["تحقق", "فحص الافتراضات واكتمال المخرجات."],
    ],
    colors: ["#312e81", "#f59e0b"],
    icon: "business",
  },
  {
    slug: "aura-study-kit",
    name: "Aura Study Kit",
    arName: "Aura للدراسة",
    summary: "Create study notes, lesson plans, quizzes, flashcards, and learning reports.",
    arSummary: "ينشئ ملاحظات دراسية وخطط دروس واختبارات وبطاقات وتقارير تعلم.",
    description:
      "A study workspace kit for notes, summaries, lesson plans, quizzes, flashcards, and learning schedules. It adapts tone and depth to the audience and creates files instead of long chat dumps for substantial material.",
    arDescription:
      "حزمة دراسة للملاحظات والملخصات وخطط الدروس والاختبارات والبطاقات والجداول التعليمية. تضبط الأسلوب والعمق حسب الجمهور وتنشئ ملفات بدل حشو الشات عند وجود محتوى كبير.",
    categories: ["Study", "Documents", "Productivity"],
    arCategories: ["دراسة", "مستندات", "إنتاجية"],
    tags: ["study", "notes", "quiz", "flashcards", "lesson"],
    risk: "low",
    permissions: ["read_file", "write_file"],
    tools: [
      ["study_notes", "Create structured learning notes."],
      ["quiz_create", "Create quizzes or flashcards."],
      ["study_verify", "Check coverage and clarity."],
    ],
    arTools: [
      ["ملاحظات", "إنشاء ملاحظات تعليمية منظمة."],
      ["اختبار", "إنشاء اختبارات أو بطاقات."],
      ["تحقق", "فحص الشمول والوضوح."],
    ],
    colors: ["#164e63", "#22d3ee"],
    icon: "study",
  },
  {
    slug: "aura-forms",
    name: "Aura Forms",
    arName: "Aura للنماذج",
    summary: "Create forms, surveys, intake sheets, checklists, and response templates.",
    arSummary: "ينشئ نماذج واستبيانات واستمارات وقوائم تحقق وقوالب ردود.",
    description:
      "A forms workspace skill for surveys, intake forms, checklists, questionnaires, and response templates. It creates structured Markdown/CSV artifacts and asks before publishing or sending forms externally.",
    arDescription:
      "مهارة للنماذج والاستبيانات والاستمارات وقوائم التحقق وقوالب الردود. تنشئ ملفات Markdown/CSV منظمة وتسأل قبل نشر أو إرسال أي نموذج خارجياً.",
    categories: ["Forms", "Business", "Productivity"],
    arCategories: ["نماذج", "أعمال", "إنتاجية"],
    tags: ["forms", "survey", "checklist", "questionnaire", "template"],
    risk: "low",
    permissions: ["read_file", "write_file"],
    tools: [
      ["form_create", "Create structured form questions."],
      ["form_export", "Export forms to Markdown or CSV."],
      ["form_verify", "Check required fields and answer options."],
    ],
    arTools: [
      ["إنشاء نموذج", "إنشاء أسئلة نموذج منظمة."],
      ["تصدير", "تصدير النماذج إلى Markdown أو CSV."],
      ["تحقق", "فحص الحقول المطلوبة وخيارات الإجابة."],
    ],
    colors: ["#3f1d38", "#f472b6"],
    icon: "forms",
  },
  {
    slug: "aura-dashboard-builder",
    name: "Aura Dashboard Builder",
    arName: "Aura للوحات المتابعة",
    summary: "Create dashboard specs, HTML previews, metrics tables, and reporting layouts.",
    arSummary: "ينشئ مواصفات لوحات متابعة ومعاينات HTML وجداول مؤشرات وتخطيطات تقارير.",
    description:
      "A dashboard workspace skill for metrics layouts, HTML previews, reporting pages, and data visualization specs. It verifies hierarchy, readability, responsive behavior, and source assumptions.",
    arDescription:
      "مهارة للوحات المتابعة وتخطيطات المؤشرات ومعاينات HTML وصفحات التقارير ومواصفات الرسوم. تتحقق من التسلسل البصري والقراءة والتجاوب وافتراضات المصادر.",
    categories: ["Dashboards", "Data", "Design"],
    arCategories: ["لوحات متابعة", "بيانات", "تصميم"],
    tags: ["dashboard", "metrics", "html", "charts", "reporting"],
    risk: "low",
    permissions: ["read_file", "write_file"],
    tools: [
      ["dashboard_plan", "Plan dashboard sections and metrics."],
      ["dashboard_create_html", "Create an HTML preview when useful."],
      ["dashboard_verify", "Check layout, labels, and assumptions."],
    ],
    arTools: [
      ["خطة لوحة", "تخطيط أقسام ومؤشرات لوحة المتابعة."],
      ["إنشاء HTML", "إنشاء معاينة HTML عند الحاجة."],
      ["تحقق", "فحص التخطيط والتسميات والافتراضات."],
    ],
    colors: ["#0f172a", "#a855f7"],
    icon: "dashboard",
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function iconPath(kind) {
  const common = `stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const paths = {
    document: `<path ${common} d="M52 30h48l28 28v76H52z"/><path ${common} d="M100 30v28h28"/><path ${common} d="M70 82h40M70 104h44M70 126h26"/>`,
    spreadsheet: `<rect ${common} x="34" y="38" width="92" height="92" rx="10"/><path ${common} d="M34 68h92M34 98h92M64 38v92M94 38v92"/>`,
    presentation: `<rect ${common} x="28" y="34" width="104" height="74" rx="10"/><path ${common} d="M80 108v22M58 130h44M52 58h56M52 78h34"/>`,
    pdf: `<path ${common} d="M48 30h48l30 30v70H48z"/><path ${common} d="M96 30v30h30"/><path ${common} d="M62 100h36M62 118h24"/>`,
    research: `<circle ${common} cx="70" cy="68" r="30"/><path ${common} d="M92 90l30 30M52 120h26M46 136h52"/>`,
    image: `<rect ${common} x="30" y="38" width="100" height="84" rx="12"/><circle ${common} cx="62" cy="68" r="8"/><path ${common} d="M42 110l28-28 20 20 14-14 20 22"/>`,
    design: `<path ${common} d="M46 118l18-72 48 48z"/><path ${common} d="M70 94l30-30M96 34l30 30"/>`,
    data: `<path ${common} d="M42 122V74M78 122V46M114 122V62"/><path ${common} d="M32 122h96"/>`,
    convert: `<path ${common} d="M42 58h70l-18-18M112 58L94 76M118 102H48l18-18M48 102l18 18"/>`,
    automation: `<circle ${common} cx="80" cy="80" r="26"/><path ${common} d="M80 36v14M80 110v14M36 80h14M110 80h14M49 49l10 10M101 101l10 10M111 49l-10 10M59 101l-10 10"/>`,
    database: `<ellipse ${common} cx="80" cy="42" rx="42" ry="16"/><path ${common} d="M38 42v76c0 9 19 16 42 16s42-7 42-16V42"/><path ${common} d="M38 80c0 9 19 16 42 16s42-7 42-16"/>`,
    browser: `<rect ${common} x="30" y="38" width="100" height="86" rx="12"/><path ${common} d="M30 64h100M52 52h1M70 52h1M50 88h60"/>`,
    business: `<rect ${common} x="40" y="54" width="80" height="64" rx="10"/><path ${common} d="M62 54V42h36v12M58 86h44"/>`,
    study: `<path ${common} d="M34 48h42c12 0 20 8 20 20v66H54c-12 0-20-8-20-20z"/><path ${common} d="M126 48H96v86h30c0-12-8-20-20-20H96"/>`,
    forms: `<rect ${common} x="44" y="30" width="74" height="104" rx="10"/><path ${common} d="M62 58h38M62 82h38M62 106h24"/><circle ${common} cx="54" cy="58" r="1"/>`,
    dashboard: `<rect ${common} x="30" y="36" width="100" height="88" rx="12"/><path ${common} d="M50 96V76M80 96V58M110 96V68M50 108h60"/>`,
  };
  return paths[kind] ?? paths.document;
}

function svgIcon(entry) {
  const [from, to] = entry.colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="${entry.name}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="34" fill="url(#g)"/>
  <circle cx="132" cy="28" r="34" fill="white" opacity=".10"/>
  <circle cx="24" cy="140" r="46" fill="black" opacity=".16"/>
  ${iconPath(entry.icon)}
</svg>
`;
}

function svgCover(entry) {
  const [from, to] = entry.colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="${entry.name} cover">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-opacity=".32"/>
    </filter>
  </defs>
  <rect width="640" height="360" rx="42" fill="url(#bg)"/>
  <circle cx="560" cy="52" r="110" fill="white" opacity=".10"/>
  <circle cx="70" cy="335" r="140" fill="black" opacity=".18"/>
  <rect x="52" y="58" width="536" height="244" rx="34" fill="rgba(10,10,14,.42)" stroke="rgba(255,255,255,.18)" filter="url(#shadow)"/>
  <g transform="translate(68 92) scale(.92)">${iconPath(entry.icon)}</g>
  <text x="232" y="158" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="800" fill="white">${entry.name}</text>
  <text x="232" y="204" font-family="Inter, Arial, sans-serif" font-size="19" fill="rgba(255,255,255,.78)">Official HBX workspace skill</text>
  <text x="232" y="238" font-family="Inter, Arial, sans-serif" font-size="15" fill="rgba(255,255,255,.60)">Artifact-first work with approval-gated tools</text>
</svg>
`;
}

function manifest(entry) {
  const toolObjects = entry.tools.map(([name, description]) => ({ name, description }));
  const arToolObjects = entry.arTools.map(([name, description]) => ({ name, description }));
  return {
    id: `skill.${entry.slug}`,
    type: "skill",
    name: entry.name,
    version: "1.0.0",
    summary: entry.summary,
    description: entry.description,
    publisher,
    icon: `${entry.slug}/icon.svg`,
    cover: `${entry.slug}/cover.svg`,
    categories: entry.categories,
    tags: entry.tags,
    risk: entry.risk,
    auth: { type: "none" },
    install: {
      kind: "skill",
      prompt: [
        `You are ${entry.name}, an official Aura Work workspace skill.`,
        "Classify the request before acting and choose the most appropriate artifact format.",
        "Use real workspace tools for file creation, editing, reading, verification, and approved browser/connector work when available.",
        "Do not claim native Office/PDF/image export succeeded unless a real tool created and verified that file.",
        "When native export is unavailable, create the best editable fallback artifact and state the limitation clearly.",
        "Ask concise clarification questions only when missing details materially change the output or risk.",
        "Keep externally visible, destructive, credential, and database write actions approval-gated.",
        "Verify the artifact exists and is readable before reporting completion.",
      ].join(" "),
    },
    permissions: entry.permissions,
    setup: [
      "Install the skill from Aura Marketplace.",
      "Describe the artifact or workflow you want in normal language.",
      "Review and approve file edits, browser actions, connector calls, or shell/database work when Aura Work asks.",
    ],
    tools: toolObjects,
    homepage: "https://github.com/hbx12/aura-work",
    license: "MIT",
    repository: "https://github.com/hbx12/aura-work",
    localized: {
      ar: {
        name: entry.arName,
        summary: entry.arSummary,
        description: entry.arDescription,
        setup: [
          "ثبّت المهارة من متجر Aura.",
          "اكتب نوع الملف أو سير العمل المطلوب بلغتك الطبيعية.",
          "راجع ووافق على تعديلات الملفات أو إجراءات المتصفح أو الموصلات أو أوامر النظام/قاعدة البيانات عند طلب Aura Work.",
        ],
        tools: arToolObjects,
        categories: entry.arCategories,
      },
    },
  };
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

ensureDir(skillsDir);
ensureDir(assetsDir);

const generated = entries.map((entry) => {
  const assetDir = path.join(assetsDir, entry.slug);
  ensureDir(assetDir);
  fs.writeFileSync(path.join(assetDir, "icon.svg"), svgIcon(entry), "utf8");
  fs.writeFileSync(path.join(assetDir, "cover.svg"), svgCover(entry), "utf8");

  const item = manifest(entry);
  fs.writeFileSync(path.join(skillsDir, `${entry.slug}.json`), `${JSON.stringify(item, null, 2)}\n`, "utf8");
  return item;
});

for (const file of fs.readdirSync(skillsDir).filter((name) => name.endsWith(".json"))) {
  const filePath = path.join(skillsDir, file);
  const item = readJson(filePath, null);
  if (
    item?.publisher?.name === "Aura Community" ||
    item?.publisher?.github === "aura-os"
  ) {
    item.publisher = publisher;
    if (typeof item.homepage === "string" && item.homepage.includes("aura-os")) {
      item.homepage = "https://github.com/hbx12/aura-work";
    }
    if (typeof item.repository === "string" && item.repository.includes("aura-os")) {
      item.repository = "https://github.com/hbx12/aura-work";
    }
    fs.writeFileSync(filePath, `${JSON.stringify(item, null, 2)}\n`, "utf8");
  }
}

const aggregate = readJson(aggregatePath, { plugins: [] });
const existing = Array.isArray(aggregate) ? aggregate : aggregate.plugins ?? [];
const generatedIds = new Set(generated.map((item) => item.id));
const merged = [
  ...generated,
  ...existing
    .filter((item) => !generatedIds.has(item.id))
    .map((item) => {
      if (
        item?.publisher?.name === "Aura Community" ||
        item?.publisher?.github === "aura-os"
      ) {
        return {
          ...item,
          publisher,
          homepage:
            typeof item.homepage === "string" && item.homepage.includes("aura-os")
              ? "https://github.com/hbx12/aura-work"
              : item.homepage,
          repository:
            typeof item.repository === "string" && item.repository.includes("aura-os")
              ? "https://github.com/hbx12/aura-work"
              : item.repository,
        };
      }
      return item;
    }),
];

fs.writeFileSync(aggregatePath, `${JSON.stringify({ plugins: merged }, null, 2)}\n`, "utf8");
console.log(`Generated ${generated.length} official universal workspace marketplace entries.`);
