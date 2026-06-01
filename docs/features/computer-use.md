# Computer Use (تجريبي)

## نظرة عامة

Computer Use يسمح للوكيل بالتفاعل مع تطبيقات سطح المكتب عندما لا يتوفر connector أو plugin أو أداة متصفح. الميزة **تجريبية** في v1.

## البنية

```
Task engine → Rust computer_use.rs → aura-computer-use (47828) → OS APIs
```

## الصلاحيات

| الفئة | الإجراء | الهدف | ملاحظات |
|-------|---------|-------|---------|
| `computer-use` | `use-app` | `app:processname` | موافقة desktop مطلوبة دائمًا |
| `computer-use` | `screenshot` | `screen:primary` | لقطة شاشة عامة |
| `computer-use` | `list-windows` | `desktop:*` | قائمة النوافذ |

- **Act without asking** لا يتجاوز computer use.
- **Remote clients** لا يمكنها الموافقة (`desktop_only`).
- التطبيقات المطابقة لـ **blocklist** تُرفض دون prompt.

## Blocklist افتراضي

يشمل أنماطًا لـ: banking، wallets، password managers، healthcare، government identity، dating/social، trading، legal.

أنماط النظام (`user_editable = 0`) غير قابلة للحذف؛ يمكن إضافة أنماط مستخدم.

## Screenshot retention (لكل مشروع)

| القيمة | السلوك |
|--------|--------|
| `none` | لا تخزين (افتراضي — محافظ) |
| `task` | تخزين مرتبط بالمهمة |
| `always` | تخزين حتى حذف المستخدم |

اللقطات المخزّنة تظهر في **Computer Use** و**audit log** ويمكن حذفها.

## أوامر Tauri

- `get_computer_use_status` / `start_computer_use` / `stop_computer_use`
- `list_desktop_windows`
- `list_computer_use_blocklist` / `update_computer_use_blocklist`
- `get_project_computer_settings` / `set_project_screenshot_retention`
- `list_computer_use_screenshots` / `delete_computer_use_screenshot`

## تشغيل المساعد

```bash
npm run computer-use
```

Health: `http://127.0.0.1:47828/health` → `phase: 10`
