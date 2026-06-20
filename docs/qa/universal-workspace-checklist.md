# Universal Workspace QA Checklist

## Approval Continuation

- Create a task that writes a file.
- Approve the plan.
- Confirm execution continues to the pending edit.
- Approve the edit.
- Confirm execution resumes and completes.
- Create a task requiring browser, shell, plugin, MCP, or database permission.
- Approve the permission.
- Confirm the task resumes without repeating the same approval.

## Intent Routing

- `اعمل لي جدول مصاريف شهرية` routes to spreadsheet.
- `اعمل لي ملف نص رسمي` routes to document.
- `سو لي عرض عن الذكاء الاصطناعي` routes to presentation.
- `لخص هذا PDF` routes to PDF.
- `حلل هذا CSV` routes to data analysis.
- `سو لي بانر` routes to image/design.
- `ابحث وقارن` routes to research.
- `حلل قاعدة البيانات` routes to database.
- `عب النموذج في الموقع` routes to browser/computer.
- `ذكرني بكرة` routes to automation.

## Marketplace

- English UI shows English marketplace metadata.
- Arabic UI shows Arabic metadata.
- Search finds English and Arabic words.
- Category filters display localized categories in Arabic.
- Official HBX entries show real icon and cover SVG assets.
- Installing a skill from Arabic UI uses a stable plugin id and does not fail because of Arabic display text.
- `node scripts/validate-marketplace-manifests.js` passes.

## Artifact Honesty

- The agent creates actual files for substantial artifacts.
- It verifies files before saying the work is complete.
- It states fallback format limitations when native DOCX/XLSX/PPTX/PDF/image export is not available.
- It does not claim external actions, database writes, publishing, or sending occurred without approval.
