import chalk from "chalk";
import { getDbPath, getConfigPath, getAuraHome } from "../utils/platform.js";
import { loadConfig } from "../core/config.js";
import { existsSync } from "node:fs";

export async function doctorCommand(): Promise<void> {
  console.log(chalk.bold.cyan("✦ Aura Work Doctor"));
  console.log();

  const checks: { name: string; ok: boolean; detail: string }[] = [];

  // Package version
  try {
    const pkg = JSON.parse(existsSync(new URL("../../package.json", import.meta.url)) ? 
      (await import("node:fs")).readFileSync(new URL("../../package.json", import.meta.url), "utf8") : "{}");
    checks.push({
      name: "Package version",
      ok: true,
      detail: `aura-work@${pkg.version || "unknown"}`,
    });
  } catch {
    checks.push({ name: "Package version", ok: false, detail: "Could not read" });
  }

  // Node version
  checks.push({
    name: "Node.js version",
    ok: true,
    detail: process.version,
  });

  // Aura home
  const home = getAuraHome();
  const homeExists = existsSync(home);
  checks.push({
    name: "Aura home directory",
    ok: homeExists,
    detail: homeExists ? home : `${home} (will be created on first use)`,
  });

  // Config
  const configPath = getConfigPath();
  const configExists = existsSync(configPath);
  const config = loadConfig();
  checks.push({
    name: "Config file",
    ok: configExists,
    detail: configExists ? configPath : `${configPath} (not found)`,
  });

  // Database
  const dbPath = getDbPath();
  const dbExists = existsSync(dbPath);
  checks.push({
    name: "Database file",
    ok: dbExists,
    detail: dbExists ? dbPath : `${dbPath} (will be created on first use)`,
  });

  // API keys
  const envKeys: Record<string, string> = {
    OPENAI_API_KEY: "openai",
    ANTHROPIC_API_KEY: "anthropic",
    GROQ_API_KEY: "groq",
    DEEPSEEK_API_KEY: "deepseek",
    GOOGLE_API_KEY: "google",
  };

  const configKeys = config.apiKeys || {};
  const detectedProviders: string[] = [];
  for (const [envKey, provider] of Object.entries(envKeys)) {
    if (process.env[envKey]) {
      detectedProviders.push(`${provider} (env: ${envKey})`);
    }
  }
  for (const provider of Object.keys(configKeys)) {
    if (!detectedProviders.some(p => p.startsWith(provider))) {
      detectedProviders.push(`${provider} (config)`);
    }
  }

  checks.push({
    name: "API keys",
    ok: detectedProviders.length > 0,
    detail: detectedProviders.length > 0 ? detectedProviders.join(", ") : "None configured",
  });

  // Default model
  checks.push({
    name: "Default model",
    ok: !!config.defaultModel,
    detail: config.defaultModel ? `${config.defaultProvider || "openai"}/${config.defaultModel}` : "Not set",
  });

  // Print results
  for (const check of checks) {
    const icon = check.ok ? chalk.green("✔") : chalk.yellow("⚠");
    console.log(`  ${icon} ${check.name}: ${chalk.gray(check.detail)}`);
  }

  console.log();

  const failed = checks.filter(c => !c.ok);
  if (failed.length === 0) {
    console.log(chalk.green("All checks passed! Aura CLI is ready."));
  } else {
    console.log(chalk.yellow(`${failed.length} check(s) need attention.`));
    if (!config.defaultModel) {
      console.log(chalk.gray("  Set model: aura config set defaultModel <model>"));
    }
    if (detectedProviders.length === 0) {
      console.log(chalk.gray("  Set API key: set OPENAI_API_KEY=your-key"));
    }
  }
}
