import chalk from "chalk";
import { loadConfig, updateConfig, type AuraConfig } from "../core/config.js";
import { handleError } from "../utils/errors.js";

export async function configCommand(sub: string | undefined, args: string[]): Promise<void> {
  try {
    if (!sub || sub === "show" || sub === "list") {
      showConfig();
      return;
    }

    if (sub === "set") {
      const key = args[0];
      const value = args[1];
      if (!key || value === undefined) {
        throw new Error("Usage: aura-work config set <key> <value>");
      }
      setConfigValue(key, value);
      return;
    }

    if (sub === "get") {
      const key = args[0];
      if (!key) throw new Error("Usage: aura-work config get <key>");
      getConfigValue(key);
      return;
    }

    if (sub === "reset") {
      const { getConfigPath } = await import("../utils/platform.js");
      const path = getConfigPath();
      console.log(chalk.yellow(`Config path: ${path}`));
      console.log(chalk.gray("To reset, delete the file manually."));
      return;
    }

    throw new Error(`Unknown config subcommand: ${sub}. Use: show | set | get | reset`);
  } catch (err) {
    handleError(err);
  }
}

function showConfig(): void {
  const config = loadConfig();
  console.log(chalk.bold("Aura CLI Configuration:"));
  console.log();
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined && value !== null) {
      console.log(`  ${chalk.cyan(key.padEnd(20))} ${JSON.stringify(value)}`);
    }
  }
  console.log();
  console.log(chalk.gray("Edit: aura-work config set <key> <value>"));
}

function getConfigValue(key: string): void {
  const config = loadConfig();
  const value = config[key];
  if (value === undefined) {
    console.log(chalk.gray(`  ${key} is not set`));
  } else {
    console.log(`  ${key} = ${JSON.stringify(value)}`);
  }
}

function setConfigValue(key: string, value: string): void {
  // Try to parse as JSON, fallback to string
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = value;
  }

  updateConfig({ [key]: parsed } as Partial<AuraConfig>);
  console.log(chalk.green(`✔ ${key} = ${JSON.stringify(parsed)}`));
}
