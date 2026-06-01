# Sidecar (aura-agent)

## الغرض

عملية Node للـ: **محرك المهام**، provider adapters، routing engine، chat API.

## الملفات

| الملف | الوظيفة |
|---|---|
| `sidecar/aura-agent/src/index.ts` | HTTP server |
| `sidecar/aura-agent/src/task/coordinator.ts` | تخطيط المهام + تكرار الحلقة |
| `sidecar/aura-agent/src/providers/index.ts` | 6 provider adapters |
| `sidecar/aura-agent/src/routing/engine.ts` | routing policies |
| `packages/shared/` | أنواع مشتركة |

## API (Phase 8)

| Method | Path | الوظيفة |
|--------|------|---------|
| GET | `/health` | حالة sidecar — `phase: 7` |
| POST | `/task/plan` | توليد خطة مهمة |
| POST | `/task/iterate` | خطوة واحدة من حلقة الوكيل (يشمل `run_shell`, `browse_url`, `plugin_tool`, `mcp_tool`) |
| POST | `/providers/validate` | التحقق من credentials |
| POST | `/providers/models` | قائمة النماذج |
| POST | `/route` | قرار routing |
| POST | `/chat` | محادثة (non-streaming) |

## التشغيل

```powershell
cd D:\Aura_os
npm run build:sidecar
npm run sidecar
```

## الأمان

- يستمع على `127.0.0.1` فقط
- credentials تُمرَّر من Rust — لا تُخزَّن في sidecar
- **تنفيذ الأدوات (ملفات/Git/shell) في Rust** — sidecar يقرر فقط أي أداة تُستدعى

## VM helper (Phase 4)

Sidecar منفصل: `sidecar/aura-vm-helper` على المنفذ **47822**. راجع [vm-execution.md](./vm-execution.md).

## Browser helper (Phase 5)

Sidecar منفصل: `sidecar/aura-browser-helper` على المنفذ **47823**. راجع [browser-web.md](./browser-web.md).

## Plugins helper (Phase 6)

Sidecar منفصل: `sidecar/aura-plugins-helper` على المنفذ **47824**. راجع [plugins-mcp.md](./plugins-mcp.md).

## Cloud sync helper (Phase 7)

Sidecar منفصل: `sidecar/aura-cloud-sync` على المنفذ **47825**. E2EE sync client + dispatch relay. راجع [aura-cloud-e2ee.md](./aura-cloud-e2ee.md).

## Aura Cloud server (Phase 7)

Self-hostable: `server/aura-cloud` على المنفذ **47830**. `npm run cloud-server`.

## Tauri integration

- `start_task` / `advance_task` — Rust → `/task/plan` + `/task/iterate`
- `run_chat` — Rust → `/route` + `/chat`
- `get_sidecar_status` — ping `/health`

## Phase 12+

- Marketing website
