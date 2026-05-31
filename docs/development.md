# التطوير والبناء

## المتطلبات

- Node.js 20+
- Rust (rustup stable) — لـ Tauri
- Windows: WebView2 (عادةً مثبت مسبقًا)

## أوامر

```powershell
cd D:\Aura_os
npm install

# تطبيق سطح المكتب (Tauri dev)
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
npm run dev

# واجهة فقط (Vite — بدون Rust)
npm run dev:web

# بناء production
npm run build
cd apps\desktop
npm run tauri build

# sidecar
npm run sidecar
```

## مسارات مهمة

- SQLite: `%APPDATA%\com.auraos.desktop\aura.db`
- Design tokens: `packages/ui/src/tokens.css`

## استكشاف الأخطاء

| المشكلة | الحل |
|---|---|
| `rustc` not found | أعد فتح terminal أو أضف `%USERPROFILE%\.cargo\bin` للـ PATH |
| port 1420 busy | أوقف vite/tauri سابق |
| Tauri build بطيء أول مرة | طبيعي — Cargo يحمّل dependencies |
