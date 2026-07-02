import chalk from "chalk";
import { getRuntime, type RunOptions } from "../core/runtime.js";
import { formatTokens, formatCost, statusIcon } from "../utils/format.js";
import { handleError } from "../utils/errors.js";
import { log } from "../utils/logger.js";

export async function rootCommand(dir: string | undefined, opts: RunOptions): Promise<void> {
  try {
    const runtime = await getRuntime();
    const project = await runtime.resolveProject(dir);

    console.log(chalk.bold.cyan("✦ Aura Work CLI"));
    console.log(chalk.gray(`  Project: ${project.name}`));
    console.log(chalk.gray(`  Path:    ${project.folder_path}`));
    console.log();

    // List recent sessions
    const sessions = await runtime.listSessions(project.id);
    if (sessions.length > 0) {
      console.log(chalk.bold("Recent Sessions:"));
      for (const s of sessions.slice(0, 10)) {
        const icon = statusIcon(s.status);
        const title = s.title ?? s.id.slice(0, 8);
        const cost = s.cost_total > 0 ? chalk.gray(` (${formatCost(s.cost_total)})`) : "";
        console.log(`  ${icon} ${title}${cost}`);
      }
      console.log();
    }

    // Show quick help
    console.log(chalk.bold("Quick Commands:"));
    console.log(`  ${chalk.cyan("aura-work run")} "<message>"    Run a one-shot task`);
    console.log(`  ${chalk.cyan("aura-work session list")}     List all sessions`);
    console.log(`  ${chalk.cyan("aura-work models")}            Show available models`);
    console.log(`  ${chalk.cyan("aura-work config")}            Show/edit config`);
    console.log(`  ${chalk.cyan("aura-work doctor")}            Check system health`);
    console.log();
  } catch (err) {
    handleError(err);
  }
}
