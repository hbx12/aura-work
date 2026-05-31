# المرحلة 7 — Aura Cloud و E2EE Sync

## ملخص

تم تنفيذ **Aura Cloud** (خادم Node قابل للاستضافة الذاتية على المنفذ 47830) و**aura-cloud-sync** (sidecar على المنفذ 47825) مع **تشفير طرفي E2EE** في Rust. الخادم يخزّن **encrypted envelopes** فقط — لا يمكنه قراءة محتوى المهام. **مفاتيح API لا تُزامَن أبدًا**.

## ما الذي تم بناؤه

### Aura Cloud Server (`server/aura-cloud/`)

| ملف | الوظيفة |
|-----|---------|
| `src/index.ts` | HTTP: auth, devices, pairing, sync push/pull, remote dispatch |
| `src/store.ts` | تخزين محلي (file-based) — ciphertext فقط |
| `src/types.ts` | `EncryptedSyncEnvelope`, devices, dispatch |

### Cloud Sync Helper (`sidecar/aura-cloud-sync/`)

| ملف | الوظيفة |
|-----|---------|
| `src/index.ts` | HTTP: `/start`, `/stop`, `/sync/push`, `/sync/pull`, dispatch relay |
| `src/cloud-client.ts` | عميل HTTP لـ Aura Cloud |

### Rust (`apps/desktop/src-tauri/src/`)

| ملف | الوظيفة |
|-----|---------|
| `cloud_crypto.rs` | XChaCha20-Poly1305 E2EE، recovery key |
| `cloud_helper.rs` | اتصال HTTP مع cloud-sync helper و Aura Cloud |
| `cloud.rs` | تسجيل/دخول، pairing، sync، remote dispatch |

### الواجهة

- **Aura Cloud** (nav): تسجيل، E2EE sync، pairing، devices، remote dispatch test
- **Context panel**: حالة Aura Cloud sync
- **TaskWelcome**: Phase 7

## كيف تختبر

1. `npm install`
2. `npm run build:cloud && npm run build:cloud-sync && npm run build:sidecars`
3. `npm run cloud-server` (نافذة 1)
4. `npm run cloud-sync` (نافذة 2)
5. `npm run sidecar` (+ helpers اختياري)
6. `npm run dev`
7. **Aura Cloud** → Register → **احفظ recovery key**
8. Enable sync → Sync now
9. Inspect server store — يجب أن ترى ciphertext فقط
10. Remote dispatch: اختر desktop device → أرسل prompt مشفّر
11. إذا أغلقت Aura أو الجهاز offline → dispatch يفشل فورًا

## معايير القبول (Milestone 7)

- [x] خادم Aura Cloud (Node، self-hostable)
- [x] حسابات (email/password — OAuth/Passkeys مخطط لاحقًا)
- [x] Device pairing (QR/code flow)
- [x] E2EE sync envelopes
- [x] Recovery key
- [x] Remote dispatch failure عند إغلاق desktop/offline
- [x] Cloud يخزّن encrypted objects فقط
- [x] API keys لا تُزامَن

## Phase 9+

- Chrome extension و Office add-ins
