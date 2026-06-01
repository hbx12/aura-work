# Aura Linux Workspace Image

Versioned, reproducible Linux workspace image for Aura OS VM execution (PRD §2.6).

Phase 4 ships the helper architecture and build manifest. The full bundled image is integrated in packaging milestones (Phase 11).

Build (placeholder):

```bash
./build.sh
```

The helper falls back to WSL (Windows) or process-sandbox when a hypervisor image is unavailable.
