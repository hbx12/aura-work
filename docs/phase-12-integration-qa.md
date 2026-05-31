# المرحلة 12 — Full Integration QA و«Application Complete»

## ملخص

تم تنفيذ **حزمة قبول تكامل كاملة** وفق **PRD القسم 5**: اختبارات آلية (Vitest + Rust unit tests)، قائمة تحقق يدوية لـ macOS/Windows/Linux، ومصفوفة «Application Complete».

## ما الذي تم بناؤه

### Acceptance Suite (`qa/acceptance-suite`)

| المكوّن | الوظيفة |
|---------|---------|
| `src/tests/infrastructure.test.ts` | 5.1 bundle/VM/i18n، 5.2 Ollama، وجود وحدات Rust |
| `src/tests/cloud-e2ee.test.ts` | 5.4/5.5 dispatch offline، 5.8 E2EE inspect |
| `src/tests/bridge-cli.test.ts` | 5.6/5.7 bridge gates، CLI offline |
| `MANUAL.md` | قائمة يدوية + مصفوفة منصات |
| `qa/application-complete.json` | بيانات Phase 12 للتقارير |

### Rust unit tests (PRD 5.3, 5.9, 5.10)

| ملف | اختبارات |
|-----|----------|
| `permissions.rs` | `target_matches`, scheduled profile, `always_requires` |
| `computer_use.rs` | blocklist patterns، تطبيق محظور |
| `i18n.rs` | `normalize_locale_tag`, 20 locale |
| `shell.rs` | (موجود مسبقًا) hard-deny أوامر |

### أوامر جديدة

```powershell
npm run test:rust          # cargo test في desktop Tauri
npm run test:acceptance    # Vitest — PRD Section 5
npm run qa                 # build sidecars/cloud + rust + acceptance
```

## كيف تختبر

1. `npm install`
2. `npm run qa` — يجب أن ينجح بالكامل
3. `npm run dev` + sidecars — تحقق `/health` → `phase: 12`
4. نفّذ **`qa/acceptance-suite/MANUAL.md`** على كل منصة (macOS، Windows، Linux)
5. وقّع مصفوفة المنصات في نهاية `MANUAL.md`

## معايير القبول (Phase 12)

- [x] Acceptance Test Suite (Section 5) — automated coverage + manual checklist
- [x] Rust unit tests for permissions, computer use, i18n, shell policy
- [x] Cloud E2EE + offline dispatch verified against live cloud server
- [x] Bridge/CLI offline behavior verified
- [x] VM image hash + bundle manifest + 20 locales verified
- [ ] Manual platform matrix — **يتطلب موافقة بشرية على كل OS**

## Phase 13+

- Open-source release and community launch (Phase 14)

## Application Complete

التطبيق يُعتبر **مكتملًا ميزاتيًا** عندما:

1. `npm run qa` ينجح
2. مصفوفة المنصات في `MANUAL.md` مكتملة
3. المستخدم يوافق صراحةً على Phase 12

بعدها فقط يبدأ **Phase 13 — Marketing Website**.
