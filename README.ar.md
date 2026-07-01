# Aura Work

[![الترخيص](https://img.shields.io/badge/الترخيص-انظر%20LICENSE-blue.svg)](LICENSE)
[![CI](https://github.com/hbx12/aura-work/actions/workflows/ci.yml/badge.svg)](https://github.com/hbx12/aura-work/actions/workflows/ci.yml)
[![English](https://img.shields.io/badge/lang-en-blue.svg)](README.md)
[![العربية](https://img.shields.io/badge/lang-ar-green.svg)](README.ar.md)

**الحالة الحالية: `0.1.0-alpha.11`** — تحت التعزيز الأمني النشط.

منصة وكيل ذكاء اصطناعي لسطح المكتب، مفتوحة المصدر، متعددة المزوّدين — محلية أولاً، محكومة بالصلاحيات، قابلة للاستضافة الذاتية.

---

## بناء إضافات Marketplace

هل تريد بناء إضافة لـ Aura Work؟ ابدأ هنا:

- **[دليل سوق Aura Marketplace](./registry/README.md)** — المكان الرسمي للمهارات، موصلات MCP، إضافات Aura، اللغات المدعومة، الملفات المطلوبة، وسير عمل الموافقة على GitHub.
- **[دليل تقديم Marketplace](./docs/marketplace-submission.md)** — صيغة التقديم الكاملة، قواعد التحقق، ومراجعة المشرف.

الإضافات المجتمعية تُقدم عبر طلبات سحب على GitHub وتُنشر فقط بعد موافقة المشرف.

---

## عرض توضيحي

<p align="center">
  <img src="assets/demo.gif" alt="عرض توضيحي لـ Aura Work" width="900">
</p>

> **تحذير ألفا:** لا تستخدم Aura Work في بيئات العمل الحساسة أو أتمتة الإنتاج. عزل VM والمثبّتات الموقّعة والعديد من الميزات التجريبية غير مكتملة أو معطّلة افتراضياً.

## تحميل

المثبّتات الرسمية لسطح المكتب منشورة على صفحة [GitHub Releases](https://github.com/hbx12/aura-work/releases/latest) بعد الموافقة على الإصدار.

> **تحذير ألفا:** لا تستخدم Aura Work في بيئات العمل الحساسة أو أتمتة الإنتاج. عزل VM والمثبّتات الموقّعة والعديد من الميزات التجريبية غير مكتملة أو معطّلة افتراضياً.

---

## المشرف والمساهمات

Aura Work تتم صيانتها بواسطة **حبيب (`hbx12`)**. الاقتراحات تُراجع بنشاط، والأفكار المفيدة تتحول إلى issues منظّمة ليتمكن المساهمون من العمل عليها دون تكرار الجهد.

- [🤝 المساهمون](./CONTRIBUTORS.md) — شكراً لكل من يساعد
- [🧑‍💻 دليل المساهم الجديد](./docs/new-contributor.md) — خطوة بخطوة للمبتدئين
- [مساهمون مطلوبون: ساعد في بناء Aura Work alpha](https://github.com/hbx12/aura-work/issues/16)
- [Issues مناسبة للمبتدئين](https://github.com/hbx12/aura-work/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- [مهام تحتاج مساعدة](https://github.com/hbx12/aura-work/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)
- [دليل المساهمة](./CONTRIBUTING.md)
- [دليل Marketplace](./registry/README.md)

يرجى التعليق على الـ issue قبل بدء العمل لتجنب ازدواج الجهد.

---

## القيود في مرحلة الألفا

| المجال | الحالة |
|--------|--------|
| **تنفيذ الأوامر** | التنفيذ عبر المضيف **معطّل افتراضياً**. يتطلب WSL2 أو backend معزول موثق. تجاوز للمطورين: `AURA_ALLOW_UNSAFE_HOST_EXECUTION=1` (للتطوير فقط). |
| **استخدام الحاسوب** | **معطّل افتراضياً.** فعّله للتطوير المحلي فقط: `AURA_ENABLE_EXPERIMENTAL_COMPUTER_USE=1`. |
| **صورة VM** | قد تكون أداة الحزمة **placeholder للتطوير** حتى يتم إصدار صورة إنتاج موقّعة. |
| **الإصدارات الموقّعة** | خط الإصدار يتطلب minisig و SBOM و checksums والمثبّتات — غير جاهز حتى يُنشر. |
| **مصادقة Sidecar** | الخدمات المحلية تتطلب رموز Bearer داخلية لكل جلسة (localhost لا يُعتبر كافياً). |

---

## الميزات (ألفا)

- ذكاء اصطناعي متعدد المزوّدين (OpenAI/ChatGPT Codex, Anthropic, Gemini, DeepSeek, Ollama) مع توجيه
- خزنة مشفّرة محلياً — المفاتيح تُخزّن مع التخزين الآمن لنظام التشغيل
- وكيل مهام مع أدوات ملفات، Git، VM، متصفح، إضافات و MCP
- توجيه مساحة العمل الشامل (Universal Workspace) للمستندات، الجداول، العروض التقديمية، PDF، البحث، البيانات، التصميم، الأتمتة، قواعد البيانات، والمتصفح
- مهارات HBX الرسمية في Marketplace مع بيانات مترجمة بالعربية والإنجليزية
- 20 لغة مع دعم RTL (العربية، الفارسية)
- وثائق متكاملة على [hbx12.github.io/aura-work](https://hbx12.github.io/aura-work) (عند النشر)

---

## بداية سريعة (تطوير)

```powershell
npm install
npm run build:sidecars
npm start
```

الـ sidecars تبدأ تلقائياً من تطبيق Tauri مع رموز مصادقة داخلية لكل جلسة.

التطوير اليدوي للـ sidecars يتطلب `AURA_SIDECAR_AUTH_TOKEN` (32+ حرف) في البيئة. راجع [docs/development.md](./docs/development.md).

---

## البناء من المصدر

```powershell
npm run build:sidecars
npm run stage:bundle
npm run build
cd apps\desktop
npm run tauri build
```

المثبّتات تُنتج تحت `apps/desktop/src-tauri/target/release/bundle/` عند نجاح البناء.

---

## الخصوصية والأمان

- **لا توجد بيانات تتبع** افتراضياً
- مفاتيح API مخزّنة مشفّرة محلياً، ولا تُزامَن أبداً مع Aura Cloud
- الإجراءات عالية التأثير تتطلب موافقة صريحة
- راجع [SECURITY.md](./SECURITY.md) للإبلاغ عن الثغرات

---

## المجتمع

- [مناقشات GitHub](https://github.com/hbx12/aura-work/discussions)
- [مدونة قواعد السلوك](./CODE_OF_CONDUCT.md)
- [دعم Matrix](https://matrix.to/#/#aura-os:matrix.org)

---

## الرخصة

راجع [LICENSE](./LICENSE) و [NOTICE](./NOTICE). Aura Work مرخصة بموجب الشروط في `LICENSE`.

---

## التوثيق

- [docs/README.md](./docs/README.md) — فهرس الميزات
- [docs/features/universal-workspace.md](./docs/features/universal-workspace.md) — أوضاع مساحة العمل الشامل
- [docs/features/artifact-tools.md](./docs/features/artifact-tools.md) — إنشاء والتحقق من الأدوات
- [docs/features/marketplace-localization.md](./docs/features/marketplace-localization.md) — ترجمة Marketplace
- [registry/README.md](./registry/README.md) — دليل إضافات Marketplace
- [docs/releases.md](./docs/releases.md) — الإصدارات الموقّعة
- [CONTRIBUTING.md](./CONTRIBUTING.md) — التطوير والترجمات
- [CHANGELOG.md](./CHANGELOG.md) — سجل الإصدارات
- [ROADMAP.md](./ROADMAP.md) — الاتجاه بعد الألفا

---

## اختبار المثبّت على جهاز نظيف

لvalidating البناء المثبت على Windows، راجع [docs/clean-machine-installer-smoke.md](./docs/clean-machine-installer-smoke.md).
