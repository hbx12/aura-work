# Local Bridge و Chrome / Office

## المبدأ

الإضافات **لا تنفّذ** نماذج AI محليًا. كل الطلبات تمر عبر:

```
Chrome / Office → aura-bridge (:47826) → Rust internal (:47827) → task engine
```

## Pairing

1. Aura desktop يولّد رمزًا (10 دقائق)
2. الإضافة ترسل `POST /v1/pair/claim`
3. تُعاد `sessionToken` — تُخزَّن في `chrome.storage` أو `localStorage` (Office)
4. كل طلب لاحق: header `X-Aura-Session-Token`

## Chrome page read

1. `POST /v1/chrome/page-read/request` → `permissionId`
2. المستخدم يوافق/يرفض في Aura desktop
3. Extension ت polling على `/v1/chrome/page-read/status/:id`
4. بعد الموافقة فقط: `POST /v1/chrome/page-read/submit` مع المحتوى
5. يُسجَّل في `audit_log` — category `bridge`, action `page-read`

## Office delegation

- `POST /v1/task/create` مع `documentContext`
- المهمة تُنشأ في SQLite وتُشغَّل عبر sidecar
- Apply في Office يتطلب confirm في task pane

## Tauri commands

- `get_bridge_status`, `start_bridge`, `stop_bridge`
- `create_bridge_pairing`, `list_bridge_clients`, `revoke_bridge_client`

## التشغيل

```powershell
npm run bridge
```

يجب أن يكون Aura desktop مفتوحًا — الجسر يتوقف عند إغلاق التطبيق (لا daemon).
