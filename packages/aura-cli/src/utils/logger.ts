import chalk from "chalk";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

export const log = {
  debug(...args: unknown[]): void {
    if (shouldLog("debug")) {
      console.debug(chalk.gray("[debug]"), ...args);
    }
  },
  info(...args: unknown[]): void {
    if (shouldLog("info")) {
      console.log(chalk.blue("ℹ"), ...args);
    }
  },
  success(...args: unknown[]): void {
    if (shouldLog("info")) {
      console.log(chalk.green("✔"), ...args);
    }
  },
  warn(...args: unknown[]): void {
    if (shouldLog("warn")) {
      console.warn(chalk.yellow("⚠"), ...args);
    }
  },
  error(...args: unknown[]): void {
    if (shouldLog("error")) {
      console.error(chalk.red("✖"), ...args);
    }
  },
};
