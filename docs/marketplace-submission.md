# Aura Marketplace Submission Guide

This guide describes how to format, locally test, and submit your own **Skills**, **MCP Connectors**, or **Plugins** to the Aura Marketplace.

---

## 1. Directory Structure

Registry files are stored in the root `registry/` directory:

```
registry/
├── schema/
│   └── marketplace-item.schema.json   # Validation Schema
├── skills/
│   └── <item_name>.json               # Skill manifests
├── mcp/
│   └── <item_name>.json               # MCP manifests
├── plugins/
│   └── <item_name>.json               # Plugin manifests
└── assets/
    └── <item_name>/
        ├── icon.svg                   # 48x48 icon
        └── cover.svg                  # 600x200 cover
```

---

## 2. Manifest Structure

Every marketplace item must have a manifest JSON file. Below is an example of an MCP Connector manifest with secure vault bindings:

```json
{
  "id": "mcp.my-custom-service",
  "type": "mcp",
  "name": "Custom Service MCP",
  "version": "1.0.0",
  "summary": "Connects the agent to My Custom Service.",
  "description": "Allows the agent to view resources, execute tasks, and trigger actions in Custom Service.",
  "publisher": {
    "name": "Your Name",
    "github": "your-github-username",
    "verified": false
  },
  "icon": "my-custom-service/icon.svg",
  "cover": "my-custom-service/cover.svg",
  "categories": ["Developer Tools"],
  "tags": ["service", "mcp", "integration"],
  "risk": "medium",
  "auth": {
    "type": "pat",
    "fields": [
      {
        "name": "MY_SERVICE_API_KEY",
        "label": "My Service API Key",
        "secret": true,
        "required": true
      }
    ]
  },
  "install": {
    "kind": "mcp",
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "mcp-server-my-service"]
  },
  "permissions": ["network"],
  "setup": [
    "Obtain an API key from My Service developer dashboard.",
    "Paste the API key into the secure configuration form."
  ],
  "tools": [
    {
      "name": "get_resources",
      "description": "Retrieves list of assets."
    }
  ]
}
```

### Security Constraints:
- **No hardcoded secrets**: Never commit API keys, passwords, or personal access tokens in the manifest.
- **Vault Binding**: Secure credentials must be marked with `"secret": true` in the `auth.fields`. Aura Work automatically intercepts these fields, prompts the user during installation, and stores them in the **secure desktop Vault**. They are injected dynamically at runtime.
- **Safe Commands**: Disallowed keywords such as `rm -rf`, `sudo`, `curl | sh`, and path traversals (`..`) will cause CI validation to fail.

---

## 3. Creating Assets

Provide vector graphics (`.svg`) for icons and covers to maintain a crisp look on high-resolution screens:
- **icon.svg**: Clean logo/symbol centered on a 48x48 viewport.
- **cover.svg**: Minimal gradient or pattern covering a 600x200 viewport.

---

## 4. Local Testing

To test your submission locally before submitting a PR:

1. Place your manifest file under `registry/skills/`, `registry/mcp/`, or `registry/plugins/`.
2. Add your assets under `registry/assets/<your-folder-name>/`.
3. Run the local manifest validator script to ensure everything complies with the security checks:
   ```bash
   node scripts/validate-marketplace-manifests.js
   ```
4. Start the application locally:
   ```bash
   npm run dev
   ```
5. Open the **Marketplace** tab in the side navigation, look for your card, click **Details** to review the setup/permissions tabs, and verify the installation flow.

---

## 5. Submission Process

1. **Submit an Issue**: Open a **Marketplace Submission** issue on the GitHub repository. Provide the manifest JSON and the reasoning for permissions.
2. **Submit a Pull Request**:
   - Create a branch named `feature/add-marketplace-<item-id>`.
   - Add your JSON and assets to the workspace.
   - Run the aggregated registry generator to update `registry/marketplace.json`:
     ```bash
     node scratch/generate_registry.js
     ```
   - Ensure `npm test` and local validation scripts are fully green.
   - Submit the PR. The GitHub action validation workflow will automatically inspect the schema and flag any dangerous command structures.
