# تنفيذ VM و Shell (Phase 4)

## البنية

```
Tauri (vm.rs) ──HTTP──► aura-vm-helper :47822
                              │
                              ├─ WSL2 (Windows)
                              └─ process-sandbox (fallback)
```

## سياسة الأوامر

| الفئة | أمثلة | موافقة |
|-------|-------|--------|
| Safe read | `ls`, `git status`, `rg` | Ask-first فقط |
| Build/test | `npm test`, `cargo test` | Ask-first |
| Install | `npm install`, `pip install` | دائمًا |
| Destructive | `rm`, `git reset --hard` | دائمًا (critical) |

أنماط محظورة: `rm -rf /`, fork bomb، إلخ.

## API (VM helper)

- `GET /health` — phase 4
- `GET /status` — حالة VM وmounts
- `POST /start` / `POST /stop`
- `POST /mount` — `{ projectId, hostPath, mode }`
- `POST /exec` — `{ projectId, command, timeoutMs? }`

## أداة المهمة

```json
{"type":"tool_calls","toolCalls":[{"name":"run_shell","arguments":{"command":"ls -la"}}]}
```

## سجل التدقيق

فئة `shell` مع action (`read`, `build-test`, `install`, `destructive`, `execute`).
