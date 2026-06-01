# المرحلة 9 — Chrome Extension و Office Add-ins

## ملخص

تم تنفيذ **الجسر المحلي (Local Bridge)** لربط **إضافة Chrome** و**Office add-ins** (Word/Excel/PowerPoint) بتطبيق Aura على سطح المكتب. التنفيذ الفعلي للنماذج والأدوات يبقى في Aura — الإضافات لا تخزّن مفاتيح API.

## ما الذي تم بناؤه

### Local Bridge

| المكوّن | المنفذ | الوظيفة |
|---------|--------|---------|
| `aura-bridge` (Node sidecar) | 47826 | API عام للإضافات + CORS |
| Rust internal API | 47827 | pairing، صلاحيات، مهام، audit |

### Rust (`apps/desktop/src-tauri/src/`)

| ملف | الوظيفة |
|-----|---------|
| `bridge.rs` | pairing codes، clients، page-read approval، task delegation |
| `bridge_internal.rs` | HTTP server على loopback |
| `bridge_helper.rs` | اتصال مع aura-bridge sidecar |

### Chrome Extension (`extensions/aura-chrome/`)

- صلاحية `<all_urls>` تقنيًا
- **قراءة محتوى الصفحة** فقط بعد موافقة per-task في Aura desktop
- pairing عبر رمز 6 أرقام
- إنشاء مهام مع سياق الصفحة

### Office Add-ins (`office/`)

- Word / Excel / PowerPoint manifests
- task pane مشترك يفوّض التنفيذ للجسر المحلي
- تطبيق التعديلات بعد تأكيد المستخدم

### الواجهة

- **Extensions** (nav): حالة الجسر، pairing، paired clients، تعليمات التثبيت
- **TaskWelcome**: Phase 9

## كيف تختبر

1. `npm install && npm run build:sidecars`
2. `npm run bridge` + `npm run sidecar` + `npm run dev`
3. **Extensions** → Start bridge → Generate pairing code
4. Chrome: load unpacked `extensions/aura-chrome` → Pair → Send to Aura
5. عند طلب page read → **Approve** في Aura desktop → يُقرأ المحتوى ويُسجَّل في audit
6. Office: sideload manifest (HTTPS) → Pair → Send to Aura
7. Sidecar `/health` → `phase: 9`

## معايير القبول (Milestone 9)

- [x] Chrome extension مع broad site permission
- [x] Per-task content read approval
- [x] Office add-ins (Word/Excel/PowerPoint)
- [x] اتصال عبر local bridge
- [x] لا API keys في الإضافات
- [x] الإجراءات في task history و audit log

## Phase 11+

- Packaging، Updates، Localization
