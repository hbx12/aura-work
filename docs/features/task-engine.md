# محرك المهام (Task Engine)

## الغرض

تشغيل مهام طويلة متعددة الخطوات عبر حلقة وكيل: تخطيط → موافقة → تنفيذ أدوات → مراجعة → إكمال.

## حالات المهمة

`draft` → `planning` → `waiting-for-approval` → `running` → (`paused` | `blocked` | `completed` | `failed` | `cancelled`)

## المنسّق والأدوار الفرعية

الـ Sidecar يستخدم أدوارًا ثابتة: coordinator، research، coder، reviewer، security، data، document، browser.

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

## الاستثناءات الافتراضية

`node_modules`, `.git`, `dist`, `build`, `target`, `.venv`, `.env*`, وملفات مفاتيح.

## أوامر Tauri

- `create_task`, `start_task`, `approve_task_plan`, `advance_task`
- `pause_task`, `resume_task`, `cancel_task`
- `resume_after_permission`

## Sidecar HTTP

- `POST /task/plan` — توليد خطة
- `POST /task/iterate` — خطوة واحدة من الحلقة
