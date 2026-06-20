# Aura Marketplace Registry

This folder is the public place for Aura Marketplace submissions.

If you want to add something to Aura Marketplace, start here:

- `skills/` for prompt-based skills.
- `mcp/` for Model Context Protocol connectors.
- `plugins/` for Aura plugin manifests.
- `assets/` for icons and cover images.
- `marketplace.json` for the aggregated registry consumed by the app.

## Supported contribution types

### Skills

Skills are the easiest contribution type. They are usually written as JSON metadata plus a prompt.

Recommended languages/formats:

- JSON for the manifest.
- Markdown for long instructions or documentation.
- Plain text prompts for agent behavior.

### MCP Connectors

MCP connectors expose tools from services or local programs to Aura Work.

Common implementation languages:

- TypeScript / JavaScript for Node-based MCP servers.
- Python for scripts, automation, and data tools.
- Go or Rust for fast native servers.
- Docker when the server needs an isolated runtime.

### Aura Plugins

Plugins are stronger than skills and may run local code. They must be reviewed carefully.

Common implementation languages:

- TypeScript / JavaScript for desktop helper tools.
- Python for local automation.
- Rust or Go for native tools.
- Any language that can expose a safe command interface, as long as the manifest is clear.

## Required files

A normal submission should include:

```txt
registry/<type>/<item-id>.json
registry/assets/<item-id>/icon.svg
registry/assets/<item-id>/cover.svg
```

Then add the same item to `registry/marketplace.json`.

## Publisher

Official HBX-maintained marketplace items use:

```json
{
  "publisher": {
    "name": "HBX",
    "github": "hbx12",
    "verified": true
  }
}
```

Community submissions should use the real author name and GitHub username, with `verified` set to `false` unless a maintainer approves it.

## Review flow

1. Open a Marketplace Submission issue.
2. Add your manifest and assets.
3. Update `registry/marketplace.json`.
4. Run validation:

```bash
node scripts/validate-marketplace-manifests.js
```

5. Open a pull request.
6. A maintainer reviews, approves, requests changes, or rejects it.

No community item is published until the pull request is approved and merged.

For the full guide, see `docs/marketplace-submission.md`.
