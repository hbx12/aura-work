import chalk from "chalk";
import { getAgentClient } from "../core/agent.js";
import { getDbPath, getConfigPath, getAuraHome } from "../utils/platform.js";
import { loadConfig } from "../core/config.js";
import { existsSync } from "node:fs";

export async function doctorCommand(): Promise<void> {
  console.log(chalk.bold.cyan("✦ Aura Work Doctor"));
  console.log();

  const checks: { name: string; ok: boolean; detail: string }[] = [];

  // Check aura home
  const home = getAuraHome();
  const homeExists = existsSync(home);
  checks.push({
    name: "Aura home directory",
    ok: homeExists,
    detail: homeExists ? home : `${home} (not found)`,
  });

  // Check config
  const configPath = getConfigPath();
  const configExists = existsSync(configPath);
  checks.push({
    name: "Config file",
    ok: configExists,
    detail: configExists ? configPath : `${configPath} (not found)`,
  });

  // Check database
  const dbPath = getDbPath();
  const dbExists = existsSync(dbPath);
  checks.push({
    name: "Database file",
    ok: dbExists,
    detail: dbExists ? dbPath : `${dbPath} (not found)`,
  });

  // Check agent sidecar
  const agent = getAgentClient();
  let agentOk = false;
  let agentDetail = "Not running";
  try {
    const health = await agent.health();
    agentOk = health.status === "ready";
    agentDetail = agentOk ? `v${health.version}` : health.status;
  } catch {
    // agent offline
  }
  checks.push({
    name: "Agent sidecar",
    ok: agentOk,
    detail: agentDetail,
  });

  // Print results
  for (const check of checks) {
    const icon = check.ok ? chalk.green("✔") : chalk.red("✖");
    console.log(`  ${icon} ${check.name}: ${chalk.gray(check.detail)}`);
  }

  console.log();

  const allOk = checks.every((c) => c.ok);
  if (allOk) {
    console.log(chalk.green("All checks passed! Aura CLI is ready."));
  } else {
    console.log(chalk.yellow("Some checks failed. Fix the issues above."));
    if (!agentOk) {
      console.log(chalk.gray("  Start agent: npm run sidecar"));
    }
  }
}
