# المرحلة 8 — Scheduled Tasks (المهام المجدولة)

## ملخص

تم تنفيذ **المهام المجدولة** مع CRUD كامل، **تنفيذ حسب cadence** (manual, hourly, daily, weekly, weekdays, custom cron)، **ملفات صلاحيات مسبقة التصديق** (permission profiles)، وتسجيل **التشغيلات الفائتة/الفاشلة**. المهام تعمل **فقط أثناء فتح Aura والجهاز مستيقظ**.

## ما الذي تم بناؤه

### Rust (`apps/desktop/src-tauri/src/`)

| ملف | الوظيفة |
|-----|---------|
| `scheduled.rs` | CRUD، scheduler (كل 60 ث)، missed runs عند startup، تنفيذ يدوي |
| `permissions.rs` | `PermissionProfileGrant`، `check_task_permission` للمهام المجدولة |
| `tasks.rs` | `scheduled_task_id`، `create_task_for_schedule`، inner helpers للتنفيذ |

### جداول SQLite

- `scheduled_tasks` — الاسم، الوصف، prompt، المشروع، cadence، permission profile، paused، last/next run
- `scheduled_task_runs` — history: completed, failed, missed, permission-blocked

### Cadences

| النوع | الوصف |
|-------|--------|
| `manual` | تشغيل يدوي فقط (Run now) |
| `hourly` | كل ساعة عند الدقيقة المحددة |
| `daily` | يوميًا عند hour:minute |
| `weekdays` | الإثنين–الجمعة |
| `weekly` | يوم أسبوع + وقت |
| `custom` | تعبير cron (5 حقول) |

### Permission profiles (presets)

- **Read-only** — قراءة ملفات
- **Safe automation** — read/write ملفات + shell read-only
- **Research** — read ملفات + browse web

الإجراءات عالية التأثير (install/destructive shell، plugin/MCP) **تتطلب موافقة صريحة** حتى في المهام المجدولة.

### الواجهة

- **Schedule** (nav): إنشاء/إيقاف/استئناف/حذف، Run now، run history
- **TaskWelcome**: Phase 8

### E2EE Sync

- `scheduled-task` objects تُزامَن عبر Aura Cloud (metadata + cadence + profile — بدون أسرار)

## كيف تختبر

1. `npm install && npm run build:sidecars`
2. `npm run sidecar` + `npm run dev`
3. **Schedule** → New schedule → اختر project + cadence + permission profile
4. **Run now** — يجب أن يُنشئ task وينفّذ ضمن الـ profile
5. جرّب profile محدود (read-only) مع prompt يحتاج write → يتوقف مع `permission-blocked`
6. أغلق Aura، انتظر موعد cadence → عند إعادة الفتح يُسجَّل **missed run**
7. Sidecar `/health` → `phase: 8`

## معايير القبول (Milestone 8)

- [x] Scheduled task CRUD
- [x] Cadence execution (while app open)
- [x] Pre-approved permission profiles
- [x] Missed/failed run reporting
- [x] Task stops if permission outside profile
- [x] High-impact actions still require approval
- [x] E2EE sync of scheduled task metadata

## Phase 11+

- Packaging، Updates، Localization
