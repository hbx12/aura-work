# Aura Marketplace Submission Guide

This guide describes how to format, locally test, and submit your own **Skills**, **MCP Connectors**, or **Plugins** to the Aura Marketplace.

Community submissions are **not published automatically**. Every submission must go through a GitHub issue or pull request, pass validation, and be approved by a maintainer before it appears in Aura Marketplace.

---

## 1. Directory Structure

Registry files are stored in the root `registry/` directory:

```txt
registry/
├── marketplace.json                    # Aggregated marketplace registry consumed by the app
├── schema/
│   └── marketplace-item.schema.json     # Validation schema
├── skills/
│   └── <item_name>.json                 # Skill manifests
├── mcp/
│   └── <item_name>.json                 # MCP manifests
├── plugins/
│   └── <item_name>.json                 # Plugin manifests
└── assets/
    └── <item_name>/
        ├── icon.svg                     # Card icon
        └── cover.svg                    # Marketplace cover
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

---

## 3. Security Constraints

- **No hardcoded secrets**: Never commit API keys, passwords, personal access tokens, database passwords, or private keys.
- **Vault binding**: Secret fields must use `auth.fields` with `"secret": true`. Aura Work prompts the user during installation and stores the credential in the desktop Vault.
- **Safe commands only**: Commands with `rm -rf`, `sudo`, `curl | sh`, hidden downloads, or path traversal will fail CI validation.
- **Declare permissions**: MCP connectors and plugins must clearly declare the permissions they require.
- **Declare risk**: Use `low`, `medium`, or `high`. If your item can write files, run commands, access Docker, or query a database, mark it appropriately.
- **Assets are local**: `icon` and `cover` paths must point to files under `registry/assets/`. Absolute paths and `..` are rejected.

---

## 4. Creating Assets

Provide vector graphics (`.svg`) for icons and covers to maintain a crisp look on high-resolution screens:

- `icon.svg`: Clean logo/symbol centered in a square viewport.
- `cover.svg`: Minimal gradient or pattern suitable for a marketplace card cover.

Do not use copyrighted logos unless you have the right to include them.

---

## 5. Local Testing

To test your submission locally before submitting a PR:

1. Place your manifest file under `registry/skills/`, `registry/mcp/`, or `registry/plugins/`.
2. Add your assets under `registry/assets/<your-folder-name>/`.
3. Add the same manifest entry to `registry/marketplace.json` so the app can display it immediately.
4. Run the local manifest validator script:
   ```bash
   node scripts/validate-marketplace-manifests.js
   ```
5. Start the application locally:
   ```bash
   npm run dev
   ```
6. Open **Plugins → Marketplace**, look for your card, click **Details**, and verify setup, permissions, and install flow.

---

## 6. Submission and Approval Process

1. **Open a Marketplace Submission issue** using the repository issue template.
2. **Create a branch** named `feature/add-marketplace-<item-id>`.
3. **Add your manifest and assets** to the correct `registry/` folder.
4. **Update `registry/marketplace.json`** with the new manifest entry.
5. **Run validation locally**:
   ```bash
   node scripts/validate-marketplace-manifests.js
   ```
6. **Open a Pull Request** to `main`.
7. **Wait for CI validation**. The GitHub Action checks schema, assets, dangerous commands, required metadata, and aggregate registry consistency.
8. **Maintainer review**:
   - Approved → the PR is merged and the item becomes published.
   - Changes requested → update the PR and request another review.
   - Rejected → the item is not published.

No community item appears in Aura Marketplace until a maintainer approves and merges the PR.

---

## 7. Review Checklist for Maintainers

- The item has a clear user benefit.
- The manifest is complete and passes validation.
- The publisher is identified.
- Permissions match the stated behavior.
- Risk level is accurate.
- No secrets or credentials are committed.
- MCP commands are understandable and not hidden.
- Plugins do not include suspicious install or runtime behavior.
- Assets are clean, local, and appropriate for the Marketplace UI.
