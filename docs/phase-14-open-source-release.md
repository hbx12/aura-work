# المرحلة 14 — Open-Source Release and Community Launch

## ملخص

تم إعداد Aura OS للإطلاق المفتوح المصدر **v1.0.0** وفق **PRD القسم 10** و**Milestone 13**: Apache-2.0، ملفات المجتمع والحوكمة، CI/CD متعدد المنصات، SBOM، فحص أسرار، وworkflow ترجمة Weblate.

## ما الذي تم بناؤه

### الترخيص (§10.1)

| الملف | الوظيفة |
|-------|---------|
| `LICENSE` | Apache License 2.0 كامل |
| `NOTICE` | إشعار Apache-2.0 |
| `THIRD-PARTY-NOTICES` | تدقيق تراخيص npm + Cargo |
| `scripts/audit-licenses.mjs` | إعادة توليد THIRD-PARTY-NOTICES |

### المجتمع والحوكمة (§10.2)

- `CONTRIBUTING.md` — بيئة التطوير، معايير الكود، PR، ترجمات
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
- `SECURITY.md` — إفصاح مسؤول + إصدارات مدعومة
- `SUPPORT.md` — قنوات الدعم
- `GOVERNANCE.md` + `MAINTAINERS`
- `CHANGELOG.md` — Keep a Changelog، v1.0.0
- `ROADMAP.md`
- `.github/ISSUE_TEMPLATE/` — bug + feature
- `.github/pull_request_template.md`
- `.editorconfig` + `.prettierrc.json`
- `.gitignore` محسّن (أسرار، SBOM، artifacts)

### CI/CD وسلسلة التوريد (§10.3)

| Workflow | الوظيفة |
|----------|---------|
| `.github/workflows/ci.yml` | build + test على macOS/Windows/Linux + secret scan + license audit |
| `.github/workflows/release.yml` | بناء Tauri + SBOM + SHA256 + توقيع minisign (عند وجود secret) |
| `.github/dependabot.yml` | npm + GitHub Actions |

### الإصدار والترجمة (§10.4)

- الإصدار **1.0.0** عبر الم monorepo
- `.weblate` + تحديث `packages/i18n/WEBLATE.md`
- `docs/release-verification.md` — التحقق من checksums/signatures

### الإطلاق (§10.5)

- قنوات مجتمع موثّقة في SUPPORT.md (Discussions + Matrix)
- موقع التنزيل يشير إلى `v1.0.0` artifacts
- **يتطلب من الم maintainer:** جعل المستودع public + `git tag v1.0.0` + نشر Release

## أوامر

```powershell
npm run audit:licenses   # THIRD-PARTY-NOTICES
npm run sbom             # sbom.json
npm run qa               # acceptance suite
npm run build:website
```

## كيف تختبر

1. تحقق من وجود `LICENSE`, `NOTICE`, `THIRD-PARTY-NOTICES`
2. `npm run audit:licenses` — ينجح بدون أخطاء
3. `npm run qa` — acceptance + rust tests
4. `npm run build:website` — موقع v1.0.0
5. راجع `.github/workflows/` — CI matrix ثلاث منصات

## معايير القبول (Phase 14)

- [x] LICENSE (Apache-2.0), NOTICE, THIRD-PARTY-NOTICES
- [x] ملفات community/governance
- [x] CI builds + tests على 3 OS + secret scan
- [x] Release workflow + SBOM + checksums
- [x] Weblate-compatible translation workflow
- [x] v1.0.0 version markers
- [ ] مستودع public + tag v1.0.0 موقّع — **يتطلب إعداد GitHub من المستخدم**

## المشروع مكتمل

Phase 14 هي المرحلة الأخيرة في PRD. بعد الموافقة، Aura OS v1.0.0 جاهز للإطلاق المجتمعي.
