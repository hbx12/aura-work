# Aura OS — توثيق المشروع

هذا المجلد يوثّق **كل ميزة** في Aura OS: ماذا تفعل، أين الكود، وكيف تختبرها.
راجع الملف المناسب قبل أي تعديل.

## الفهرس

| الملف | المحتوى |
|---|---|
| [phase-1-shell.md](./phase-1-shell.md) | ملخص المرحلة 1 — ما اكتمل وكيف تختبره |
| [phase-2-providers-vault.md](./phase-2-providers-vault.md) | ملخص المرحلة 2 — vault، providers، routing، cost |
| [phase-3-task-engine.md](./phase-3-task-engine.md) | ملخص المرحلة 3 — task engine، أدوات، audit، Monaco، Git |
| [phase-4-vm-execution.md](./phase-4-vm-execution.md) | ملخص المرحلة 4 — VM helper، shell، mounts، سياسة أوامر |
| [phase-5-browser-web.md](./phase-5-browser-web.md) | ملخص المرحلة 5 — browser helper، WebView، browse_url، استشهادات |
| [phase-6-plugins-mcp.md](./phase-6-plugins-mcp.md) | ملخص المرحلة 6 — plugins helper، MCP، marketplace، plugin_tool/mcp_tool |
| [phase-7-aura-cloud-e2ee.md](./phase-7-aura-cloud-e2ee.md) | ملخص المرحلة 7 — Aura Cloud، E2EE sync، pairing، remote dispatch |
| [phase-8-scheduled-tasks.md](./phase-8-scheduled-tasks.md) | ملخص المرحلة 8 — scheduled tasks، cadence، permission profiles |
| [phase-9-extensions-bridge.md](./phase-9-extensions-bridge.md) | ملخص المرحلة 9 — local bridge، Chrome extension، Office add-ins |
| [phase-10-computer-use.md](./phase-10-computer-use.md) | ملخص المرحلة 10 — computer use تجريبي، blocklist، screenshot retention |
| [phase-11-packaging-i18n.md](./phase-11-packaging-i18n.md) | ملخص المرحلة 11 — packaging، updates، i18n، CLI |
| [phase-12-integration-qa.md](./phase-12-integration-qa.md) | ملخص المرحلة 12 — acceptance suite، Application Complete |
| [phase-13-marketing-website.md](./phase-13-marketing-website.md) | ملخص المرحلة 13 — موقع التسويق والتنزيل |
| [phase-14-open-source-release.md](./phase-14-open-source-release.md) | ملخص المرحلة 14 — الإطلاق المفتوح المصدر v1.0.0 |
| [architecture.md](./architecture.md) | هيكل monorepo والعمليات |
| [features/design-system.md](./features/design-system.md) | نظام التصميم — tokens، themes، مكوّنات |
| [features/projects.md](./features/projects.md) | المشاريع — إنشاء، فتح، SQLite |
| [features/desktop-shell.md](./features/desktop-shell.md) | واجهة سطح المكتب — nav، sidebar، صفحات |
| [features/vault.md](./features/vault.md) | Vault مشفر محلي |
| [features/providers.md](./features/providers.md) | المزودون، routing، chat، cost |
| [features/task-engine.md](./features/task-engine.md) | محرك المهام، حالة المهمة، أدوات الملفات |
| [features/vm-execution.md](./features/vm-execution.md) | VM helper، shell، mounts، سياسة أوامر |
| [features/browser-web.md](./features/browser-web.md) | Browser helper، WebView، browse_url، profiles |
| [features/plugins-mcp.md](./features/plugins-mcp.md) | Plugins helper، MCP، marketplace، plugin_tool/mcp_tool |
| [features/aura-cloud-e2ee.md](./features/aura-cloud-e2ee.md) | Aura Cloud، E2EE sync، remote dispatch |
| [features/scheduled-tasks.md](./features/scheduled-tasks.md) | Scheduled tasks، cadence، permission profiles |
| [features/local-bridge.md](./features/local-bridge.md) | Local bridge، Chrome extension، Office add-ins |
| [features/computer-use.md](./features/computer-use.md) | Computer use تجريبي، blocklist، screenshot retention |
| [features/i18n.md](./features/i18n.md) | i18n — 20 لغة، Weblate، RTL |
| [features/packaging-cli.md](./features/packaging-cli.md) | Packaging، updates، aura CLI |
| [features/audit-log.md](./features/audit-log.md) | سجل التدقيق |
| [features/sidecar.md](./features/sidecar.md) | sidecar Node — task engine + providers |
| [development.md](./development.md) | أوامر التشغيل والبناء |

## قاعدة التوثيق

عند إضافة أو تعديل ميزة:
1. حدّث ملف الميزة في `docs/features/`
2. اذكر: **الغرض** · **الملفات** · **كيف يعمل** · **كيف تختبر**
