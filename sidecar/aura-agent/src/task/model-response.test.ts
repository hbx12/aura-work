import { describe, expect, it } from "vitest";
import { coerceAgentResponse } from "./coerce-response.js";
import { extractFileWritesFromResponse, isFileTask } from "./extract-writes.js";
import {
  BLOCKED_INVALID_STRUCTURE,
  parseModelResponse,
  toolCallHasPlaceholderContent,
} from "./model-response.js";

const baseCtx = {
  prompt: "create a new index.ts file with hello world",
  messages: [] as { role: string; content: string }[],
  iteration: 0,
  planLength: 4,
};

describe("parseModelResponse", () => {
  it("accepts valid tool_calls JSON", () => {
    const result = parseModelResponse(
      JSON.stringify({
        type: "tool_calls",
        role: "coder",
        toolCalls: [{ id: "1", name: "write_file", arguments: { path: "index.ts", content: "export {};" } }],
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects incomplete JSON", () => {
    expect(parseModelResponse('{"type":"tool_calls"').ok).toBe(false);
  });

  it("rejects plain text", () => {
    expect(parseModelResponse("just some prose").ok).toBe(false);
  });

  it("rejects schema violations", () => {
    expect(parseModelResponse(JSON.stringify({ type: "tool_calls", toolCalls: [] })).ok).toBe(false);
  });

  it("accepts valid clarification JSON", () => {
    const result = parseModelResponse(
      JSON.stringify({
        type: "clarification",
        content: "Need choices",
        questions: [
          {
            id: "choice1",
            question: "Which style?",
            options: [
              { label: "Classic", value: "classic", recommended: true },
              { label: "Modern", value: "modern" }
            ],
            allowCustom: true
          }
        ]
      })
    );
    expect(result.ok).toBe(true);
  });

  it("rejects invalid clarification schema", () => {
    const result = parseModelResponse(
      JSON.stringify({
        type: "clarification",
        content: "Need choices",
        questions: [] // empty is invalid
      })
    );
    expect(result.ok).toBe(false);
  });
});

describe("coerceAgentResponse", () => {
  it("returns tool calls for valid write_file", () => {
    const out = coerceAgentResponse(
      JSON.stringify({
        type: "tool_calls",
        toolCalls: [{ id: "1", name: "write_file", arguments: { path: "a.ts", content: "console.log(1)" } }],
      }),
      baseCtx,
    );
    expect(out?.type).toBe("tool_calls");
  });

  it("blocks file task without write_file", () => {
    const out = coerceAgentResponse(
      JSON.stringify({
        type: "tool_calls",
        toolCalls: [{ id: "1", name: "read_file", arguments: { path: "a.ts" } }],
      }),
      baseCtx,
    );
    expect(out?.type).toBe("blocked");
  });

  it("blocks plain text for file tasks", () => {
    const out = coerceAgentResponse("Here is the code you asked for...", baseCtx);
    expect(out?.type).toBe("blocked");
    expect(out && "content" in out ? out.content : "").toContain(BLOCKED_INVALID_STRUCTURE.content);
  });

  it("blocks completion without prior writes", () => {
    const out = coerceAgentResponse(
      JSON.stringify({ type: "complete", content: "done" }),
      baseCtx,
    );
    expect(out?.type).toBe("blocked");
  });

  it("blocks placeholder write content", () => {
    expect(
      toolCallHasPlaceholderContent([
        { name: "write_file", arguments: { path: "x.ts", content: "// Created for: demo" } },
      ]),
    ).toBe(true);
  });
});

describe("extractFileWritesFromResponse", () => {
  it("does not guess paths from bare code fences", () => {
    const writes = extractFileWritesFromResponse("```typescript\nconsole.log(1)\n```", "create index.ts");
    expect(writes).toHaveLength(0);
  });

  it("keeps explicit header paths only", () => {
    const writes = extractFileWritesFromResponse("```src/app.ts\nexport {}\n```", "create app");
    expect(writes).toEqual([{ path: "src/app.ts", content: "export {}" }]);
  });
});

describe("isFileTask", () => {
  it("does not treat Arabic identity questions as file tasks", () => {
    expect(isFileTask("وش تسوي؟")).toBe(false);
    expect(
      isFileTask(
        "Workspace chat request: من انت و وش تسوي؟\n\nYou are running inside Aura Work.",
      ),
    ).toBe(false);
  });

  it("detects explicit Arabic and English file work", () => {
    expect(isFileTask("سوي ملف README.md مرتب")).toBe(true);
    expect(isFileTask("fix the login bug in the app")).toBe(true);
    expect(isFileTask("create a new index.ts file")).toBe(true);
  });
});
