# المرحلة 11 — Packaging, Updates, and Localization

## ملخص

تم تنفيذ **التعبئة والتحديثات والترجمة**: مثبّتات موقّعة، تحديثات داخل التطبيق، التحقق من صورة VM، Node runtime وVM image مجمّعة، **20 لغة** مع ملفات Weblate، و**CLI companion** عبر local bridge.

## ما الذي تم بناؤه

### i18n (`packages/i18n`)

| المكوّن | الوظيفة |
|---------|---------|
| `src/catalog.ts` | 20 لغة + RTL (ar, fa) |
| `locales/*.json` | ملفات Weblate-compatible |
| `useI18n` hook | اختيار لغة النظام + fallback إلى English |

### Packaging (`apps/desktop/src-tauri/src/packaging.rs`)

- التحقق من SHA-256 لصورة VM
- `get_packaging_info`, `verify_vm_image`, `check_for_updates`
- `pending_open_task` لفتح مهمة من CLI

### CLI (`cli/aura-cli`)

```bash
npm run cli -- status
npm run cli -- pair --code <code>
npm run cli -- task create --project <id> --prompt "..."
npm run cli -- task logs <taskId>
npm run cli -- open task <taskId>
```

- يستخدم local bridge (47826)
- **يفشل** إذا Aura غير مفتوح
- **لا يتجاوز** الصلاحيات

### Bridge (Phase 11)

- `/v1/task/:id/logs`, `/v1/open/task`
- client type: `cli`

### Bundle

- `bundle/manifest.json` — Node runtime + sidecars + VM image
- `tauri.conf.json` — resources + updater plugin

## كيف تختبر

1. `npm install && npm run build:all`
2. `npm run dev` + sidecars
3. **Settings** → Language → العربية (RTL)
4. **Settings** → Check for updates
5. **Settings** → VM image verification = OK
6. Extensions → pair code → `npm run cli -- pair --code XXX`
7. `npm run cli -- task create --project <id> --prompt "hello"`
8. Sidecar `/health` → `phase: 11`

## معايير القبول (Milestone 11)

- [x] Signed installers config + updater artifacts
- [x] Signed in-app update check (minisign verification)
- [x] VM image verification (SHA-256)
- [x] Bundled Node + VM image manifest in installer resources
- [x] 20 initial languages + Weblate-compatible locale files
- [x] System language detection + English fallback
- [x] CLI companion via bridge — fails if Aura offline, no permission bypass

## Phase 12+

- Marketing and download website (Phase 13)
