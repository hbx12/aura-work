import chalk from "chalk";
import { loadConfig } from "../core/config.js";

const PROVIDERS: Record<string, { name: string; envKey: string }> = {
  openai: { name: "OpenAI", envKey: "OPENAI_API_KEY" },
  anthropic: { name: "Anthropic", envKey: "ANTHROPIC_API_KEY" },
  groq: { name: "Groq", envKey: "GROQ_API_KEY" },
  deepseek: { name: "DeepSeek", envKey: "DEEPSEEK_API_KEY" },
  google: { name: "Google Gemini", envKey: "GOOGLE_API_KEY" },
  ollama: { name: "Ollama (Local)", envKey: "" },
};

export async function providersCommand(): Promise<void> {
  console.log(chalk.bold.cyan("✦ Providers"));
  console.log();

  const config = loadConfig();
  const configKeys = config.apiKeys || {};

  for (const [id, meta] of Object.entries(PROVIDERS)) {
    const hasEnv = meta.envKey ? !!process.env[meta.envKey] : false;
    const hasConfig = !!configKeys[id];
    const configured = hasEnv || hasConfig;

    const icon = configured ? chalk.green("✔") : chalk.gray("○");
    const source = hasConfig ? "config" : hasEnv ? `env (${meta.envKey})` : "not configured";
    const local = id === "ollama" ? chalk.cyan(" [local]") : "";

    console.log(`  ${icon} ${meta.name}${local} ${chalk.gray(`(${source})`)}`);
  }

  console.log();
  console.log(chalk.gray("Set API key:"));
  console.log(chalk.gray("  aura config set apiKeys.openai YOUR_KEY"));
  console.log(chalk.gray("  set OPENAI_API_KEY=your-key"));
}
