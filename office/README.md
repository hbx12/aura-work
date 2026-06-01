# Aura OS Office Add-ins (Phase 9)

Word, Excel, and PowerPoint task panes that delegate AI execution to the local Aura desktop via the secure bridge (`http://127.0.0.1:47826`).

## Sideload (development)

1. Start Aura desktop and `npm run bridge`
2. Serve `office/shared/` over HTTPS (Office requires HTTPS for task panes). Example with a local static server on port 3000.
3. Word/Excel/PPT → Insert → Add-ins → Upload My Add-in → select the manifest under `office/word`, `office/excel`, or `office/powerpoint`
4. Pair using a code from Aura desktop **Extensions** page

## Security

- Add-ins do **not** store API keys or call AI providers directly
- All model calls and permissions run in local Aura desktop
- Document changes require user confirmation before apply
