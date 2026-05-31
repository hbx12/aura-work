/**
 * Task coordinator — plan generation and agent loop iterations (Phase 3)
 */

import type { ProviderCredentials } from "../types.js";
import { getAdapter } from "../providers/index.js";
import type { ProviderId } from "@aura-os/shared";
import {
  briefWriteStatus,
  extractFileWritesFromResponse,
  isFileTask,
  stripCodeFences,
} from "./extract-writes.js";

export interface PlanStep {
  title: string;
  subtitle?: string;
  role?: string;
}

export interface TaskPlanRequest {
  prompt: string;
  projectId: string;
  providerId: string;
  modelId: string;
  credentials: ProviderCredentials;
}

export interface TaskIterateRequest {
  prompt: string;
  plan: PlanStep[];
  steps: unknown[];
  messages: { role: string; content: string; agentRole?: string }[];
  iteration: number;
  projectId: string;
  taskId?: string;
  providerId: string;
  modelId: string;
  credentials: ProviderCredentials;
  onChunk?: (text: string) => void;
}

const SUBAGENT_ROLES = [
  "coordinator",
  "research",
  "coder",
  "reviewer",
  "security",
  "data",
  "document",
  "browser",
  "computer",
] as const;

const TOOLS_PROMPT = `You are the Aura Work autonomous agent with file-system access. Perform the requested work instead of pasting large code blocks in chat.

CRITICAL RULES:
- NEVER paste full file contents or large code blocks in chat messages.
- To create or edit files you MUST respond with JSON tool_calls using write_file.
- Chat messages must be short status updates (1-2 sentences): what you're doing next, not the code itself.
- After writing files, briefly confirm what was created.
- NEVER invent placeholder file contents. If you cannot produce the requested file safely, return a blocked message with a clear reason.

Available tools (JSON only for tool calls):
- read_file { "path": "relative/path" }
- write_file { "path": "relative/path", "content": "full file content" }
- search_files { "query": "search text" }
- git_status {}
- git_diff { "path": "optional relative path" }
- run_shell { "command": "shell command to run in isolated workspace" }
- browse_url { "url": "https://example.com", "extract": "text|links|title" (optional) }
- computer_list_windows {}
- computer_screenshot { "windowId": "optional", "processName": "optional", "title": "optional" }
- computer_click { "x": 100, "y": 200, "processName": "AppName", "title": "Window title" }
- computer_type { "text": "hello", "processName": "AppName", "title": "Window title" }
- computer_focus { "windowId": "123", "processName": "AppName", "title": "Window title" }
- plugin_tool { "pluginId": "com.example.plugin", "toolId": "tool.id", "arguments": {} (optional) }
- mcp_tool { "serverId": "mcp-server-uuid", "toolName": "tool_name", "arguments": {} (optional) }

When summarizing web content, you MUST cite sources using the [Source: ...] line returned by browse_url.
Plugin and MCP tool calls require user approval — use them when installed plugins or MCP servers provide needed capabilities.
Computer use is experimental, disabled by default, and requires explicit desktop approval when enabled.

When you need a tool, respond with JSON:
{"type":"tool_calls","role":"coder","toolCalls":[{"id":"1","name":"read_file","arguments":{"path":"README.md"}}]}

For tasks that create or modify files, ALWAYS use write_file with the full file content — do not only describe changes in text.
Use search_files and read_file first when you need project context. Use run_shell for builds/tests. Use browse_url, plugin_tool, mcp_tool, and computer_* tools only when the task requires them.

When the task is complete, respond with:
{"type":"complete","role":"reviewer","content":"summary for user","summary":"what was done"}

When blocked, respond with:
{"type":"blocked","role":"coordinator","content":"clear reason and required next action"}

Otherwise respond with:
{"type":"message","role":"coordinator","content":"short status — no code blocks"}`;

function wroteFilesYet(messages: TaskIterateRequest["messages"]): boolean {
  return messages.some(
    (m) => m.role === "tool" && /\bWrote\s+[\w./-]+/i.test(m.content),
  );
}

function toolCallsFromWrites(
  writes: { path: string; content: string }[],
  role = "coder",
) {
  return {
    type: "tool_calls" as const,
    role,
    content: briefWriteStatus(writes.map((w) => w.path)),
    toolCalls: writes.map((w, i) => ({
      id: String(i + 1),
      name: "write_file",
      arguments: { path: w.path, content: w.content },
    })),
    complete: false,
  };
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

function coerceResponse(
  text: string,
  prompt: string,
  messages: TaskIterateRequest["messages"],
  parsed: {
    type?: string;
    role?: string;
    content?: string;
    summary?: string;
    toolCalls?: { id: string; name: string; arguments: Record<string, unknown> }[];
    complete?: boolean;
  } | null,
  iteration: number,
  planLength: number,
) {
  const body = parsed?.content ?? parsed?.summary ?? text;
  const writes = extractFileWritesFromResponse(text, prompt);
  const fileTask = isFileTask(prompt);

  if (writes.length > 0) {
    return toolCallsFromWrites(writes, parsed?.role ?? "coder");
  }

  if (parsed?.type === "tool_calls" && parsed.toolCalls?.length) {
    return {
      type: "tool_calls" as const,
      role: parsed.role ?? "coder",
      toolCalls: parsed.toolCalls,
      complete: false,
    };
  }

  if (parsed?.type === "blocked") {
    return blocked(stripCodeFences(body).slice(0, 800) || "Task blocked by the model.");
  }

  if (parsed?.type === "complete" || parsed?.complete) {
    if (fileTask && !wroteFilesYet(messages)) {
      return blocked("The model reported completion without producing a valid file write. No placeholder file was created. Retry with a model that supports structured tool calls or provide a narrower request.");
    }
    const summary = stripCodeFences(body).slice(0, 800) || "Task complete.";
    return {
      type: "complete" as const,
      role: parsed?.role ?? "reviewer",
      content: summary,
      summary,
      complete: true,
    };
  }

  if (parsed?.type === "message" && parsed.content) {
    const clean = stripCodeFences(parsed.content);
    return {
      type: "message" as const,
      role: parsed.role ?? "coordinator",
      content: clean.slice(0, 600) || parsed.content.slice(0, 200),
      complete: iteration >= planLength && wroteFilesYet(messages),
      summary: iteration >= planLength ? clean.slice(0, 800) : undefined,
    };
  }

  if (text.trim() && !parsed) {
    const clean = stripCodeFences(text);
    if (fileTask && !wroteFilesYet(messages)) {
      return blocked("The model returned unstructured text for a file task. Aura Work refused to write guessed or placeholder content. Use a tool-capable model or retry with a narrower instruction.");
    }
    if (clean) {
      return {
        type: "message" as const,
        role: "coordinator",
        content: clean.slice(0, 600),
        complete: false,
      };
    }
  }

  return null;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
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

function fallbackPlan(prompt: string): { plan: PlanStep[]; coordinatorMessage: string } {
  const lower = prompt.toLowerCase();
  const plan: PlanStep[] = [
    {
      title: "Understand the request",
      subtitle: "Parse goal and project context",
      role: "coordinator",
    },
    {
      title: "Inspect relevant files",
      subtitle: "Read and search project files",
      role: "research",
    },
  ];
  if (lower.includes("edit") || lower.includes("fix") || lower.includes("implement") || lower.includes("code")) {
    plan.push({
      title: "Apply code changes",
      subtitle: "Propose edits with diff review",
      role: "coder",
    });
  }
  plan.push(
    {
      title: "Review changes",
      subtitle: "Verify correctness and regressions",
      role: "reviewer",
    },
    {
      title: "Summarize deliverables",
      subtitle: "Report files changed and next steps",
      role: "coordinator",
    },
  );
  return {
    plan,
    coordinatorMessage: `I've prepared a ${plan.length}-step plan for your task. Review and approve to begin.`,
  };
}

export async function generatePlan(req: TaskPlanRequest) {
  const adapter = getAdapter(req.providerId as ProviderId);
  const system = `You are the Aura Work Coordinator. Create a concise task plan as JSON:
{"plan":[{"title":"step","subtitle":"detail","role":"coordinator|research|coder|reviewer|security|data|document|browser"}],"coordinatorMessage":"brief message to user"}
Roles: ${SUBAGENT_ROLES.join(", ")}. Keep 3-6 steps.`;

  try {
    const result = await adapter.chat(
      {
        model: req.modelId,
        messages: [
          { role: "system", content: system },
          { role: "user", content: req.prompt },
        ],
      },
      req.credentials,
    );
    const parsed = extractJson(result.text) as {
      plan?: PlanStep[];
      coordinatorMessage?: string;
    } | null;
    if (parsed?.plan?.length) {
      return {
        plan: parsed.plan,
        coordinatorMessage:
          parsed.coordinatorMessage ??
          "Plan ready. Approve to start execution.",
      };
    }
  } catch (e) {
    console.warn("[task] plan LLM failed, using fallback:", e);
  }
  return fallbackPlan(req.prompt);
}

export async function iterateTask(req: TaskIterateRequest) {
  const adapter = getAdapter(req.providerId as ProviderId);
  const planText = req.plan.map((s, i) => `${i + 1}. [${s.role ?? "coordinator"}] ${s.title}`).join("\n");
  const history = req.messages
    .slice(-8)
    .map((m) => `${m.role}${m.agentRole ? ` (${m.agentRole})` : ""}: ${m.content.slice(0, 500)}`)
    .join("\n");

  const system = `You are Aura Work executing a task step-by-step.
${TOOLS_PROMPT}

Current iteration: ${req.iteration + 1}
Plan:
${planText}`;

  const userContent = `Task: ${req.prompt}

Recent context:
${history || "(none yet)"}

Execute the next logical step. Prefer tools for file operations.
If the user asks to create, edit, or scaffold code/files, call write_file in this iteration when you have enough context.`;

  try {
    const result = await adapter.chat(
      {
        model: req.modelId,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        onChunk: req.onChunk,
      },
      req.credentials,
    );

    const parsed = extractJson(result.text) as {
      type?: string;
      role?: string;
      content?: string;
      summary?: string;
      toolCalls?: { id: string; name: string; arguments: Record<string, unknown> }[];
      complete?: boolean;
    } | null;

    const coerced = coerceResponse(
      result.text,
      req.prompt,
      req.messages,
      parsed,
      req.iteration,
      req.plan.length,
    );
    if (coerced) return coerced;
  } catch (e) {
    console.warn("[task] iterate LLM failed:", e);
  }

  return blocked("Task execution stopped safely because the model did not return a valid structured action. Aura Work did not create placeholder files or guess edits. Retry with a tool-capable model or narrow the request.");
}
