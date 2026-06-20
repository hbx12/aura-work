# Artifact Tools

Aura Work's artifact model is tool-backed and honest about current capabilities.

## Implemented Paths

- `read_file`, `search_files`, and Git inspection for input discovery.
- `write_file` through pending edit approval for generated artifacts.
- Universal artifact aliases for document, spreadsheet, presentation, PDF, image/design, research, data, database, browser, and automation work. These aliases execute through the same approved file/browser/MCP/plugin paths instead of acting as prompt-only labels.
- Browser, VM, plugin, and MCP calls through existing permission gates.
- SQLite schema inspection and read-only query previews for local database artifacts.
- CSV profiling for spreadsheet/data verification, including basic row, column, and missing-cell checks.
- Marketplace skills that route work into document, spreadsheet, presentation, PDF, image/design, research, data, database, browser, automation, and dashboard workflows.
- Real registry SVG assets for official workspace skills.

## Expected Agent Behavior

For artifact work, the agent should:

1. Classify the work mode.
2. Clarify only if needed.
3. Inspect inputs.
4. Create or update a real file.
5. Verify the artifact by reading it back or checking metadata when possible.
6. Report the generated file and any limitations.

## Format Policy

| Target | Current safe behavior |
|---|---|
| Documents | Markdown/text now; DOCX only when a real exporter is available |
| Spreadsheets | CSV/Markdown tables now; XLSX only when a workbook tool is available |
| Presentations | Markdown/HTML slide outlines now; PPTX only when a deck exporter is available |
| PDF | Read/summarize/export plans through available tools; OCR uncertainty must be stated |
| Images/design | SVG/HTML/design briefs now; generated raster images only through explicit image tooling |
| Data | CSV/Markdown/report outputs through file tools |
| Database | SQLite schema inspection, read-only query previews, CSV/report outputs, and safe migration plans; writes require approval |

Do not claim native Office/PDF/image export succeeded unless a real tool created and verified the file.

## Universal Tool Execution

The task engine accepts the universal tool names listed in the sidecar tool prompt. File-producing tools require complete content and create a pending edit when approval is needed. Read/verify tools read the artifact back. Browser/web tools route to the browser helper. Connector actions such as email, calendar, Slack, GitHub, and Notion require an explicit MCP server or plugin tool payload.

If a native engine is not configured for DOCX, XLSX, PPTX, PDF binary edits, PNG export, or image background removal/upscaling, Aura Work returns a clear limitation instead of pretending the export happened.
