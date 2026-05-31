# المشاريع (Projects)

## الغرض

تنظيم عمل Aura في **مشاريع محلية** — كل مشروع مربوط بمجلد على الجهاز مع تعليمات وصلاحيات (Phase 1: metadata فقط).

## الملفات

| الملف | الوظيفة |
|---|---|
| `apps/desktop/src-tauri/src/db.rs` | تهيئة SQLite + migrations |
| `apps/desktop/src-tauri/src/projects.rs` | Tauri commands: CRUD |
| `apps/desktop/src/hooks/useProjects.ts` | React hook يستدعي Rust |
| `apps/desktop/src/components/NewProjectDialog.tsx` | واجهة إنشاء مشروع |

## Tauri Commands

| Command | الوصف |
|---|---|
| `list_projects` | قائمة كل المشاريع (أحدث تحديثًا أولًا) |
| `get_project` | مشروع واحد بالـ id |
| `create_project` | إنشاء — `{ name, folderPath, instructions? }` |
| `delete_project` | حذف بالـ id |
| `pick_folder` | فتح native folder picker |

## كيف يعمل

1. عند أول تشغيل: `init_db` ينشئ `aura.db` في app data dir
2. إذا لا مشاريع: `seed_if_empty` يضيف `welcome-project` على المجلد الحالي
3. إنشاء مشروع: INSERT في جدول `projects` — `folder_path` فريد (UNIQUE)
4. `permission_mode` افتراضي: `ask-first`

## Schema

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  folder_path TEXT NOT NULL UNIQUE,
  instructions TEXT,
  permission_mode TEXT DEFAULT 'ask-first',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## كيف تختبر

1. **+** → Browse → اختر مجلد → Create
2. المشروع يظهر في sidebar
3. أعد تشغيل التطبيق — البيانات محفوظة
4. حاول نفس المجلد مرتين — رسالة خطأ duplicate

## Phase 2+

- external files، memory، scheduled tasks، Git status — حسب PRD
