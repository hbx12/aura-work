# Packaging, Updates, CLI

## الغرض

مثبّتات موقّعة، تحديثات داخل التطبيق، التحقق من VM image، و**aura CLI** كرفيق محلي.

## الملفات

| الملف | الوظيفة |
|-------|---------|
| `bundle/manifest.json` | Node runtime + sidecars + VM |
| `bundle/vm-image/` | manifest + placeholder artifact |
| `apps/desktop/src-tauri/src/packaging.rs` | verify VM, updates, open-task |
| `apps/desktop/src-tauri/tauri.conf.json` | bundle resources + updater |
| `cli/aura-cli/` | CLI companion |

## CLI

```bash
# Pair (from Extensions pairing code in desktop)
npm run cli -- pair --code ABCD1234 --name "My CLI"

# Create task (requires running Aura + bridge)
npm run cli -- task create --project <uuid> --prompt "Analyze repo"

# Stream audit logs for task
npm run cli -- task logs <taskId>

# Ask desktop to open task
npm run cli -- open task <taskId>
```

**قيود PRD:**

- CLI يستخدم local bridge فقط
- لا يتجاوز الصلاحيات
- يفشل فورًا إذا Aura غير مفتوح

Config: `~/.aura/config.json` أو `AURA_SESSION_TOKEN`.

## Updates

- `tauri-plugin-updater` + minisign pubkey في `tauri.conf.json`
- Settings → Check for updates
- في dev: رسالة offline/skipped طبيعية

## VM image verification

- SHA-256 للـ artifact مقابل `manifest.json`
- VM helper يرفض `/start` إذا hash mismatch
- Desktop Settings يعرض حالة التحقق

## كيف تختبر

1. Settings → Packaging → VM image verified
2. `npm run cli -- status` (bridge running)
3. أغلق Aura → `npm run cli -- status` → خطأ bridge offline
