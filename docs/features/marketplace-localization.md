# Marketplace Localization

Marketplace entries support localized metadata through the `localized` field:

```json
{
  "localized": {
    "ar": {
      "name": "Aura للمستندات",
      "summary": "...",
      "description": "...",
      "setup": ["..."],
      "tools": [{ "name": "...", "description": "..." }],
      "categories": ["مستندات"]
    }
  }
}
```

## Behavior

- Arabic UI shows Arabic name, summary, description, setup, tools, and categories when present.
- Missing localized fields fall back to English.
- Search checks English and localized text.
- Category filters use localized categories in Arabic UI.
- Install actions use stable registry metadata, not localized display names, so Arabic names do not break plugin IDs.

## Official Universal Skills

The registry now ships official HBX workspace skills with real SVG icon and cover files under `registry/assets/<skill>/`:

- Aura Documents
- Aura Spreadsheets
- Aura Presentations
- Aura PDF
- Aura Research
- Aura Image Studio
- Aura Design Studio
- Aura Data Analyst
- Aura File Converter
- Aura Automation
- Aura Database Analyst
- Aura Browser Assistant
- Aura Business Kit
- Aura Study Kit
- Aura Forms
- Aura Dashboard Builder

Validate registry changes with:

```powershell
node scripts/validate-marketplace-manifests.js
```
