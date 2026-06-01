# صفحة المزودين (Providers Shell)

## الغرض

واجهة إعداد مزودي AI ورouting — **Phase 1: عرض فقط بدون اتصال API**.

## الملف

`packages/ui/src/components/pages/SecondaryPages.tsx` → `ProvidersPage`

## ما يعرض

- **Routing policy**: quality-first · cost-first · privacy-first · local-only
- **Providers**: Anthropic, OpenAI, Gemini, DeepSeek, Ollama, Custom endpoint
- toggles بصرية (غير متصلة backend في Phase 1)

## Phase 2

- Vault مشفر لمفاتيح API
- Provider adapters حقيقيون
- عرض tokens/cost

## كيف تختبر

Nav → Providers — تأكد من ظهور البطاقات والتoggles بدون أخطاء console.
