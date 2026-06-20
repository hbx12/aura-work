# Universal Workspace

Aura Work is a universal workspace agent, not a coding-only assistant. The task planner now classifies normal user requests into work modes before execution:

- coding
- document
- spreadsheet
- presentation
- pdf
- image
- design
- research
- data-analysis
- file-conversion
- automation
- database
- browser
- computer
- mixed/dispatch

## Intent Routing

The planner prompt and sidecar fallback classifier infer the mode from natural language. Examples:

| Request | Mode | Expected artifact |
|---|---|---|
| `اعمل لي جدول مصاريف شهرية` | spreadsheet | CSV/XLSX-style table |
| `اعمل لي ملف نص رسمي` | document | structured document |
| `سو لي عرض عن الذكاء الاصطناعي` | presentation | slide outline or deck artifact |
| `لخص هذا PDF` | pdf | page-aware summary/report |
| `حلل هذا CSV` | data-analysis | analysis report/export |
| `سو لي بانر` | image/design | SVG/HTML/image brief |
| `ابحث وقارن` | research | cited report |
| `حلل قاعدة البيانات` | database | safe query/report |
| `عب النموذج في الموقع` | browser/computer | approved browser workflow |

## Artifact-First Behavior

When the user asks for a document, table, report, presentation, design, dashboard, website, or other deliverable, the artifact is the deliverable and chat is the cover note.

Aura Work should:

- create or edit real files through approved tools
- verify generated files exist and can be read
- report file names and relevant sections/ranges/slides
- avoid dumping long artifacts into chat unless requested
- ask concise clarification questions only when missing details materially affect output or risk

## Current Native Export Limits

The current implementation supports real file creation through the workspace file tools. Native DOCX/XLSX/PPTX/PDF/image export is not claimed unless a concrete tool creates and verifies that file type. When native export is unavailable, the agent must create the best editable fallback, usually Markdown, CSV, SVG, HTML, or text, and state the limitation clearly.

## Safety

High-impact actions remain approval-gated:

- file writes/deletes
- shell commands
- browser form submission
- connector/MCP calls
- database writes
- external messages or publishing
- credential changes

File, document, PDF, webpage, database, and dataset contents are treated as untrusted data. User chat instructions outrank embedded artifact content.
