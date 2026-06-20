# محرك المهام (Task Engine)

## الغرض

تشغيل مهام طويلة متعددة الخطوات عبر حلقة وكيل: تخطيط → موافقة → تنفيذ أدوات → مراجعة → إكمال.

محرك المهام لم يعد موجهًا للبرمجة فقط. تم توسيعه ليعمل كـ **Universal Workspace Agent** يفهم نوع طلب المستخدم ويختار نمط العمل المناسب:

- برمجة وتعديل مشاريع.
- مستندات وملفات نصية رسمية.
- جداول وملفات Excel-style.
- عروض تقديمية وشرائح.
- PDF واستخراج محتوى.
- صور وتصاميم.
- بحث وتقارير.
- تحليل بيانات وتحويل ملفات.
- أتمتة ومهام متكررة.
- قواعد بيانات واستعلامات آمنة وتقارير.
- تصفح وتحكم مرئي عند توفر الأدوات والموافقة.

## حالات المهمة

`draft` → `planning` → `waiting-for-approval` → `running` → (`paused` | `blocked` | `completed` | `failed` | `cancelled`)

## إصلاح تدفق الموافقة

عند موافقة المستخدم على خطة المهمة، يجب أن ينتقل الوكيل مباشرة إلى التنفيذ بدون أن يحتاج المستخدم إلى رسالة ثانية.

السلوك المطلوب:

1. `approve_task_plan` يحوّل المهمة إلى `running`.
2. الواجهة تستدعي حلقة التنفيذ مباشرة بعد الموافقة.
3. إذا طلبت المهمة موافقة على تعديل ملف أو صلاحية أداة، وبعد قبول المستخدم، تكمل الحلقة تلقائيًا.
4. لا ترجع المهمة لنفس شاشة الموافقة إلا إذا ظهر طلب موافقة جديد فعليًا.

هذا يمنع المشكلة السابقة حيث يقبل المستخدم الخطة ثم يتوقف الوكيل ولا ينفذ شيئًا.

## المنسّق والأدوار الفرعية

الـ Sidecar يستخدم أدوارًا متعددة حسب نوع المهمة:

- `coordinator` — فهم الهدف وتنظيم التنفيذ.
- `research` — قراءة مصادر وبحث ومقارنة.
- `coder` — تنفيذ تغييرات برمجية أو ملفات.
- `reviewer` — التحقق النهائي.
- `data` — تحليل بيانات وجداول.
- `document` — مستندات وتقارير وخطابات.
- `spreadsheet` — جداول وميزانيات وصيغ.
- `presentation` — عروض وشرائح.
- `pdf` — تلخيص وتحويل واستخراج من PDF.
- `image` / `design` — صور وتصاميم وواجهات.
- `automation` — مهام متكررة وتدفقات عمل.
- `database` — فحص مخططات SQL واستعلامات قراءة وتصدير تقارير.
- `dispatch` — توزيع الأهداف المتعددة إلى جلسات/أدوار مركزة.
- `browser` / `computer` — تصفح وتحكم مرئي عند توفر الأدوات.

## فهم صيغة الناتج

أمثلة الاستنتاج الافتراضي:

| طلب المستخدم | النمط | الناتج المتوقع |
|---|---|---|
| اعمل لي جدول | Spreadsheet | ملف جدول أو CSV/Excel-style |
| اعمل لي ملف نص | Document | مستند رسمي قابل للتنسيق |
| سو لي عرض | Presentation | بنية شرائح أو ملف عرض |
| لخص PDF | PDF | ملخص مع مراجع صفحات عند توفرها |
| حلل البيانات | Data Analysis | تقرير/جدول/رسوم |
| سو تصميم أو بانر | Design/Image | ملف بصري أو وصف تصميم |
| ابحث وقارن | Research | تقرير موثق بالمصادر |

## الأدوات (Phase 3–6)

| أداة | تنفيذ | صلاحية |
|------|--------|--------|
| `read_file` | Rust `files.rs` | قراءة ملف — Ask-first يطلب موافقة |
| `write_file` | Rust — diff معلّق في Ask-first | كتابة بعد موافقة |
| `search_files` | Rust — بحث نصي محلي | بدون موافقة إضافية |
| `git_status` / `git_diff` | Rust `git.rs` | قراءة Git |
| `run_shell` | Rust `vm.rs` → aura-vm-helper | سياسة shell — راجع [vm-execution.md](./vm-execution.md) |
| `browse_url` | Rust `browser.rs` → aura-browser-helper | تصفح ويب — موافقة + استشهاد — راجع [browser-web.md](./browser-web.md) |
| `plugin_tool` | Rust `plugins.rs` → aura-plugins-helper | أداة Aura plugin — موافقة + audit — راجع [plugins-mcp.md](./plugins-mcp.md) |
| `mcp_tool` | Rust `mcp.rs` → aura-plugins-helper | أداة MCP — موافقة + audit — راجع [plugins-mcp.md](./plugins-mcp.md) |
| commit | `propose_git_commit` + `approve_git_commit` | موافقة دائمة مطلوبة |

## مهارات Marketplace العامة

تمت إضافة مهارات رسمية في registry المحلي مع أصول SVG حقيقية وتعريب عربي/إنجليزي:

- Aura Documents
- Aura Spreadsheets
- Aura Presentations
- Aura PDF
- Aura Research
- Aura Image Studio
- Aura Design Studio
- Aura Data Analyst
- Aura File Converter
- Aura Automation
- Aura Database Analyst
- Aura Browser Assistant
- Aura Business Kit
- Aura Study Kit
- Aura Forms
- Aura Dashboard Builder

كل مهارة تحتوي على وصف إنجليزي وعربي، ويعرض المتجر النص المناسب حسب لغة الواجهة. التثبيت يستخدم المعرف الثابت من registry وليس الاسم المعروض، لذلك لا تنكسر عملية التثبيت عند استخدام الواجهة العربية.

راجع:

- [Universal Workspace](./universal-workspace.md)
- [Artifact Tools](./artifact-tools.md)
- [Marketplace Localization](./marketplace-localization.md)

## الاستثناءات الافتراضية

`node_modules`, `.git`, `dist`, `build`, `target`, `.venv`, `.env*`, وملفات مفاتيح.

## أوامر Tauri

- `create_task`, `start_task`, `approve_task_plan`, `advance_task`
- `pause_task`, `resume_task`, `cancel_task`
- `resume_after_permission`, `resume_after_edit`

## Sidecar HTTP

- `POST /task/plan` — توليد خطة
- `POST /task/iterate` — خطوة واحدة من الحلقة
