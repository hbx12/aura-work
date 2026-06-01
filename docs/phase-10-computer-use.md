# المرحلة 10 — Computer Use (تجريبي)

## ملخص

تم تنفيذ **Computer Use التجريبي**: التقاط لقطات الشاشة، النقر، الكتابة، والتركيز على تطبيقات سطح المكتب — مع **موافقة per-app على سطح المكتب**، **قائمة حظر للتطبيقات الحساسة**، و**إعداد احتفاظ باللقطات لكل مشروع**.

## ما الذي تم بناؤه

### Computer Use Helper

| المكوّن | المنفذ | الوظيفة |
|---------|--------|---------|
| `aura-computer-use` (Node sidecar) | 47828 | لقطات شاشة، نوافذ، click/type/focus |

### Rust (`apps/desktop/src-tauri/src/`)

| ملف | الوظيفة |
|-----|---------|
| `computer_use.rs` | صلاحيات per-app، blocklist، screenshot retention، أدوات المهام |

### أدوات المنسق (Agent tools)

- `computer_list_windows`
- `computer_screenshot`
- `computer_click`
- `computer_type`
- `computer_focus`

### الواجهة

- **Computer Use** (nav): حالة المساعد، retention، blocklist، لقطات مخزّنة
- **TaskWelcome**: Phase 10
- موافقات desktop-only للـ computer use (لا موافقة عن بُعد)

## كيف تختبر

1. `npm install && npm run build:sidecars`
2. `npm run computer-use` + `npm run sidecar` + `npm run dev`
3. **Computer Use** → Start helper → List windows
4. أنشئ مهمة تطلب استخدام تطبيق جديد → **Approve** على سطح المكتب
5. جرّب تطبيقًا محظورًا (مثل محاكاة `1password`) → يُرفض افتراضيًا
6. غيّر **Screenshot retention** إلى `task` أو `always` → تحقق من اللقطات المخزّنة
7. Sidecar `/health` → `phase: 10`

## معايير القبول (Milestone 10)

- [x] أتمتة شاشة/تطبيق تجريبية
- [x] موافقة per-app
- [x] blocklist للتطبيقات الحساسة (قابلة للتعديل جزئيًا)
- [x] إعداد retention للقطات لكل مشروع (افتراضي: `none`)
- [x] موافقة سطح المكتب فقط — لا موافقة عن بُعد

## Phase 12+

- Marketing and download website
