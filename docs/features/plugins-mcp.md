# Plugins و MCP

## الغرض

توسيع Aura OS بـ **Aura plugins** (حزم محلية بـ `aura.plugin.json`) و**MCP servers** (stdio). كل استدعاء أداة يمر عبر **صلاحيات** و**audit log**.

## Sidecar: aura-plugins-helper

- المنفذ: **47824**
- التشغيل: `npm run plugins-helper`

### API

| Method | Path | الوظيفة |
|--------|------|---------|
| GET | `/health` | `phase: 6`, `version: 0.6.0` |
| GET | `/status` | حالة helper + عدد الأدوات |
| POST | `/start` | بدء helper |
| POST | `/stop` | إيقاف helper |
| POST | `/config` | Rust يرسل plugins + MCP config |
| GET | `/tools?projectId=` | قائمة أدوات plugin + MCP |
| POST | `/plugin/call` | تنفيذ أداة plugin |
| POST | `/mcp/call` | تنفيذ أداة MCP |
| POST | `/marketplace/fetch` | جلب metadata السوق |

## Aura plugin manifest

```json
{
  "schemaVersion": "1.0",
  "id": "com.example.plugin",
  "name": "Example Plugin",
  "version": "0.1.0",
  "entrypoints": { "tools": "./tools/index.js" },
  "permissions": { "files": [], "network": [], "shell": [], "browser": [], "secrets": [] },
  "tools": [{ "id": "example.lookup", "name": "Lookup", "description": "..." }]
}
```

- التثبيت ينسخ الحزمة إلى `~/.aura-os/plugins/{id}/`
- `tools/index.js` يصدّر `handlers` لكل `tool.id`

## أدوات المهام (Rust)

| أداة | المعاملات |
|------|-----------|
| `plugin_tool` | `pluginId`, `toolId`, `arguments` |
| `mcp_tool` | `serverId`, `toolName`, `arguments` |

- الفئة في الصلاحيات: `plugin` / `mcp`
- الإجراء: `call`
- الهدف: `{pluginId}:{toolId}` أو `{serverId}:{toolName}`
- **دائماً يتطلب موافقة** (حتى في act-without-asking)

## MCP

- جدول `mcp_servers`: command + args (stdio)
- `project_mcp_settings`: تعطيل MCP per-project
- Rust يدفع config إلى sidecar عبر `/config` بعد أي تغيير

## Aura Marketplace (متجر Aura)

تمت ترقية قسم الإضافات إلى متجر متكامل (Aura Marketplace) داخل التطبيق يسهل اكتشاف وتثبيت وتكوين الملحقات:
1. **المهارات (Skills)**: حزم تعليمات برمجية مسبقة للوكيل (مثل Security Auditor أو PRD Writer).
2. **موصلات MCP (MCP Connectors)**: اتصالات جاهزة للأدوات والخدمات الخارجية (مثل GitHub MCP أو PostgreSQL MCP).
3. **الإضافات (Plugins)**: ملحقات برمجية متكاملة لـ Aura Work.

### المميزات الأمنية والتشغيلية للمتجر:
- **تخزين المفاتيح في الخزنة الآمنة (Vault)**: لحفظ الأسرار والمفاتيح (مثل توكن GitHub أو رابط قاعدة البيانات) بأمان تام. يتم تمريرها كمتغيرات بيئة ديناميكية أثناء بدء تشغيل خوادم الـ MCP دون تخزينها بشكل نصي صريح في قاعدة بيانات SQLite.
- **مستوى الخطورة وصلاحيات الوصول**: يوضح المتجر بشكل صريح الصلاحيات المطلوبة لكل إضافة ومستوى خطورتها (Low / Medium / High) مع إظهار تحذيرات واضحة للمكونات عالية الخطورة (مثل Docker و Postgres) قبل السماح بالتثبيت.
- **سجل التسجيل المحلي (Registry)**: يقع في `registry/marketplace.json` ويحتوي على كافة العناصر الافتراضية مع الأيقونات والأغلفة الرسومية (SVG) تحت `registry/assets/`.
- **مخزن ذاكرة التخزين المؤقت**: يتم تخزين البيانات مؤقتاً في SQLite في جدول `marketplace_cache`. في حال كانت قاعدة البيانات فارغة، يعتمد التطبيق على قراءة سجل `registry/marketplace.json` المحلي كخيار بديل مباشر لضمان سرعة التحميل.

## Tauri commands

- `install_local_plugin`, `uninstall_plugin`, `set_plugin_enabled`
- `list_installed_plugins`, `sync_marketplace`, `list_marketplace_entries`
- `add_mcp_server`, `delete_mcp_server`, `set_mcp_server_enabled`
- `set_project_mcp_enabled`, `list_project_mcp_settings`
- `get_plugins_status`, `start_plugins`, `stop_plugins`, `reload_plugins_helper`

## كيف تختبر

1. ثبّت `examples/aura-sample-plugin`
2. Start plugins helper
3. مهمة: «Call sample.greet with name Test»
4. وافق → تحقق من Audit
5. Sync marketplace → يظهر Aura Sample Plugin
