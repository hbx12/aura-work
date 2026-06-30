# الهيكل المعماري

[![English](https://img.shields.io/badge/lang-en-blue.svg)](architecture.md)
[![العربية](https://img.shields.io/badge/lang-ar-green.svg)](architecture.ar.md)

## Monorepo

```
Aura_os/
├── apps/desktop/          # Tauri 2 + React — التطبيق الرئيسي
│   ├── src/               # React UI
│   └── src-tauri/         # Rust: SQLite, Tauri commands
├── packages/ui/           # Aura OS Design System (React + CSS)
├── sidecar/aura-agent/    # Node sidecar — orchestration (Phase 1 skeleton)
├── design-system/         # المصدر الأصلي للتصميم (مستخرج من ZIP)
├── docs/                  # توثيق الميزات (هذا المجلد)
└── PRD/                   # مواصفات المنتج
```

## العمليات (Phase 1)

| العملية | الدور |
|---|---|
| `aura-app` (Tauri) | واجهة + Rust backend |
| `aura-agent` (Node) | skeleton — health HTTP فقط |

## تدفق إنشاء مشروع

```
React (NewProjectDialog)
  → invoke("pick_folder")     [Rust + tauri-plugin-dialog]
  → invoke("create_project")  [Rust → SQLite INSERT]
  → invoke("list_projects") [Rust → SQLite SELECT]
  → Sidebar يعرض القائمة
```

## الاعتماديات بين الحزم

- `@aura-os/desktop` يعتمد على `@aura-os/ui`
- Vite alias: `@aura-os/ui` → `packages/ui/src`
