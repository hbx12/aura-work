# المزودون والـ Routing (Phase 2)

## الغرض

إدارة مزودي AI، سياسة التوجيه، ومحادثة تجريبية مع عرض التكلفة.

## المكوّنات

### Rust (Tauri)
- `providers.rs` — CRUD metadata + vault bridge
- `agent.rs` — `run_chat`, `validate_provider`, `get_sidecar_status`
- `pricing.rs` — cache أسعار + `fetch_pricing`

### Sidecar (Node)
- `providers/index.ts` — adapters لـ 6 مزودين
- `routing/engine.ts` — quality/cost/privacy/local/manual
- `index.ts` — HTTP: `/health`, `/route`, `/chat`, `/providers/validate`

### Frontend
- `ProvidersPageLive.tsx` — صفحة Providers
- `ProviderKeyDialog.tsx` — إدخال المفتاح
- `SettingsPage.tsx` — vault + pricing
- `useProviders.ts` · `useAgent.ts`

## سياسات Routing

| Policy | السلوك |
|--------|--------|
| quality-first | Anthropic → OpenAI → Gemini → … |
| cost-first | DeepSeek → Gemini → … |
| privacy-first | Ollama أولاً |
| local-only | Ollama فقط |
| manual | النموذج اليدوي من إعدادات المزود |

## Fallback

عند فشل مزود: `requiresApproval: true` → dialog في التطبيق → المستخدم يوافق أو يرفض.

## عرض التكلفة

- tokens من استجابة المزود
- cost من `pricing_cache` (input/output per million)
- إذا لا pricing: يظهر **cost unknown**

## كيف تختبر

```powershell
# terminal 1
npm run dev

# terminal 2
npm run sidecar
```

1. Providers → Ollama ON → Local-only
2. Tasks → رسالة → Usage panel يتحدّث
