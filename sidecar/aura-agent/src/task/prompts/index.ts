import { BASE_PROMPT } from "./base.js";
import { UNIVERSAL_WORKSPACE_PROMPT } from "./universal.js";
import { PLANNER_PROMPT } from "./planner.js";
import { EXECUTOR_PROMPT } from "./executor.js";
import { REVIEWER_PROMPT } from "./reviewer.js";
import { QUALITY_PROMPT } from "./quality.js";
import { WORKFLOW_PROMPT } from "./workflow.js";
import { TOOLS_PROMPT as toolsPrompt } from "./tools.js";
import { CONTEXT_PROMPT as contextPrompt } from "./context.js";
import { SAFETY_PROMPT } from "./safety.js";
import { getProviderOverride } from "./provider-overrides.js";

/** Escape XML special characters to prevent prompt injection via XML tag boundaries. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function getFilteredToolsPrompt(agentConfig?: any): string {
  if (!agentConfig || !agentConfig.tools) {
    return toolsPrompt;
  }
  const lines = toolsPrompt.split("\n");
  const filteredLines = lines.filter(line => {
    const match = line.trim().match(/^-\s*([a-zA-Z0-9_]+)/);
    if (match) {
      const toolName = match[1];
      if (toolName === "write_file" && agentConfig.tools.write === false) return false;
      if (toolName === "replace_in_file" && agentConfig.tools.edit === false) return false;
      if (toolName === "delete_file" && agentConfig.tools.edit === false) return false;
      if (toolName === "run_shell" && agentConfig.tools.bash === false) return false;
      if (agentConfig.tools[toolName] === false) return false;

      for (const [pattern, enabled] of Object.entries(agentConfig.tools)) {
        if (!enabled) {
          const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
          if (regex.test(toolName)) {
            return false;
          }
        }
      }
    }
    return true;
  });
  return filteredLines.join("\n");
}

export function getSystemPrompt(
  providerId: string,
  modelId: string,
  iteration: number,
  planText: string,
  responseLanguage?: string,
  projectRules?: string,
  agentConfig?: any
): string {
  const providerOverride = getProviderOverride(providerId);
  const langRule = responseLanguage
    ? `\nResponse language: ${responseLanguage}. Reply in that language unless the user explicitly asks for another language.`
    : "\nReply in the same language as the user's latest message.";

  const rulesContext = projectRules
    ? `\nPROJECT LOCAL RULES:\n<project_rules>\n${escapeXml(projectRules)}\n</project_rules>`
    : "";

  const activeToolsPrompt = getFilteredToolsPrompt(agentConfig);

  return `${BASE_PROMPT}
${UNIVERSAL_WORKSPACE_PROMPT}
${QUALITY_PROMPT}
${WORKFLOW_PROMPT}
${activeToolsPrompt}
${EXECUTOR_PROMPT}
${REVIEWER_PROMPT}
${SAFETY_PROMPT}
${contextPrompt}
${providerOverride}
${langRule}
${rulesContext}

Current iteration: ${iteration + 1}
Plan:
${planText}
`;
}

export function getPlannerSystemPrompt(): string {
  return `${PLANNER_PROMPT}
${UNIVERSAL_WORKSPACE_PROMPT}
${QUALITY_PROMPT}
${WORKFLOW_PROMPT}
${SAFETY_PROMPT}
`;
}
