import chalk from "chalk";
import { getRuntime } from "../core/runtime.js";
import { handleError } from "../utils/errors.js";
import { updateConfig } from "../core/config.js";

export async function modelsCommand(opts: Record<string, unknown>): Promise<void> {
  try {
    const runtime = await getRuntime();
    const providerFilter = opts.provider as string | undefined;

    console.log(chalk.bold("Available Models:"));
    console.log();

    // Show configured providers
    const providers = providerFilter ? [providerFilter] : [
      "openai", "anthropic", "gemini", "deepseek", "ollama", "openai-compatible"
    ];

    for (const provider of providers) {
      console.log(chalk.bold.yellow(`  ${provider}:`));
      try {
        const { models } = await runtime.agent.listModels(provider);
        if (Array.isArray(models) && models.length > 0) {
          for (const m of models.slice(0, 10)) {
            const model = m as { id?: string; displayName?: string };
            console.log(`    ${model.id ?? model.displayName ?? JSON.stringify(m)}`);
          }
          if (models.length > 10) {
            console.log(chalk.gray(`    ... and ${models.length - 10} more`));
          }
        } else {
          console.log(chalk.gray("    No models available (provider not configured?)"));
        }
      } catch {
        console.log(chalk.gray("    Provider not available"));
      }
      console.log();
    }
  } catch (err) {
    handleError(err);
  }
}

export async function modelSetCommand(model: string): Promise<void> {
  try {
    if (!model || !model.includes("/")) {
      throw new Error("Model must be in provider/model format, e.g., openai/gpt-4o");
    }
    const [provider, modelId] = model.split("/");
    updateConfig({
      defaultProvider: provider as any,
      defaultModel: modelId,
    });
    console.log(chalk.green(`✔ Default model set to: ${model}`));
  } catch (err) {
    handleError(err);
  }
}
