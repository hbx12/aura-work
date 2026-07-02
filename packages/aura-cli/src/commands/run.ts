import chalk from "chalk";
import ora from "ora";
import { getRuntime, type RunOptions } from "../core/runtime.js";
import { formatTokens, formatCost } from "../utils/format.js";
import { handleError } from "../utils/errors.js";

export async function runCommand(message: string, opts: RunOptions): Promise<void> {
  try {
    const runtime = await getRuntime();
    const project = await runtime.resolveProject(opts.dir);
    const session = await runtime.resolveSession(opts);

    if (opts.format === "json") {
      // JSON output mode
      const result = await runtime.sendMessage(message, opts);
      console.log(JSON.stringify({
        sessionId: session.id,
        projectId: project.id,
        message: {
          id: result.id,
          role: result.role,
          content: result.content,
          createdAt: result.created_at,
        },
      }, null, 2));
      return;
    }

    // Human-readable output
    console.log(chalk.gray(`Session: ${session.title ?? session.id.slice(0, 8)}`));
    console.log(chalk.gray(`Model:   ${session.model_provider ?? "openai"}/${session.model_id ?? "gpt-4o"}`));
    console.log();

    const spinner = ora({ text: "Thinking...", spinner: "dots" }).start();

    try {
      const response = await runtime.sendMessage(message, opts);
      spinner.stop();

      console.log(chalk.bold.green("Assistant:"));
      console.log(response.content);
      console.log();

      // Show usage
      const updatedSession = await runtime.db.getSession(session.id);
      if (updatedSession) {
        const tokens = updatedSession.tokens_input + updatedSession.tokens_output;
        console.log(
          chalk.gray(
            `Tokens: ${formatTokens(updatedSession.tokens_input)} in / ${formatTokens(updatedSession.tokens_output)} out | ` +
            `Cost: ${formatCost(updatedSession.cost_total)}`
          )
        );
      }
    } catch (err) {
      spinner.fail("Failed");
      throw err;
    }
  } catch (err) {
    handleError(err);
  }
}
