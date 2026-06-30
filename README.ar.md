# Aura Work

[![الترخيص](https://img.shields.io/badge/الترخيص-انظر%20LICENSE-blue.svg)](LICENSE)
[![CI](https://github.com/hbx12/aura-work/actions/workflows/ci.yml/badge.svg)](https://github.com/hbx12/aura-work/actions/workflows/ci.yml)
[![English](https://img.shields.io/badge/lang-en-blue.svg)](README.md)
[![العربية](https://img.shields.io/badge/lang-ar-green.svg)](README.ar.md)

**الحالة الحالية: `0.1.0-alpha.11`** — تحت التعزيز الأمني النشط.

منصة وكيل ذكاء اصطناعي لسطح المكتب، مفتوحة المصدر، متعددة المزوّدين — محلية أولاً، محكومة بالصلاحيات، قابلة للاستضافة الذاتية.

---

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

## الميزات (ألفا)

- ذكاء اصطناعي متعدد المزوّدين (OpenAI/ChatGPT Codex, Anthropic, Gemini, DeepSeek, Ollama) مع توجيه
- خزنة مشفّرة محلياً — المفاتيح تُخزّن مع التخزين الآمن لنظام التشغيل
- وكيل مهام مع أدوات ملفات، Git، VM، متصفح، إضافات و MCP
- توجيه مساحة العمل الشامل (Universal Workspace) للمستندات، الجداول، العروض التقديمية، PDF، البحث، البيانات، التصميم، الأتمتة، قواعد البيانات، والمتصفح
- 20 لغة مع دعم RTL (العربية، الفارسية)
- سوق HBX الرسمي مع مهارات محلية بالعربية والإنجليزية

---

## بداية سريعة (تطوير)

```powershell
npm install
npm run build:sidecars
npm start
```

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
