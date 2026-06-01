# Aura Cloud و E2EE Sync

## النموذج الأمني

- كل حساب له **sync key** (32 bytes) مشفّر محليًا بمفتاح الجهاز.
- **Recovery key** (`aura-...`) يُنشأ عند التسجيل — مطلوب لاستعادة البيانات إذا فُقدت الأجهزة.
- البيانات تُشفَّر client-side قبل الرفع (`XChaCha20-Poly1305`).
- Aura Cloud يخزّن **ciphertext + nonce + metadata** فقط.

## ما يُزامَن

- Projects (metadata)
- Tasks + history
- Settings (بدون secrets)
- Audit logs
- Plugin metadata

## ما لا يُزامَن

- **API keys** (Vault)
- ملفات المشروع الكاملة
- VM disk images
- Browser cookies

## Remote dispatch

1. العميل البعيد يرسل task request **مشفّرًا**.
2. Cloud ي relay إلى desktop **online** فقط.
3. Desktop يفك التشفير وينشئ مهمة محلية.
4. Status updates تُرسل مشفّرة.

إذا desktop مغلق أو offline → **فشل فوري** مع إشعار.

## Self-hosting

```bash
npm run cloud-server   # http://127.0.0.1:47830
npm run cloud-sync     # http://127.0.0.1:47825
```

## EncryptedSyncEnvelope

```ts
interface EncryptedSyncEnvelope {
  id: string;
  ownerAccountId: string;
  objectType: "project" | "task" | "audit-entry" | "setting" | "plugin-metadata" | ...;
  version: number;
  ciphertext: string;
  nonce: string;
  keyVersion: number;
  createdAt: string;
  updatedAt: string;
}
```
