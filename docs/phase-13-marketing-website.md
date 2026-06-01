# المرحلة 13 — Marketing and Download Website

## ملخص

تم بناء **موقع تسويق وتنزيل عام** وفق **PRD القسم 9** و**Milestone 12**: Astro static، design system، EN/AR مع RTL، كشف OS للمثبّت، وبدون tracking.

## ما الذي تم بناؤه

### موقع `/website`

| المكوّن | الوظيفة |
|---------|---------|
| `src/pages/index.astro` | الصفحة الإنجليزية (افتراضي) |
| `src/pages/ar/index.astro` | العربية — `dir="rtl"` كامل |
| `src/components/*` | Hero، Features، How it works، Security، Open source، Download، FAQ |
| `src/config/releases.ts` | روابط GitHub Releases + checksums/signatures |
| `src/i18n/` | نصوص EN/AR — قابلة للتوسعة |
| `public/assets/product-preview.svg` | معاينة واجهة المنتج |
| `src/pages/docs/index.astro` | إعادة توجيه إلى `docs/` في المستودع |

### أقسام PRD §9.3

- [x] Hero — value prop، Download CTA، معاينة المنتج
- [x] Key features — كل قدرات v1 (multi-provider، VM، permissions، vault، E2EE، plugins، scheduled، extensions، Monaco/Git)
- [x] How it works — projects → tasks → agent → approvals → deliverables
- [x] Security and privacy — vault، gates، E2EE، no telemetry
- [x] Open source — Apache-2.0، repo، self-host Aura Cloud
- [x] Download — OS detection، كل المثبّتات، متطلبات النظام، checksums/signatures
- [x] FAQ + footer — license، repo، docs، community، privacy

### متطلبات §9.2 / §9.4 / §9.5

- [x] Astro static output — deployable إلى GitHub Pages / Netlify / Vercel / Cloudflare
- [x] Design tokens من `design-system/colors_and_type.css`
- [x] English + Arabic RTL
- [x] WCAG: skip link، focus-visible، semantic landmarks، reduced-motion
- [x] No analytics / no personal data collection

## أوامر

```powershell
npm install
npm run dev:website      # http://localhost:4321
npm run build:website    # website/dist/
npm run preview:website
```

## كيف تختبر

1. `npm run build:website` — يجب أن ينجح بدون أخطاء
2. `npm run preview:website` — افتح `/` و`/ar/`
3. تحقق من RTL في `/ar/` (اتجاه النص، padding منطقي)
4. في قسم Download — يظهر المثبّت الموصى به لنظامك
5. روابط GitHub Releases وchecksums تفتح صفحات Release
6. لا طلبات شبكة لـ analytics (DevTools Network)

## تحديث الإصدار عند Release

عدّل `website/src/config/site.ts` (`version`) و`website/src/config/releases.ts` (أسماء الملفات) لتطابق GitHub Release الموقّع.

## معايير القبول (Phase 13)

- [x] Static build ينجح
- [x] OS detection + روابط كل المنصات
- [x] Design system + EN/AR RTL
- [x] No tracking by default
- [ ] نشر فعلي على hosting — **يتطلب إعداد CI/deploy من المستخدم**

## Project complete (Phase 14)

Open-source release v1.0.0 — see [phase-14-open-source-release.md](./phase-14-open-source-release.md).
