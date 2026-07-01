# Aura Work — Marketplace Guide

Complete guide for creating and publishing marketplace extensions.

## Overview

The Aura Marketplace hosts three types of extensions:

1. **Skills** — AI agent capabilities and workflows
2. **MCP Connectors** — Model Context Protocol integrations
3. **Plugins** — Native Aura plugins

---

## Creating a Skill

### 1. Create the skill file

```json
{
  "id": "skill.my-skill",
  "type": "skill",
  "name": "My Skill",
  "version": "1.0.0",
  "summary": "Short description of what the skill does.",
  "description": "Longer description with more details about the skill's capabilities.",
  "publisher": {
    "name": "Your Name",
    "github": "your-github-username",
    "verified": false
  },
  "icon": "my-skill/icon.svg",
  "cover": "my-skill/cover.svg",
  "categories": ["Category1", "Category2"],
  "tags": ["tag1", "tag2", "tag3"],
  "risk": "low",
  "auth": {
    "type": "none"
  },
  "install": {
    "kind": "skill",
    "prompt": "You are My Skill. [Detailed instructions for the AI agent]"
  },
  "permissions": ["read_file", "write_file"],
  "setup": [
    "Step 1: Install the skill from Aura Marketplace.",
    "Step 2: Configure the skill settings.",
    "Step 3: Start using the skill in your tasks."
  ],
  "tools": [
    {
      "name": "my_tool",
      "description": "Description of what this tool does."
    }
  ],
  "homepage": "https://github.com/yourusername/my-skill",
  "license": "MIT",
  "repository": "https://github.com/yourusername/my-skill",
  "localized": {
    "ar": {
      "name": "مهارتي",
      "summary": "وصف مختصر لما تفعله المهارة.",
      "description": "وصف أطول مع مزيد من التفاصيل حول قدرات المهارة.",
      "setup": [
        "الخطوة 1: ثبّت المهارة من متجر Aura.",
        "الخطوة 2: Configure إعدادات المهارة.",
        "الخطوة 3: ابدأ باستخدام المهارة في مهامك."
      ],
      "tools": [
        {
          "name": "أداتي",
          "description": "وصف ما تفعله هذه الأداة."
        }
      ],
      "categories": ["فئة1", "فئة2"]
    }
  }
}
```

### 2. Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (format: `skill.name`) |
| `type` | string | Must be `"skill"` |
| `name` | string | Display name |
| `version` | string | Semantic version |
| `summary` | string | Short description (under 100 chars) |
| `description` | string | Full description |
| `publisher` | object | Publisher info with `name` and `github` |
| `categories` | string[] | Categories (1-5) |
| `tags` | string[] | Tags for search (3-10) |
| `risk` | string | Risk level: `low`, `medium`, `high` |
| `install` | object | Installation config with `kind` and `prompt` |
| `localized.ar` | object | Arabic localization (required) |

### 3. Categories

Available categories:
- Documents, Spreadsheets, Presentations, PDF
- Research, Data, Design, Automation
- Database, Browser, Image, Forms
- File Converter, Security, Quality, Web
- Git, DevOps, Infrastructure, Communication
- Knowledge, Integration, Backend, Education
- Mobile, Testing, API, Translation
- Finance, Legal, Career, Marketing

---

## Creating an MCP Connector

### 1. Create the connector file

```json
{
  "id": "mcp.my-service",
  "type": "mcp",
  "name": "My Service MCP",
  "version": "1.0.0",
  "summary": "Interact with My Service API.",
  "description": "MCP connector for My Service. Enables [specific capabilities].",
  "publisher": {
    "name": "Your Name",
    "github": "your-github-username",
    "verified": false
  },
  "icon": "mcp-my-service/icon.svg",
  "cover": "mcp-my-service/cover.svg",
  "categories": ["Integration", "Productivity"],
  "tags": ["my-service", "api", "integration"],
  "risk": "medium",
  "auth": {
    "type": "token",
    "description": "My Service API Key"
  },
  "install": {
    "kind": "mcp",
    "command": ["npx", "-y", "@aura-os/mcp-my-service"]
  },
  "permissions": ["network"],
  "setup": [
    "Create a My Service API key.",
    "Copy the key to Aura vault.",
    "Configure the connector settings."
  ],
  "tools": [
    {
      "name": "list_items",
      "description": "List items from My Service."
    },
    {
      "name": "create_item",
      "description": "Create a new item in My Service."
    }
  ],
  "homepage": "https://github.com/yourusername/mcp-my-service",
  "license": "MIT",
  "repository": "https://github.com/yourusername/mcp-my-service",
  "localized": {
    "ar": {
      "name": "My Service MCP",
      "summary": "التفاعل مع My Service API.",
      "description": "موصل MCP لـ My Service. يتيح [القدرات المحددة].",
      "setup": [
        "أنشئ مفتاح My Service API.",
        "انسخ المفتاح إلى خزنة Aura.",
        "Configure إعدادات الموصل."
      ],
      "tools": [
        {
          "name": "قائمة العناصر",
          "description": "عرض العناصر من My Service."
        },
        {
          "name": "إنشاء عنصر",
          "description": "إنشاء عنصر جديد في My Service."
        }
      ],
      "categories": ["تكامل", "إنتاجية"]
    }
  }
}
```

---

## Validation

Before submitting, validate your extension:

```bash
node scripts/validate-marketplace.mjs
```

### Common Validation Errors

1. **Missing required field** — Add the missing field
2. **Invalid ID format** — Use lowercase alphanumeric with dots/hyphens
3. **Missing Arabic localization** — Add `localized.ar` object
4. **Invalid type** — Must be `skill`, `mcp`, or `plugin`
5. **Invalid risk** — Must be `low`, `medium`, or `high`

---

## Submission Process

1. Fork the repository
2. Add your extension to `registry/marketplace.json`
3. Add icon and cover images to `registry/assets/`
4. Run validation: `node scripts/validate-marketplace.mjs`
5. Create a pull request
6. Wait for maintainer review

### PR Template

```markdown
## New Marketplace Extension

**Name:** My Extension
**Type:** skill / mcp / plugin
**Description:** Brief description

### Checklist
- [ ] Added to marketplace.json
- [ ] Added Arabic localization
- [ ] Added icon and cover images
- [ ] Validation passes
- [ ] Tested locally
```

---

## Best Practices

### For Skills

- Write clear, detailed prompts
- Include error handling instructions
- Define clear tool schemas
- Add setup instructions

### For MCP Connectors

- Handle authentication securely
- Implement rate limiting
- Provide clear error messages
- Document all tools

### For All Extensions

- Use semantic versioning
- Keep descriptions concise
- Add relevant tags
- Include Arabic localization
- Provide setup instructions

---

## Resources

- [Marketplace Registry](../registry/README.md)
- [Submission Guide](./marketplace-submission.md)
- [Schema Reference](../registry/schema/marketplace-item.schema.json)
- [Example Extensions](../registry/examples/)
