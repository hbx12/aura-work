import chalk from "chalk";
import { getRuntime } from "../core/runtime.js";
import { formatTokens, formatCost, formatDate, statusIcon } from "../utils/format.js";
import { handleError } from "../utils/errors.js";

export async function sessionCommand(sub: string | undefined, args: string[], opts: Record<string, unknown>): Promise<void> {
  try {
    const runtime = await getRuntime();

    if (!sub || sub === "list") {
      await listSessions(runtime, opts);
      return;
    }

    if (sub === "open" || sub === "show") {
      const sessionId = args[0];
      if (!sessionId) throw new Error("Session ID required.");
      await showSession(runtime, sessionId);
      return;
    }

    if (sub === "delete") {
      const sessionId = args[0];
      if (!sessionId) throw new Error("Session ID required.");
      console.log(chalk.yellow(`Session deletion not yet implemented. ID: ${sessionId}`));
      return;
    }

    if (sub === "export") {
      const sessionId = args[0];
      if (!sessionId) throw new Error("Session ID required.");
      await exportSession(runtime, sessionId);
      return;
    }

    throw new Error(`Unknown session subcommand: ${sub}. Use: list | open | delete | export`);
  } catch (err) {
    handleError(err);
  }
}

async function listSessions(runtime: Awaited<ReturnType<typeof getRuntime>>, opts: Record<string, unknown>): Promise<void> {
  const projectId = opts.project as string | undefined;
  const sessions = await runtime.listSessions(projectId);

  if (sessions.length === 0) {
    console.log(chalk.gray("No sessions found."));
    return;
  }

  console.log(chalk.bold("Sessions:"));
  console.log();
  console.log(
    chalk.gray(
      `${"ID".padEnd(12)} ${"Status".padEnd(10)} ${"Title".padEnd(30)} ${"Tokens".padEnd(12)} ${"Cost".padEnd(10)} ${"Updated"}`
    )
  );
  console.log(chalk.gray("─".repeat(90)));

  for (const s of sessions) {
    const id = s.id.slice(0, 8);
    const icon = statusIcon(s.status);
    const title = (s.title ?? "Untitled").padEnd(30).slice(0, 30);
    const tokens = formatTokens(s.tokens_input + s.tokens_output).padEnd(12);
    const cost = formatCost(s.cost_total).padEnd(10);
    const updated = formatDate(s.updated_at);
    console.log(`${id} ${icon} ${title} ${tokens} ${cost} ${updated}`);
  }
}

async function showSession(runtime: Awaited<ReturnType<typeof getRuntime>>, sessionId: string): Promise<void> {
  const session = await runtime.db.getSession(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const messages = await runtime.getSessionMessages(sessionId);

  console.log(chalk.bold.cyan(`Session: ${session.title ?? session.id}`));
  console.log(chalk.gray(`  ID:        ${session.id}`));
  console.log(chalk.gray(`  Status:    ${session.status}`));
  console.log(chalk.gray(`  Mode:      ${session.mode}`));
  console.log(chalk.gray(`  Agent:     ${session.agent}`));
  console.log(chalk.gray(`  Model:     ${session.model_provider ?? "?"}/${session.model_id ?? "?"}`));
  console.log(chalk.gray(`  Tokens:    ${formatTokens(session.tokens_input)} in / ${formatTokens(session.tokens_output)} out`));
  console.log(chalk.gray(`  Cost:      ${formatCost(session.cost_total)}`));
  console.log(chalk.gray(`  Created:   ${formatDate(session.created_at)}`));
  console.log(chalk.gray(`  Updated:   ${formatDate(session.updated_at)}`));
  console.log();

  if (messages.length > 0) {
    console.log(chalk.bold("Messages:"));
    for (const m of messages) {
      const role = m.role === "user" ? chalk.bold.green("You") :
                   m.role === "assistant" ? chalk.bold.cyan("AI") :
                   chalk.gray(m.role);
      console.log(`[${role}] ${m.content ?? "(empty)"}`);
    }
  }
}

async function exportSession(runtime: Awaited<ReturnType<typeof getRuntime>>, sessionId: string): Promise<void> {
  const session = await runtime.db.getSession(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const messages = await runtime.getSessionMessages(sessionId);
  const exportData = { session, messages };
  console.log(JSON.stringify(exportData, null, 2));
}
