# المرحلة 4 — تنفيذ VM و Shell

## ملخص

تم تنفيذ **aura-vm-helper** (sidecar على المنفذ 47822) لإدارة دورة حياة مساحة Linux workspace، mount مجلد المشروع، وتنفيذ أوامر Shell مع redaction للأسرار. Rust يفرض **سياسة أوامر Shell** (قراءة آمنة / build-test / install / destructive) مع صلاحيات وسجل تدقيق. أداة `run_shell` متاحة في محرك المهام.

## ما الذي تم بناؤه

### VM Helper (`sidecar/aura-vm-helper/`)

| ملف | الوظيفة |
|-----|---------|
| `src/index.ts` | HTTP: `/health`, `/status`, `/start`, `/stop`, `/mount`, `/exec` |
| `src/backend.ts` | اكتشاف WSL (Windows) أو process-sandbox |
| `src/exec.ts` | تنفيذ أوامر مع timeout وredaction |
| `src/mounts.ts` | تتبع mounts لكل مشروع |
| `vm-image/manifest.json` | manifest صورة Linux (للتعبئة لاحقًا) |

### Rust (`apps/desktop/src-tauri/src/`)

| ملف | الوظيفة |
|-----|---------|
| `shell.rs` | تصنيف الأوامر وسياسة الموافقة |
| `vm.rs` | أوامر Tauri: `get_vm_status`, `start_vm`, `stop_vm` + `tool_run_shell` |

### الواجهة

- **Settings**: حالة workspace، Start/Stop
- **Context panel**: حالة VM helper
- **PermissionApprovalDialog**: موافقة أوامر shell

## كيف تختبر

1. ثبّت workspaces: `npm install`
2. ابنِ sidecars: `npm run build:sidecars`
3. شغّل VM helper: `npm run vm-helper`
4. شغّل agent: `npm run sidecar` (نافذة أخرى)
5. شغّل التطبيق: `npm run dev`
6. **Settings** → Start workspace → تحقق من Backend (WSL أو sandbox)
7. في Tasks اكتب: «شغّل `dir` أو `ls` في مجلد المشروع»
8. وافق على أمر shell عند المطالبة (Ask-first)
9. جرّب `npm install` → يجب أن يطلب موافقة دائمًا
10. أوقف VM helper → مهمة shell يجب أن تُبلّغ `workspace unavailable`

## معايير القبول (Milestone 4)

- [x] Shell يعمل في workspace (WSL أو sandbox)
- [x] mount مجلد المشروع read/read-write حسب نوع الأمر
- [x] أوامر destructive/install تتطلب موافقة
- [x] VM غير متاح يُوقف خطوات shell برسالة واضحة

## Phase 5+

- Rust يشغّل sidecars تلقائيًا مع التطبيق
- streaming chat
