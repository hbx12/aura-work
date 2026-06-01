# Vault المشفر المحلي

## الغرض

تخزين مفاتيح API ومعلومات الاتصال الحساسة في ملف مشفر على الجهاز فقط.

## الملفات

| ملف | المسار | الوظيفة |
|-----|--------|---------|
| `vault.rs` | `apps/desktop/src-tauri/src/` | تشفير/فك تشفير |
| `vault.enc` | `%APPDATA%\com.auraos.desktop\` | الأسرار المشفرة |
| `device.key` | نفس المجلد | مفتاح 32-byte للجهاز |

## كيف يشتغل

1. عند أول تشغيل: يُنشأ `device.key` عشوائيًا
2. محتوى vault (JSON): `{ version, secrets: { openai: { apiKey, baseUrl }, ... } }`
3. يُشفَّر بـ **XChaCha20-Poly1305** قبل الكتابة على القرص
4. Tauri commands: `set_provider_secret`, `clear_provider_secret`, `export_vault`, `import_vault`

## الأمان

- المفاتيح **لا** تُكتب في SQLite
- Sidecar يستقبل credentials من Rust فقط عبر localhost (لا تمر من React)
- logs sidecar تُخفّي credentials (`redacted`)
- Export يتطلب كلمة مرور ≥ 8 أحرف (Argon2id KDF)

## كيف تختبر

1. Settings → Export → انسخ base64
2. Settings → Import بنفس كلمة المرور
3. Providers → Key محفوظ بعد الاستيراد

## Phase 3+

Vault يبقى محليًا — لا sync إلى Aura Cloud (حسب PRD).
