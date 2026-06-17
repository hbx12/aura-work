import { isFileTask, stripCodeFences } from "./extract-writes.js";
import {
  BLOCKED_INVALID_STRUCTURE,
  parseModelResponse,
  toolCallHasPlaceholderContent,
  type ParsedModelResponse,
} from "./model-response.js";

export interface CoerceContext {
  prompt: string;
  messages: { role: string; content: string; agentRole?: string }[];
  iteration: number;
  planLength: number;
}

const FILE_WRITE_TOOL_NAMES = ["write_file", "replace_in_file", "delete_" + "file"];

function wroteFilesYet(messages: CoerceContext["messages"]): boolean {
  return messages.some(
    (m) => m.role === "tool" && /\b(Wrote|Edited|Changed)\s+[\w./-]+/i.test(m.content),
  );
}

function blocked(content: string) {
  return {
    type: "blocked" as const,
    role: "coordinator",
    content,
    summary: content,
    complete: false,
  };
}

function fromParsed(parsed: ParsedModelResponse, ctx: CoerceContext) {
  const fileTask = isFileTask(ctx.prompt);

  if (parsed.type === "tool_calls") {
    if (toolCallHasPlaceholderContent(parsed.toolCalls)) {
      return blocked(
        "The model attempted to write placeholder or empty file content. Aura Work refused the write.",
      );
    }
    if (fileTask && !parsed.toolCalls.some((c) => FILE_WRITE_TOOL_NAMES.includes(c.name))) {
      return blocked(
        "File tasks require a valid file-change tool call. Aura Work did not create guessed files from chat text.",
      );
    }
    return {
      type: "tool_calls" as const,
      role: parsed.role ?? "coder",
      toolCalls: parsed.toolCalls,
      complete: false,
    };
  }

  if (parsed.type === "clarification") {
    return {
      type: "message" as const,
      role: parsed.role ?? "coordinator",
      content: JSON.stringify(parsed),
      complete: false,
    };
  }

  if (parsed.type === "blocked") {
    const body = parsed.content ?? parsed.summary ?? "Task blocked by the model.";
    return blocked(stripCodeFences(body) || body);
  }

  if (parsed.type === "complete") {
    if (fileTask && !wroteFilesYet(ctx.messages)) {
      return blocked(
        "The model reported completion without producing a valid file write. No placeholder file was created. Retry with a model that supports structured tool calls or provide a narrower request.",
      );
    }
    const body = parsed.content ?? parsed.summary ?? "Task complete.";
    const summary = stripCodeFences(body) || "Task complete.";
    return {
      type: "complete" as const,
      role: parsed.role ?? "reviewer",
      content: summary,
      summary,
      complete: true,
    };
  }

  const clean = stripCodeFences(parsed.content);
  const content = clean || parsed.content;
  return {
    type: "message" as const,
    role: parsed.role ?? "coordinator",
    content,
    complete: ctx.iteration >= ctx.planLength && wroteFilesYet(ctx.messages),
    summary: ctx.iteration >= ctx.planLength ? content : undefined,
  };
}

export function coerceAgentResponse(text: string, ctx: CoerceContext) {
  const parsed = parseModelResponse(text);
  if (parsed.ok) {
    return fromParsed(parsed.data, ctx);
  }

  const fileTask = isFileTask(ctx.prompt);
  if (fileTask && !wroteFilesYet(ctx.messages)) {
    if (parsed.reason === "plain_text" || parsed.reason === "invalid_json" || parsed.reason === "schema") {
      return blocked(BLOCKED_INVALID_STRUCTURE.content);
    }
  }

  if (parsed.reason === "plain_text" && text.trim()) {
    const clean = stripCodeFences(text);
    if (clean) {
      return {
        type: "message" as const,
        role: "coordinator",
        content: clean,
        complete: false,
      };
    }
  }

  return null;
}
