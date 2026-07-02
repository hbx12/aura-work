#!/usr/bin/env node
import React from 'react';
/**
 * Aura CLI — standalone OpenCode-style terminal interface for Aura Work.
 *
 * Usage:
 *   aura-work                       Show project info and recent sessions
 *   aura-work run "<message>"       Run a one-shot task
 *   aura-work session list          List sessions
 *   aura-work models                Show available models
 *   aura-work providers             Show supported providers
 *   aura-work config                Show/edit config
 *   aura-work doctor                Check system health
 */
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { rootCommand } from "./commands/root.js";
import { runCommand } from "./commands/run.js";
import { sessionCommand } from "./commands/session.js";
import { modelsCommand, modelSetCommand } from "./commands/model.js";
import { configCommand } from "./commands/config.js";
import { doctorCommand } from "./commands/doctor.js";
import { providersCommand } from "./commands/providers.js";
import { setLogLevel } from "./utils/logger.js";
import { handleError } from "./utils/errors.js";

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName("aura-work")
    .usage("$0 [options] [directory]")
    .option("verbose", {
      alias: "v",
      type: "boolean",
      description: "Enable verbose logging",
    })
    .option("quiet", {
      alias: "q",
      type: "boolean",
      description: "Suppress info output",
    })
    .command(
      ["$0 [directory]", "start [directory]"],
      "Start Aura CLI in a project directory",
      (y) =>
        y.positional("directory", {
          type: "string",
          describe: "Project directory (default: current)",
        }),
      (args) => {
        if (args.verbose) setLogLevel("debug");
        if (args.quiet) setLogLevel("error");
        rootCommand(args.directory, {
          dir: args.directory,
        });
      },
    )
    .command(
      "run <message>",
      "Run a one-shot task",
      (y) =>
        y
          .positional("message", { type: "string", demandOption: true })
          .option("continue", {
            alias: "c",
            type: "boolean",
            description: "Continue last session",
          })
          .option("session", {
            alias: "s",
            type: "string",
            description: "Resume specific session",
          })
          .option("fork", {
            type: "string",
            description: "Fork session before continuing",
          })
          .option("model", {
            alias: "m",
            type: "string",
            description: 'Model in provider/model format, e.g., "openai/gpt-4o"',
          })
          .option("agent", {
            type: "string",
            description: "Agent to use",
          })
          .option("file", {
            alias: "f",
            type: "array",
            description: "Attach file(s)",
          })
          .option("dir", {
            type: "string",
            description: "Run in specific directory",
          })
          .option("format", {
            type: "string",
            choices: ["text", "json"] as const,
            default: "text",
            description: "Output format",
          })
          .option("auto", {
            type: "boolean",
            description: "Auto-approve low-risk actions",
          }),
      (args) => {
        if (args.verbose) setLogLevel("debug");
        if (args.quiet) setLogLevel("error");
        runCommand(args.message as string, {
          continue: args.continue,
          session: args.session,
          fork: args.fork,
          model: args.model,
          agent: args.agent,
          files: args.file as string[] | undefined,
          dir: args.dir,
          format: args.format as "text" | "json",
          auto: args.auto,
        });
      },
    )
    .command(
      "session [subcommand] [id]",
      "Manage sessions (list, open, delete, export)",
      (y) =>
        y
          .positional("subcommand", { type: "string" })
          .positional("id", { type: "string" })
          .option("project", {
            alias: "p",
            type: "string",
            description: "Filter by project ID",
          }),
      (args) => {
        if (args.verbose) setLogLevel("debug");
        sessionCommand(
          args.subcommand,
          args.id ? [args.id] : [],
          { project: args.project },
        );
      },
    )
    .command(
      "models",
      "Show available AI models",
      (y) =>
        y.option("provider", {
          alias: "p",
          type: "string",
          description: "Filter by provider",
        }),
      (args) => {
        if (args.verbose) setLogLevel("debug");
        modelsCommand({ provider: args.provider });
      },
    )
    .command(
      "model set <model>",
      "Set default model",
      (y) =>
        y.positional("model", {
          type: "string",
          demandOption: true,
        }),
      (args) => {
        modelSetCommand(args.model);
      },
    )
    .command(
      "providers",
      "Show supported AI providers",
      () => {},
      () => {
        providersCommand();
      },
    )
    .command(
      "config [subcommand] [key] [value]",
      "Show or edit configuration",
      (y) =>
        y
          .positional("subcommand", { type: "string" })
          .positional("key", { type: "string" })
          .positional("value", { type: "string" }),
      (args) => {
        configCommand(
          args.subcommand,
          [args.key, args.value].filter(Boolean) as string[],
        );
      },
    )
    .command(
      "doctor",
      "Check system health",
      () => {},
      () => {
        doctorCommand();
      },
    )
    .command(
      "tui",
      "Launch interactive TUI (Terminal UI)",
      (y) =>
        y
          .option("session", {
            alias: "s",
            type: "string",
            description: "Session ID to continue",
          })
          .option("model", {
            alias: "m",
            type: "string",
            description: "Model to use",
          }),
      async (args) => {
        const { render } = await import("ink");
        const { App } = await import("./tui/App.js");
        render(
          React.createElement(App, {
            sessionId: args.session as string | undefined,
            model: args.model as string | undefined,
            dir: args.dir as string | undefined,
          })
        );
      },
    )
    .command(
      "update",
      "Check for updates",
      () => {},
      () => {
        console.log("Update check: use npm update -g aura-work");
      },
    )
    .help()
    .alias("h", "help")
    .alias("V", "version")
    .strict()
    .parseAsync();
}

main().catch((err) => {
  handleError(err);
});
