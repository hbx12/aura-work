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
    if (call.name !== "write_file") continue;
    const content = call.arguments.content;
    if (typeof content !== "string") return true;
    if (!content.trim()) return true;
    if (PLACEHOLDER_CONTENT.test(content)) return true;
  }
  return false;
}

export const BLOCKED_INVALID_STRUCTURE = {
  type: "blocked" as const,
  role: "coordinator",
  content:
    "The model did not return a valid structured action. Aura Work refused to create placeholder files or guess edits.",
};
