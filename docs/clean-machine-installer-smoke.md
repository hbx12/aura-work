# Clean-machine installer smoke test

This checklist validates that an installed Aura Work build starts and reports healthy local services without relying on a developer workspace.

## Preconditions

Use a clean Windows VM or a Windows machine without:

- A cloned Aura Work repository
- Workspace `node_modules`
- A globally installed Node.js runtime, unless the installer intentionally ships or requires it
- Development environment variables from the repository

## Manual checklist

1. Install the generated Windows installer.
2. Start Aura Work from the installed application shortcut.
3. Confirm that the desktop window opens.
4. Run the smoke script from a separate PowerShell window:

   powershell -ExecutionPolicy Bypass -File scripts/test-installer-smoke.ps1 -InstallDir "C:\Path\To\Aura Work"

5. Confirm that each local service returns HTTP 200 from its `/health` endpoint.
6. Record missing runtime dependencies or startup failures in the related GitHub issue.

## Expected local health endpoints

| Service | Port |
|---|---:|
| agent | 47821 |
| vm-helper | 47822 |
| browser-helper | 47823 |
| plugins-helper | 47824 |
| cloud-sync | 47825 |
| bridge | 47826 |
| computer-use | 47828 |

## Notes

This smoke test does not replace CI. It verifies the installed runtime from outside the developer workspace.
