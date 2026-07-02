import chalk from "chalk";

export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}

export function padRight(str: string, len: number): string {
  return str.padEnd(len).slice(0, len);
}

export function statusIcon(status: string): string {
  switch (status) {
    case "active":
    case "running":
      return chalk.green("●");
    case "idle":
    case "completed":
      return chalk.blue("○");
    case "failed":
    case "error":
      return chalk.red("✖");
    case "archived":
      return chalk.gray("◌");
    default:
      return chalk.gray("?");
  }
}

export function riskColor(risk: string, text: string): string {
  switch (risk) {
    case "low":
      return chalk.green(text);
    case "medium":
      return chalk.yellow(text);
    case "high":
    case "critical":
      return chalk.red(text);
    default:
      return text;
  }
}
