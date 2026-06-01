# سجل التدقيق (Audit Log)

## الغرض

سجل append-only لكل إجراء حساس: ملفات، صلاحيات، Git، مهام.

## التخزين

جدول SQLite: `audit_log` في `aura.db`.

## الحقول

`actor`, `category`, `action`, `target`, `summary`, `risk`, `decision`, `result`, `createdAt`.

## الفئات (Phase 3)

- `file` — read، write، write_proposed، write_approved
- `permission` — allow/deny
- `git` — commit_proposed، commit
- `task` — create، plan، approve_plan

## الواجهة

صفحة **Audit** في التطبيق — `list_audit_entries`.

## E2EE Sync

مزامنة السجل مع Aura Cloud — **Phase 7** (مفعّل عبر صفحة Aura Cloud).
