import { BASE_PROMPT } from "./base.js";
import { PLANNER_PROMPT } from "./planner.js";
import { EXECUTOR_PROMPT } from "./executor.js";
import { REVIEWER_PROMPT } from "./reviewer.js";
import { QUALITY_PROMPT } from "./quality.js";
import { TOOLS_PROMPT as toolsPrompt } from "./tools.js";
import { CONTEXT_PROMPT as contextPrompt } from "./context.js";
import { SAFETY_PROMPT } from "./safety.js";
import { getProviderOverride } from "./provider-overrides.js";

export function getSystemPrompt(
  providerId: string,
  modelId: string,
  iteration: number,
  planText: string,
  responseLanguage?: string,
  projectRules?: string
): string {
  const providerOverride = getProviderOverride(providerId);
  const langRule = responseLanguage
    ? `\nResponse language: ${responseLanguage}. Reply in that language unless the user explicitly asks for another language.`
    : "\nReply in the same language as the user's latest message.";

  const rulesContext = projectRules
    ? `\nPROJECT LOCAL RULES:\n<project_rules>\n${projectRules}\n</project_rules>`
    : "";

  return `${BASE_PROMPT}
${QUALITY_PROMPT}
${toolsPrompt}
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
${QUALITY_PROMPT}
${SAFETY_PROMPT}
`;
}
