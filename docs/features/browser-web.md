# تنفيذ المتصفح والويب

## نظرة عامة

Aura OS يدعم سطحين للمتصفح (PRD §2.13):

1. **WebView مدمج** — للمستخدم (صفحة Browser في التطبيق)
2. **Chromium automation** — للوكيل عبر `aura-browser-helper`

## Sidecar: aura-browser-helper

- **المنفذ:** `47823` (`AURA_BROWSER_PORT`)
- **التشغيل:** `npm run browser-helper`

### API

| Method | Path | الوظيفة |
|--------|------|---------|
| GET | `/health` | `phase: 5`, `version: 0.5.0` |
| GET | `/status` | حالة helper + profiles |
| POST | `/start` | تشغيل helper |
| POST | `/stop` | إيقاف + مسح profiles في الذاكرة |
| POST | `/profile` | `{ projectId }` — إنشاء/تحديث profile |
| POST | `/browse` | `{ projectId, url, extract?, timeoutMs? }` |

### ملفات التعريف

- المسار: `~/.aura-os/browser-profiles/{projectId}/`
- Cookies/sessions **لا تُشارك** بين المشاريع
- Chromium يستخدم `userDataDir` منفصل لكل مشروع

### Backends

| Backend | الوصف |
|---------|--------|
| `chromium` | puppeteer-core + Chrome/Edge المثبت |
| `static-fetch` | fetch HTTP بدون JS (fallback) |

## أداة المهام: browse_url

```json
{ "name": "browse_url", "arguments": { "url": "https://example.com", "extract": "text" } }
```

- `extract`: `text` (افتراضي) | `links` | `title`
- المخرجات تتضمن `[Source: Title — URL]` للاستشهاد
- محتوى الويب يُعامل كـ **untrusted data**
- تحذيرات prompt injection تُضاف للمخرجات وسجل التدقيق

## سياسة Rust (`web.rs`)

- مسموح: `http`, `https` فقط
- مرفوض: `file:`, `javascript:`, `data:`, …
- localhost / شبكات خاصة: مخاطرة `medium`
- مواقع خارجية: مخاطرة `high`
- **كل تصفح يتطلب موافقة** (حتى في act-without-asking للروابط الجديدة)

## الصلاحيات

| category | action | target |
|----------|--------|--------|
| `browser` | `browse` | URL |

## سجل التدقيق

- category: `browser`
- metadata: `citation`, `injectionWarnings`, `backend`

## WebView (واجهة المستخدم)

- iframe مع `sandbox` في صفحة Browser
- بعض المواقع تمنع التضمين (X-Frame-Options) — هذا متوقع
- التصفح الآلي للوكيل مستقل عن WebView

## التكامل

```
Task engine (Rust) → browse_url → browser.rs → HTTP 47823 → Chromium/fetch
User UI → BrowserPage → iframe WebView
```

## Phase 6+

- Chrome extension + secure local bridge
- Office add-ins
