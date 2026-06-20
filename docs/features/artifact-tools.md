# Artifact Tools

Aura Work's artifact model is tool-backed and honest about current capabilities.

## Implemented Paths

- `read_file`, `search_files`, and Git inspection for input discovery.
- `write_file` through pending edit approval for generated artifacts.
- Browser, VM, plugin, and MCP calls through existing permission gates.
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
| Database | Read-first SQL plans and exports; writes require approval |

Do not claim native Office/PDF/image export succeeded unless a real tool created and verified the file.
