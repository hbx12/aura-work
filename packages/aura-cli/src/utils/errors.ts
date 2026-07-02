import chalk from "chalk";

export class AuraError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode: number = 1,
  ) {
    super(message);
    this.name = "AuraError";
  }
}

export class ConfigError extends AuraError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
    this.name = "ConfigError";
  }
}

export class AgentOfflineError extends AuraError {
  constructor() {
    super(
      "Agent sidecar is not running.\n" +
        "Start it with: npm run sidecar\n" +
        "Or: aura-work doctor",
      "AGENT_OFFLINE",
    );
    this.name = "AgentOfflineError";
  }
}

export class SessionError extends AuraError {
  constructor(message: string) {
    super(message, "SESSION_ERROR");
    this.name = "SessionError";
  }
}

export function formatError(err: unknown): string {
  if (err instanceof AuraError) {
    return chalk.red(`[${err.code}] ${err.message}`);
  }
  if (err instanceof Error) {
    return chalk.red(err.message);
  }
  return chalk.red(String(err));
}

export function handleError(err: unknown): never {
  console.error(formatError(err));
  const exitCode = err instanceof AuraError ? err.exitCode : 1;
  process.exit(exitCode);
}
