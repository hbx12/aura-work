#!/usr/bin/env node
/**
 * Aura OS CLI companion — Phase 11
 * Uses local bridge; cannot bypass permissions; fails if desktop is offline.
 */
import { bridgeFetch, usage, type BridgeHealth } from "./bridge.js";
import { loadConfig, resolveToken, saveConfig } from "./config.js";

function parseArgs(argv: string[]) {
  const args = [...argv];
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  while (args.length) {
    const a = args.shift()!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[0];
      if (!next || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = args.shift()!;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const cmd = positional[0];

  if (!cmd || cmd === "help" || flags.help) {
    console.log(usage());
    process.exit(0);
  }

  const config = loadConfig();
  const bridgeUrl = (flags["bridge-url"] as string) || config.bridgeUrl;
  if (bridgeUrl) process.env.AURA_BRIDGE_URL = bridgeUrl;

  try {
    if (cmd === "status") {
      const health = await bridgeFetch<BridgeHealth>("/health");
      console.log(JSON.stringify(health, null, 2));
      return;
    }

    if (cmd === "pair") {
      const code = flags.code as string;
      const name = (flags.name as string) || "Aura CLI";
      if (!code) throw new Error("--code is required.");
      const result = await bridgeFetch<{
        clientId: string;
        sessionToken: string;
      }>("/v1/pair/claim", {
        method: "POST",
        body: { code, name, clientType: "cli" },
      });
      saveConfig({ ...config, bridgeUrl: process.env.AURA_BRIDGE_URL, sessionToken: result.sessionToken });
      console.log(`Paired CLI client ${result.clientId}. Token saved to ${process.env.AURA_CLI_CONFIG ?? "~/.aura/config.json"}`);
      return;
    }

    const token = resolveToken(config);
    if (!token) {
      throw new Error(
        "No session token. Pair first: aura pair --code <code> (from Extensions in Aura desktop).",
      );
    }

    if (cmd === "projects") {
      const data = await bridgeFetch<{ projects: unknown[] }>("/v1/projects", { token });
      console.log(JSON.stringify(data.projects, null, 2));
      return;
    }

    if (cmd === "task") {
      const sub = positional[1];
      if (sub === "create") {
        const projectId = flags.project as string;
        const prompt = flags.prompt as string;
        if (!projectId || !prompt) throw new Error("--project and --prompt are required.");
        const data = await bridgeFetch<{ task: unknown }>("/v1/task/create", {
          method: "POST",
          token,
          body: {
            projectId,
            prompt,
            source: "cli",
            autoStart: flags["no-start"] ? false : true,
          },
        });
        console.log(JSON.stringify(data.task, null, 2));
        return;
      }
      if (sub === "get") {
        const taskId = positional[2];
        if (!taskId) throw new Error("Task id required.");
        const data = await bridgeFetch<{ task: unknown }>(`/v1/task/${taskId}`, { token });
        console.log(JSON.stringify(data.task, null, 2));
        return;
      }
      if (sub === "logs") {
        const taskId = positional[2];
        if (!taskId) throw new Error("Task id required.");
        const data = await bridgeFetch<{ logs: unknown[] }>(`/v1/task/${taskId}/logs`, { token });
        for (const entry of data.logs ?? []) {
          console.log(JSON.stringify(entry));
        }
        return;
      }
      throw new Error("Unknown task subcommand. Use: create | get | logs");
    }

    if (cmd === "open" && positional[1] === "task") {
      const taskId = positional[2];
      if (!taskId) throw new Error("Task id required.");
      await bridgeFetch("/v1/open/task", {
        method: "POST",
        token,
        body: { taskId },
      });
      console.log(`Requested Aura desktop to open task ${taskId}.`);
      return;
    }

    throw new Error(`Unknown command: ${cmd}`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

main();
