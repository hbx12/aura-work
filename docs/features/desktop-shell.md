# واجهة سطح المكتب (Desktop Shell)

## الغرض

الهيكل الرئيسي للتطبيق: three-zone layout (nav · sidebar · workspace · context panel).

## الملفات

| الملف | الوظيفة |
|---|---|
| `apps/desktop/src/App.tsx` | routing بين الصفحات + state |
| `packages/ui/src/components/chrome/` | TitleBar, NavRail, Sidebar |
| `packages/ui/src/components/pages/` | صفحات ثانوية |
| `apps/desktop/src/app-overrides.css` | modal إنشاء مشروع |

## الصفحات (Nav)

| View | الحالة Phase 1 |
|---|---|
| Tasks | مشروع + composer + welcome |
| Files | placeholder |
| Git | placeholder |
| Scheduled | UI shell (mock data) |
| Providers | UI shell (no API calls) |
| Plugins | placeholder |
| Audit | UI shell (sample rows) |
| Settings | placeholder |

## كيف يعمل

- `view` state في `App.tsx` يحدد المحتوى المركزي
- Sidebar يظهر فقط في view `tasks`
- Context panel (VM، cost) — toggle من TitleBar — Phase 1 يعرض placeholders

## كيف تختبر

1. انقر كل أيقونة في nav rail — الصفحة تتغير
2. في Tasks: اختر مشروعًا من sidebar
3. Context panel: زر panel-right

## RTL (مستقبلًا)

- tokens تدعم `[dir="rtl"]` و IBM Plex Sans Arabic
- Phase 11: i18n كامل ✅
