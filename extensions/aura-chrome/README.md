# Aura OS Chrome Extension (Phase 9)

Load unpacked in Chrome while Aura OS desktop is open:

1. `npm run bridge` (or start bridge from Aura **Extensions** page)
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select this folder
3. In Aura desktop → **Extensions** → generate pairing code
4. Click the Aura extension icon → enter code → **Pair**
5. Open any page → enter prompt → **Send to Aura**
6. Approve page read in Aura desktop when prompted

**Security:** Broad site permission is declared, but page content is read only after explicit per-task approval in Aura desktop. No API keys are stored in the extension.
