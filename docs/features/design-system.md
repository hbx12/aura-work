# نظام التصميم (Aura OS Design System)

## الغرض

مصدر الحقيقة البصري للتطبيق — ألوان، خطوط، spacing، ومكوّنات UI متسقة مع ملف التصميم الأصلي.

## الملفات

| الملف | الوظيفة |
|---|---|
| `packages/ui/src/tokens.css` | Design tokens (primitives → semantic → type → spacing) |
| `packages/ui/src/app.css` | أنماط المكوّنات (shell، buttons، panels، …) |
| `packages/ui/src/components/` | مكوّنات React قابلة لإعادة الاستخدام |
| `design-system/` | النسخة المرجعية من ZIP (preview HTML + UI kit) |

## كيف يعمل

### الثيمات

- **Light** افتراضي · **Dark** عبر `data-theme="dark"` على `<html>`
- التطبيق يبدّل الثيم في `App.tsx` ويحفظ في `localStorage`

### Tokens

- accent clay: `#c2683f` (light) / `#cf7a52` (dark)
- خطوط: IBM Plex Sans · Mono · Sans Arabic
- **لا gradients** — عمق عبر surfaces + borders + shadows

### المكوّنات المتاحة (Phase 1)

- `TitleBar`, `NavRail`, `Sidebar`
- `ProvidersPage`, `AuditPage`, `SchedulePage`, `SimplePage`
- `Composer`, `ContextPanel`, `TaskWelcome`, `Icon`

## كيف تختبر

1. شغّل التطبيق
2. بدّل light/dark — كل الأسطح تتبع tokens
3. تصفّح nav: Tasks، Providers، Audit، … — نفس اللغة البصرية

## التعديل

- غيّر tokens في `tokens.css` — ينعكس على كل المكوّنات
- مكوّن جديد: أضفه في `packages/ui/src/components/` وصدّره من `index.ts`
