# المرحلة 5 — المتصفح والويب

## ملخص

تم تنفيذ **aura-browser-helper** (sidecar على المنفذ 47823) لأتمتة Chromium مع **ملفات تعريف معزولة لكل مشروع**، واكتشاف prompt injection، وإرجاع **استشهادات المصدر**. Rust يفرض **سياسة URL** وصلاحيات تصفح. أداة `browse_url` متاحة في محرك المهام. الواجهة تتضمن **WebView مدمج** (iframe) وصفحة Browser.

## ما الذي تم بناؤه

### Browser Helper (`sidecar/aura-browser-helper/`)

| ملف | الوظيفة |
|-----|---------|
| `src/index.ts` | HTTP: `/health`, `/status`, `/start`, `/stop`, `/profile`, `/browse` |
| `src/backend.ts` | اكتشاف Chrome/Edge أو static-fetch |
| `src/browse.ts` | تصفح Chromium (puppeteer-core) أو fetch |
| `src/profiles.ts` | ملف تعريف معزول لكل `projectId` |
| `src/sanitize.ts` | HTML→نص، prompt injection، استشهادات |

### Rust (`apps/desktop/src-tauri/src/`)

| ملف | الوظيفة |
|-----|---------|
| `web.rs` | سياسة URL + فحص prompt injection |
| `browser.rs` | `get_browser_status`, `start_browser`, `stop_browser` + `tool_browse_url` |

### الواجهة

- **Browser** (nav): WebView + URL bar + حالة helper
- **Settings**: Start/Stop browser helper
- **Context panel**: حالة browser helper
- **PermissionApprovalDialog**: موافقة تصفح (أيقونة globe)

## كيف تختبر

1. `npm install`
2. `npm run build:sidecars`
3. `npm run browser-helper` (نافذة)
4. `npm run sidecar` + `npm run vm-helper` (اختياري)
5. `npm run dev`
6. **Browser** → Start helper → افتح `https://example.com`
7. في Tasks: «ابحث في example.com عن …»
8. وافق على تصفح URL عند المطالبة
9. تحقق أن الملخص يتضمن `[Source: …]`
10. أوقف browser helper → مهمة browse يجب أن تُبلّغ `browser unavailable`

## معايير القبول (Milestone 5)

- [x] WebView للتصفح المرئي
- [x] Chromium automation (أو static-fetch fallback)
- [x] ملف تعريف معزول لكل مشروع
- [x] استشهادات المصدر في مخرجات browse
- [x] فحص prompt injection على محتوى الويب
- [x] Agent يتصفح بعد الموافقة

## Phase 6+

- Aura Cloud و E2EE sync
