# المرحلة 1 — Repository, Desktop Shell, Design System

## ما اكتمل

- monorepo: `apps/desktop` (Tauri + React) · `packages/ui` · `sidecar/aura-agent`
- نظام التصميم Aura OS Design System مُنفَّذ كـ CSS tokens + مكوّنات React
- واجهة سطح المكتب: شريط عنوان، nav rail، sidebar مشاريع، صفحات ثانوية
- Rust backend + SQLite: CRUD مشاريع، اختيار مجلد
- sidecar Node: health endpoint على `127.0.0.1:47821`

## كيف تختبر

### 1) تثبيت الاعتماديات

```powershell
cd D:\Aura_os
npm install
```

### 2) تشغيل التطبيق (Tauri)

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
npm run dev
```

أو من مجلد desktop:

```powershell
cd apps\desktop
npm run tauri dev
```

### 3) اختبار المشاريع

1. افتح التطبيق
2. اضغط **+** بجانب Projects
3. اختر مجلدًا أو اكتب مسارًا
4. أنشئ مشروعًا — يظهر في القائمة
5. أغلق التطبيق وافتحه — المشروع ما زال موجودًا (SQLite)

### 4) اختبار الثيم

- زر الشمس/القمر في شريط العنوان يبدّل light/dark
- التفضيل يُحفظ في `localStorage` تحت `aura-theme`

### 5) sidecar (اختياري)

```powershell
npm run sidecar
```

ثم افتح `http://127.0.0.1:47821` — JSON health.

## قاعدة البيانات

- المسار: `%APPDATA%\com.auraos.desktop\aura.db` (Windows)
- جدول `projects`: id, name, folder_path, instructions, permission_mode, timestamps

## ما لم يُبنَ بعد (مراحل لاحقة)

- Vault ومزودي AI الحقيقيون → Phase 2
- محرك المهام والأدوات → Phase 3
- VM → Phase 4
