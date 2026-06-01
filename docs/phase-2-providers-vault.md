# المرحلة 2 — Vault, Providers, Routing, and Cost Display

## ما اكتمل

### 1) Vault مشفر محلي (Rust)
- ملف `vault.enc` في `%APPDATA%\com.auraos.desktop\`
- تشفير XChaCha20-Poly1305 بمفتاح جهاز (`device.key`)
- مفاتيح API **لا** تُخزَّن في SQLite
- تصدير/استيراد بكلمة مرور (Argon2id + XChaCha20)

**الملفات:** `apps/desktop/src-tauri/src/vault.rs` · `providers.rs`

### 2) بيانات المزودين والتسعير (SQLite)
- `provider_configs` — حالة enabled، base URL، نماذج (بدون مفاتيح)
- `pricing_cache` — أسعار النماذج (auto/bundled)
- `task_usage` — tokens/cost لكل طلب chat

### 3) Sidecar — محولات المزودين + Routing
- OpenAI · Anthropic · Gemini · DeepSeek · Ollama · OpenAI-compatible
- محرك routing: quality-first · cost-first · privacy-first · local-only · manual
- fallback يتطلب موافقة المستخدم
- HTTP API على `127.0.0.1:47821`

**الملفات:** `sidecar/aura-agent/src/`

### 4) واجهة المستخدم
- **Providers** — تفعيل/تعطيل، مفاتيح، اختبار، routing policy
- **Settings** — حالة vault، export/import، تحديث pricing
- **Tasks** — chat تجريبي + عرض tokens/cost في Context Panel

**الملفات:** `apps/desktop/src/components/` · `hooks/useProviders.ts` · `hooks/useAgent.ts`

### 5) حزمة مشتركة
- `packages/shared` — أنواع ProviderId، RoutingPolicy، PROVIDER_META

---

## كيف تختبر

### 1) تثبيت وبناء

```powershell
cd D:\Aura_os
npm install
npm run build:sidecar
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
npm run dev
```

في **نافذة طرفية ثانية**:

```powershell
cd D:\Aura_os
npm run sidecar
```

تأكد من `http://127.0.0.1:47821/health` → `"phase": 2`

### 2) Ollama بدون مفاتيح سحابية

1. ثبّت [Ollama](https://ollama.com) وشغّله
2. `ollama pull llama3.2` (أو أي نموذج)
3. في Aura → **Providers** → فعّل **Ollama**
4. Routing → **Local-only**
5. ارجع **Tasks** → اكتب رسالة → **Run task**
6. يجب أن ترى ردًا + tokens/cost في اللوحة الجانبية

### 3) Vault ومفاتيح API

1. **Providers** → **Key** بجانب OpenAI/Anthropic → أدخل المفتاح → Save
2. **Test** للتحقق من الاتصال
3. **Settings** → Export vault بكلمة مرور → يُنسخ base64
4. تأكد أن `aura.db` لا يحتوي المفتاح (فقط metadata)

### 4) Routing policy

1. **Providers** → جرّب **Cost-first** vs **Quality-first**
2. أرسل نفس الرسالة — لاحظ `model` في Usage panel

### 5) Provider fallback

1. فعّل مزودين (أحدهما بمفتاح خاطئ)
2. عطّل Ollama واستخدم quality-first
3. عند فشل المزود الأول — يظهر dialog «Provider fallback approval»

---

## قاعدة البيانات (Phase 2)

| جدول | الغرض |
|------|--------|
| `provider_configs` | metadata المزود (بدون keys) |
| `pricing_cache` | أسعار النماذج |
| `task_usage` | سجل tokens/cost |
| `app_settings` | `routing_policy` |

**Vault (ملفات، ليس SQLite):**
- `vault.enc` — أسرار مشفرة
- `device.key` — مفتاح الجهاز

---

## ما لم يُبنَ بعد

- محرك المهام الكامل → Phase 3
- VM → Phase 4
- Audit log حقيقي → Phase 3

---

## أوامر البناء

```powershell
npm run build          # frontend
npm run build:sidecar  # sidecar
npm run tauri build    # desktop installer
```
