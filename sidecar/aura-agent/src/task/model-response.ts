import { z } from "zod";

const ToolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  arguments: z.record(z.unknown()),
});

const ToolCallsResponseSchema = z.object({
  type: z.literal("tool_calls"),
  role: z.string().optional(),
  content: z.string().optional(),
  toolCalls: z.array(ToolCallSchema).min(1),
  complete: z.boolean().optional(),
});

const CompleteResponseSchema = z.object({
  type: z.literal("complete"),
  role: z.string().optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  complete: z.boolean().optional(),
});

const BlockedResponseSchema = z.object({
  type: z.literal("blocked"),
  role: z.string().optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
});

const MessageResponseSchema = z.object({
  type: z.literal("message"),
  role: z.string().optional(),
  content: z.string().min(1),
  complete: z.boolean().optional(),
  summary: z.string().optional(),
});

const ClarificationQuestionOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  recommended: z.boolean().optional(),
  note: z.string().optional(),
});

const ClarificationQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  reason: z.string().optional(),
  options: z.array(ClarificationQuestionOptionSchema).min(1),
  allowCustom: z.boolean().optional(),
});

const ClarificationResponseSchema = z.object({
  type: z.literal("clarification"),
  role: z.string().optional(),
  content: z.string(),
  questions: z.array(ClarificationQuestionSchema).min(1),
  recommendedAction: z.object({
    label: z.string(),
    value: z.string(),
  }).optional(),
  complete: z.literal(false).optional(),
});

export const ModelResponseSchema = z.discriminatedUnion("type", [
  ToolCallsResponseSchema,
  CompleteResponseSchema,
  BlockedResponseSchema,
  MessageResponseSchema,
  ClarificationResponseSchema,
]);


export type ParsedModelResponse = z.infer<typeof ModelResponseSchema>;

export type ModelResponseParseResult =
  | { ok: true; data: ParsedModelResponse }
  | { ok: false; reason: "empty" | "invalid_json" | "schema" | "plain_text" };

const PLACEHOLDER_CONTENT =
  /\/\/\s*Created for:|\/\/\s*<prompt|placeholder file|TODO:\s*replace this/i;

const WRITE_LIKE_TOOL_NAMES = new Set([
  "write_file",
  "artifact_create",
  "artifact_update",
  "artifact_export",
  "document_create",
  "document_insert_paragraph",
  "document_insert_heading",
  "document_insert_table",
  "document_format_styles",
  "document_add_comment",
  "document_propose_edits",
  "spreadsheet_create_workbook",
  "spreadsheet_create_sheet",
  "spreadsheet_write_range",
  "spreadsheet_set_formula",
  "spreadsheet_create_table",
  "spreadsheet_create_pivot_table",
  "spreadsheet_create_chart",
  "spreadsheet_export_csv",
  "presentation_create_deck",
  "presentation_create_storyline",
  "presentation_add_slide",
  "presentation_edit_slide_text",
  "presentation_create_chart",
  "presentation_create_diagram",
  "presentation_create_timeline",
  "presentation_create_process_flow",
  "pdf_summarize",
  "pdf_annotate",
  "pdf_convert_to_markdown",
  "image_generate",
  "image_create_banner",
  "image_create_logo_concept",
  "image_create_icon",
  "image_export_svg",
  "design_create_html",
  "design_update_html",
  "research_plan",
  "research_create_report",
  "citation_insert",
  "data_clean",
  "data_transform",
  "data_join",
  "data_groupby",
  "data_chart",
  "data_export_csv",
  "data_export_report",
  "database_create_report",
  "database_safe_migration_plan",
  "automation_create_task",
  "automation_schedule",
  "automation_monitor_condition",
  "automation_run_workflow",
  "github_issue_create",
  "github_pr_review",
  "notion_create_page",
]);

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* fall through */
    }
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  return null;
}

export function parseModelResponse(text: string): ModelResponseParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  const json = extractJson(trimmed);
  if (json === null) {
    return { ok: false, reason: trimmed.startsWith("{") ? "invalid_json" : "plain_text" };
  }

  const parsed = ModelResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, reason: "schema" };
  }
  return { ok: true, data: parsed.data };
}

export function toolCallHasPlaceholderContent(
  toolCalls: { name: string; arguments: Record<string, unknown> }[],
): boolean {
  for (const call of toolCalls) {
    if (!WRITE_LIKE_TOOL_NAMES.has(call.name)) continue;
    const candidates = ["content", "markdown", "csv", "html", "svg", "json", "sql", "text", "body", "report"];
    const content = candidates
      .map((key) => call.arguments[key])
      .find((value) => typeof value === "string" && value.trim());
    if (content === undefined && !call.arguments.rows && !call.arguments.slides) return true;
    if (typeof content === "string" && PLACEHOLDER_CONTENT.test(content)) return true;
  }
  return false;
}

export const BLOCKED_INVALID_STRUCTURE = {
  type: "blocked" as const,
  role: "coordinator",
  content:
    "The model did not return a valid structured action. Aura Work refused to create placeholder files or guess edits.",
};
