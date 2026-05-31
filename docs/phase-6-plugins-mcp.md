# المرحلة 6 — Plugins و MCP

## ملخص

تم تنفيذ **aura-plugins-helper** (sidecar على المنفذ 47824) لتحميل **Aura plugins**، واتصال **MCP servers**، ومزامنة **metadata السوق**. Rust يفرض **صلاحيات** و**audit** على `plugin_tool` و `mcp_tool`. الواجهة تتضمن صفحة **Plugins & MCP**.

## ما الذي تم بناؤه

### Plugins Helper (`sidecar/aura-plugins-helper/`)

| ملف | الوظيفة |
|-----|---------|
| `src/index.ts` | HTTP: `/health`, `/status`, `/start`, `/stop`, `/config`, `/tools`, `/plugin/call`, `/mcp/call`, `/marketplace/fetch` |
| `src/manifest.ts` | قراءة والتحقق من `aura.plugin.json` |
| `src/loader.ts` | تحميل plugins وتنفيذ الأدوات |
| `src/mcp-client.ts` | اتصال MCP عبر stdio (`@modelcontextprotocol/sdk`) |
| `src/marketplace.ts` | مزامنة metadata من `docs/registry.json` أو URL |

### Rust (`apps/desktop/src-tauri/src/`)

| ملف | الوظيفة |
|-----|---------|
| `extensions_helper.rs` | اتصال HTTP مع plugins helper |
| `plugins.rs` | تثبيت/إزالة plugins، marketplace cache، `tool_plugin_call` |
| `mcp.rs` | CRUD لـ MCP servers، إعدادات per-project، `tool_mcp_call` |

### الواجهة

- **Plugins & MCP** (nav): تثبيت محلي، MCP servers، marketplace sync
- **Settings**: Start/Stop plugins helper
- **Context panel**: حالة plugins helper
- **PermissionApprovalDialog**: موافقة plugin/MCP (puzzle/cpu)

### Sample plugin

- `examples/aura-sample-plugin/` — أدوات `sample.greet` و `sample.echo`

## كيف تختبر

1. `npm install`
2. `npm run build:sidecars`
3. `npm run plugins-helper` (نافذة)
4. `npm run sidecar` (+ vm/browser helpers اختياري)
5. `npm run dev`
6. **Plugins & MCP** → Start helper → Install from folder → `examples/aura-sample-plugin`
7. في Tasks: «استخدم sample.greet مع الاسم Aura»
8. وافق على plugin tool call
9. أضف MCP server (اختياري — يتطلب npx و MCP package)
10. تحقق من Audit log لـ plugin/mcp calls

## معايير القبول (Milestone 6)

- [x] تحميل Aura plugin manifest
- [x] موافقات صلاحيات plugin
- [x] إعداد MCP servers
- [x] marketplace metadata sync (محلي + remote URL)
- [x] تثبيت plugin محلي
- [x] plugin tool call مُصرَّح ومُدقَّق
- [x] MCP tool call مُصرَّح ومُدقَّق

## Phase 9+

- Chrome extension و Office add-ins
