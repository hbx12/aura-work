# Scheduled Tasks — تنفيذ Phase 8

## السلوك

1. المستخدم ينشئ scheduled task مرتبطًا بمشروع.
2. يحدد **cadence** و **permission profile** (مجموعة grants: category/action/targetPattern).
3. عند التشغيل (يدوي أو scheduler):
   - يُنشأ task عادي مع `scheduled_task_id`
   - يُولَّد plan ويُوافَق عليه تلقائيًا
   - agent loop يعمل حتى completion أو permission block
4. إذا طلب tool صلاحية **خارج الـ profile** → task يتوقف، run = `permission-blocked`
5. إذا طلب **high-impact** action → pending permission (موافقة مستخدم) حتى مع profile

## Scheduler

- `start_scheduler` في `lib.rs` setup
- كل 60 ثانية: `scheduler_tick` يفحص `next_run_at <= now`
- عند startup: `process_missed_on_startup` للتشغيلات الفائتة أثناء إغلاق التطبيق

## قيود PRD

- **لا daemon في الخلفية** — إذا أُغلق Aura، التشغيل يفشل/يُفوت
- **لا توسيع صامت للصلاحيات** — profile ثابت لكل schedule
- **API keys لا تُزامَن** — scheduled metadata فقط في E2EE sync

## Tauri commands

| Command | الوظيفة |
|---------|---------|
| `list_scheduled_tasks` | قائمة (اختياري: filter by project) |
| `get_scheduled_task` | تفاصيل |
| `create_scheduled_task` | إنشاء |
| `update_scheduled_task` | تحديث |
| `delete_scheduled_task` | حذف |
| `list_scheduled_task_runs` | run history |
| `run_scheduled_task_now` | تشغيل يدوي |
| `pause_scheduled_task` / `resume_scheduled_task` | إيقاف/استئناف |

## Frontend

- `useScheduledTasks` hook
- `SchedulePageLive` component
- Presets من `@aura-os/shared` → `PERMISSION_PROFILE_PRESETS`
