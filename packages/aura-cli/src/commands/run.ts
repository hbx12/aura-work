import chalk from "chalk";
import { loadConfig } from "../core/config.js";
import { chat } from "../core/ai.js";
import type { ChatMessage } from "../core/ai.js";
import { handleError } from "../utils/errors.js";

interface RunOptions {
  continue?: boolean;
  session?: string;
  fork?: string;
  model?: string;
  agent?: string;
  files?: string[];
  dir?: string;
  format?: "text" | "json";
  auto?: boolean;
}

export async function runCommand(message: string, opts: RunOptions): Promise<void> {
  try {
    const config = loadConfig();

    // Check if model is configured
    const envKeys: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      groq: 'GROQ_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      google: 'GOOGLE_API_KEY',
    };

    const configKeys = config.apiKeys || {};
    const hasConfigKey = Object.keys(configKeys).length > 0;
    let hasEnvKey = false;
    for (const envKey of Object.values(envKeys)) {
      if (process.env[envKey]) { hasEnvKey = true; break; }
    }

    if (!hasConfigKey && !hasEnvKey && !config.defaultModel) {
      const errorMsg = "No model configured. Run `aura` and use /model, or set provider API key.";
      if (opts.format === "json") {
        console.log(JSON.stringify({ error: errorMsg }));
      } else {
        console.log(chalk.red(`Error: ${errorMsg}`));
        console.log(chalk.gray("  Set API key: set OPENAI_API_KEY=your-key"));
        console.log(chalk.gray("  Or configure: aura config set apiKeys.openai YOUR_KEY"));
      }
      process.exit(1);
    }

    const model = opts.model || config.defaultModel;
    const projectPath = opts.dir || process.cwd();

    if (opts.format === "json") {
      // JSON line-delimited output
      const messages: ChatMessage[] = [
        { role: 'user', content: message },
      ];

      console.log(JSON.stringify({ type: "session.created", sessionId: `run-${Date.now()}` }));
      console.log(JSON.stringify({ type: "message.created", role: "user", content: message }));

      let fullResponse = '';
      await chat(messages, {
        onToken: (token) => {
          fullResponse += token;
          console.log(JSON.stringify({ type: "message.part.updated", token }));
        },
        onDone: () => {
          console.log(JSON.stringify({ type: "message.created", role: "assistant", content: fullResponse }));
        },
        onError: (err) => {
          console.log(JSON.stringify({ type: "error", message: err.message }));
        },
      }, { model });
      return;
    }

    // Human-readable output
    console.log(chalk.gray(`Model: ${model || 'default'}`));
    console.log(chalk.gray(`Dir:   ${projectPath}`));
    console.log();

    const messages: ChatMessage[] = [
      { role: 'user', content: message },
    ];

    process.stdout.write(chalk.green("Aura: "));
    await chat(messages, {
      onToken: (token) => {
        process.stdout.write(token);
      },
      onDone: () => {
        console.log();
      },
      onError: (err) => {
        console.log();
        console.log(chalk.red(`Error: ${err.message}`));
      },
    }, { model });
  } catch (err) {
    handleError(err);
  }
}
