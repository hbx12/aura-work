# المرحلة 3 — محرك المهام ووقت تشغيل الأدوات

## ملخص

تم تنفيذ محرك المهام (Task Engine) مع حالة مهمة دائمة، منسّق (Coordinator) وأدوار فرعية، أدوات قراءة/كتابة الملفات، فهرسة/بحث مع استثناءات، مطالبات صلاحيات، سجل تدقيق، Monaco لعرض الملفات، وGit status/diff مع موافقة على الـ commit.

## ما الذي تم بناؤه

### Rust (`apps/desktop/src-tauri/src/`)

| ملف | الوظيفة |
|-----|---------|
| `tasks.rs` | آلة حالات المهمة، إنشاء/تشغيل/إيقاف، تخطيط، حلقة تنفيذ مع أدوات |
| `files.rs` | قائمة ملفات، قراءة، كتابة (مع diff معلّق في Ask-first)، بحث نصي |
| `git.rs` | Git status، diff، اقتراح commit، commit بعد موافقة |
| `audit.rs` | سجل تدقيق append-only |
| `permissions.rs` | مطالبات صلاحيات، allow-once / allow-always-project / deny |

### Sidecar (`sidecar/aura-agent/`)

| ملف | الوظيفة |
|-----|---------|
| `src/task/coordinator.ts` | توليد الخطة وتكرار حلقة الوكيل |
| `src/index.ts` | `/task/plan`, `/task/iterate` — Phase 3 |

### الواجهة

- مساحة مهام حية: PlanBlock، Steps، Approval، Summary
- صفحة Files + Monaco (قراءة)
- صفحة Git (status، diff، commit بموافقة)
- صفحة Audit Log حية
- PermissionApprovalDialog

## كيف تختبر

1. شغّل Sidecar: `npm run sidecar`
2. شغّل التطبيق: `npm run dev`
3. أنشئ مشروعًا على مجلد Git إن أمكن
4. في Tasks اكتب مهمة مثل: «اقرأ README.md واقترح تحسينًا»
5. راجع الخطة → **Approve & run**
6. عند مطالبة صلاحية قراءة/كتابة ملف → Allow once
7. في Files راجع **Pending edits** ووافق على الكتابة
8. في Git راجع diff → Propose commit → Approve commit
9. في Audit Log تحقق من إ entries للملفات والصلاحيات وGit

## معايير القبول (Milestone 3)

- [x] مهمة تقرأ ملفات، تقترح تعديلات، تطلب موافقة، تكتب، وتعرض diff
- [x] Git commit يتطلب موافقة صريحة
- [x] سجل التدقيق يسجّل أفعال الملفات والصلاحيات

## Phase 4+

- Hyper-V / KVM / Apple-VZ مع صورة Linux مدمجة في المثبت
