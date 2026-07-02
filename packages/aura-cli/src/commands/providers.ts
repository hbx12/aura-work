import chalk from "chalk";
import { getRuntime } from "../core/runtime.js";
import { handleError } from "../utils/errors.js";
import type { ProviderId } from "@aura-os/shared";

const PROVIDER_META: Record<string, { displayName: string; color: string }> = {
  "aura-cloud": { displayName: "Aura Cloud", color: "#c48b5c" },
  openai: { displayName: "OpenAI", color: "#1a7f64" },
  anthropic: { displayName: "Anthropic", color: "#c2683f" },
  gemini: { displayName: "Google Gemini", color: "#3a6fc4" },
  deepseek: { displayName: "DeepSeek", color: "#4b5bb0" },
  ollama: { displayName: "Ollama (Local)", color: "#7a5c8e" },
  "openai-compatible": { displayName: "Custom Endpoint", color: "#645d4e" },
  minimax: { displayName: "Minimax", color: "#e05c2b" },
  qwen: { displayName: "Qwen", color: "#4f35b3" },
  lmstudio: { displayName: "LM Studio (Local)", color: "#1988a2" },
};

export async function providersCommand(): Promise<void> {
  try {
    console.log(chalk.bold("Supported Providers:"));
    console.log();

    for (const [id, meta] of Object.entries(PROVIDER_META)) {
      console.log(`  ${chalk.hex(meta.color)("●")} ${meta.displayName} ${chalk.gray(`(${id})`)}`);
    }

    console.log();
    console.log(chalk.gray("Configure a provider: aura-work config set <provider> <api-key>"));
  } catch (err) {
    handleError(err);
  }
}
