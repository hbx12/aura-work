# Troubleshooting Guide

Common issues and solutions for Aura Work.

## Table of Contents

- [Build Issues](#build-issues)
- [Sidecar Issues](#sidecar-issues)
- [VM Issues](#vm-issues)
- [Provider Issues](#provider-issues)
- [Bridge Issues](#bridge-issues)
- [Desktop App Issues](#desktop-app-issues)

---

## Build Issues

### `npm ci` fails with lock file mismatch

**Error:**
```
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync
```

**Solution:**
```powershell
npm install
git add package-lock.json
git commit -m "chore: update package-lock.json"
```

### Rust compilation fails with `link.exe` not found (Windows)

**Error:**
```
error: linker `link.exe` not found
```

**Solution:**
Install Visual Studio Build Tools with C++ workload:
```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

### Tauri build fails with missing Linux dependencies

**Error:**
```
Package webkit2gtk-4.1 was not found
```

**Solution:**
```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libglib2.0-dev libsecret-1-dev pkg-config
```

---

## Sidecar Issues

### Sidecar won't start

**Check:**
1. Verify `AURA_SIDECAR_AUTH_TOKEN` is set (32+ chars)
2. Check if port is already in use:
   ```powershell
   netstat -ano | findstr :47821
   ```
3. Check sidecar logs in the terminal

### Sidecar authentication failed

**Error:**
```
401 Unauthorized
```

**Solution:**
1. Ensure `AURA_SIDECAR_AUTH_TOKEN` matches between desktop app and sidecars
2. Token must be 32+ characters
3. Restart the desktop app after changing the token

---

## VM Issues

### VM image verification failed

**Error:**
```
VM image signature verified: FAILED
```

**Solution:**
1. This is expected in development — the bundled VM image may be a placeholder
2. For production, ensure the VM image is signed with the correct key
3. Check `bundle/manifest.json` for the expected signature

### VM execution timeout

**Error:**
```
Command timed out after 30000ms
```

**Solution:**
1. Increase timeout in VM helper configuration
2. Check if the VM is running: `docker ps` or `wsl -l -v`
3. Ensure sufficient system resources

---

## Provider Issues

### API key not working

**Check:**
1. Verify the key is correctly stored in the vault (Settings → Vault)
2. Test the key directly with the provider's API
3. Check if the key has the required permissions/scopes

### Rate limit exceeded

**Error:**
```
429 Too Many Requests
```

**Solution:**
1. Wait for the rate limit to reset
2. Enable "Cost-first" routing policy to use cheaper models
3. Set a monthly budget limit in Settings

---

## Bridge Issues

### Chrome extension can't connect

**Check:**
1. Ensure the bridge sidecar is running on port 47826
2. Check Chrome extension popup for connection status
3. Verify `host_permissions` in `manifest.json` includes the bridge URL

### Pairing code expired

**Error:**
```
Pairing code expired
```

**Solution:**
1. Generate a new pairing code from Extensions → Pair
2. Enter the code within 60 seconds
3. Ensure the bridge sidecar is running

---

## Desktop App Issues

### App crashes on startup

**Check:**
1. Check system requirements (Windows 10+, macOS 10.15+, Ubuntu 20.04+)
2. Verify WebView2 is installed (Windows):
   ```powershell
   winget install --id Microsoft.EdgeWebView2
   ```
3. Check crash logs in `%APPDATA%/aura-work/logs/`

### Theme not applying

**Solution:**
1. Clear localStorage: Settings → Reset preferences
2. Restart the app
3. Check if the theme CSS file exists in `packages/ui/src/themes/`

### i18n strings showing as keys

**Error:**
```
settings.theme instead of "Theme"
```

**Solution:**
1. Check if the locale file exists in `packages/i18n/locales/`
2. Verify the key exists in the locale JSON
3. Clear cache and restart

---

## Getting Help

If your issue isn't covered here:

1. Search [GitHub Issues](https://github.com/hbx12/aura-work/issues)
2. Check [GitHub Discussions](https://github.com/hbx12/aura-work/discussions)
3. Open a new issue with:
   - OS and version
   - Node.js version (`node --version`)
   - Rust version (`rustc --version`)
   - Error logs (terminal output)
   - Steps to reproduce
