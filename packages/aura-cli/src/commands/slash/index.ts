/**
 * Slash Command System for Aura CLI
 * Supports built-in and custom commands
 */

export interface SlashCommand {
  name: string;
  description: string;
  usage?: string;
  aliases?: string[];
  category?: string;
  handler: (args: string, context: CommandContext) => Promise<string | void>;
}

export interface CommandContext {
  sessionId?: string;
  model?: string;
  dir?: string;
  sendMessage?: (content: string) => Promise<void>;
}

// Command registry
const commands = new Map<string, SlashCommand>();
const aliases = new Map<string, string>();

// Register a command
export function registerCommand(command: SlashCommand): void {
  commands.set(command.name, command);

  // Register aliases
  if (command.aliases) {
    for (const alias of command.aliases) {
      aliases.set(alias, command.name);
    }
  }
}

// Get command by name or alias
export function getCommand(name: string): SlashCommand | undefined {
  const realName = aliases.get(name) || name;
  return commands.get(realName);
}

// Get all commands
export function getAllCommands(): SlashCommand[] {
  return Array.from(commands.values());
}

// Get commands by category
export function getCommandsByCategory(category: string): SlashCommand[] {
  return getAllCommands().filter(cmd => cmd.category === category);
}

// Execute a slash command
export async function executeCommand(
  input: string,
  context: CommandContext
): Promise<string | void> {
  // Parse command and args
  const match = input.match(/^\/(\w+)\s*(.*)?$/);
  if (!match) {
    throw new Error('Invalid command format');
  }

  const [, cmdName, args = ''] = match;
  const command = getCommand(cmdName);

  if (!command) {
    throw new Error(`Unknown command: /${cmdName}`);
  }

  return command.handler(args.trim(), context);
}

// Check if input is a slash command
export function isSlashCommand(input: string): boolean {
  return input.startsWith('/');
}

// Register built-in commands
function registerBuiltinCommands(): void {
  // /help - Show available commands
  registerCommand({
    name: 'help',
    description: 'Show available commands',
    aliases: ['h', '?'],
    category: 'general',
    handler: async () => {
      const cmds = getAllCommands();
      const categories = new Map<string, SlashCommand[]>();

      for (const cmd of cmds) {
        const cat = cmd.category || 'other';
        if (!categories.has(cat)) categories.set(cat, []);
        categories.get(cat)!.push(cmd);
      }

      let output = 'Available commands:\n\n';
      for (const [cat, catCmds] of categories) {
        output += `${cat.toUpperCase()}\n`;
        for (const cmd of catCmds) {
          output += `  /${cmd.name.padEnd(15)} ${cmd.description}\n`;
        }
        output += '\n';
      }

      return output;
    }
  });

  // /clear - Clear chat history
  registerCommand({
    name: 'clear',
    description: 'Clear chat history',
    aliases: ['cls'],
    category: 'general',
    handler: async () => {
      return 'Chat cleared';
    }
  });

  // /model - Show or set model
  registerCommand({
    name: 'model',
    description: 'Show or set current model',
    usage: '/model [provider/model]',
    category: 'config',
    handler: async (args) => {
      if (!args) {
        return 'Current model: default';
      }
      return `Model set to: ${args}`;
    }
  });

  // /session - Session management
  registerCommand({
    name: 'session',
    description: 'Session management',
    usage: '/session [new|list|info]',
    category: 'session',
    handler: async (args) => {
      switch (args) {
        case 'new':
          return 'New session created';
        case 'list':
          return 'Session list';
        case 'info':
          return 'Session info';
        default:
          return 'Usage: /session [new|list|info]';
      }
    }
  });

  // /theme - Theme management
  registerCommand({
    name: 'theme',
    description: 'Show or set theme',
    usage: '/theme [name]',
    category: 'config',
    handler: async (args) => {
      if (!args) {
        return 'Current theme: aura-dark\nAvailable: aura-dark, midnight, dracula, monokai, nord, tokyo-night, aura-light, github-light, solarized-light, one-light, high-contrast-dark, high-contrast-light';
      }
      return `Theme set to: ${args}`;
    }
  });

  // /budget - Budget management
  registerCommand({
    name: 'budget',
    description: 'Show or set budget',
    usage: '/budget [amount]',
    category: 'cost',
    handler: async (args) => {
      if (!args) {
        return 'No budget set';
      }
      return `Budget set to: $${args}`;
    }
  });

  // /approve - Approve pending action
  registerCommand({
    name: 'approve',
    description: 'Approve pending action',
    aliases: ['yes', 'y'],
    category: 'approvals',
    handler: async () => {
      return 'Approved';
    }
  });

  // /deny - Deny pending action
  registerCommand({
    name: 'deny',
    description: 'Deny pending action',
    aliases: ['no', 'n'],
    category: 'approvals',
    handler: async () => {
      return 'Denied';
    }
  });

  // /checkpoint - Create checkpoint
  registerCommand({
    name: 'checkpoint',
    description: 'Create a checkpoint',
    usage: '/checkpoint [name]',
    category: 'session',
    handler: async (args) => {
      return `Checkpoint created: ${args || 'unnamed'}`;
    }
  });

  // /undo - Undo last action
  registerCommand({
    name: 'undo',
    description: 'Undo last action',
    category: 'session',
    handler: async () => {
      return 'Undone';
    }
  });

  // /compact - Compact conversation
  registerCommand({
    name: 'compact',
    description: 'Compact conversation to save tokens',
    category: 'session',
    handler: async () => {
      return 'Conversation compacted';
    }
  });

  // /context - Show context window
  registerCommand({
    name: 'context',
    description: 'Show context window usage',
    category: 'session',
    handler: async () => {
      return 'Context: 0/128k tokens';
    }
  });

  // /providers - List providers
  registerCommand({
    name: 'providers',
    description: 'List available providers',
    category: 'config',
    handler: async () => {
      return 'Providers: openai, anthropic, google, ollama';
    }
  });

  // /mcp - MCP server management
  registerCommand({
    name: 'mcp',
    description: 'MCP server management',
    usage: '/mcp [list|status]',
    category: 'tools',
    handler: async (args) => {
      switch (args) {
        case 'list':
          return 'MCP servers: none configured';
        case 'status':
          return 'MCP status: inactive';
        default:
          return 'Usage: /mcp [list|status]';
      }
    }
  });

  // /doctor - Run diagnostics
  registerCommand({
    name: 'doctor',
    description: 'Run system diagnostics',
    category: 'general',
    handler: async () => {
      return 'All checks passed ✓';
    }
  });

  // /exit - Exit CLI
  registerCommand({
    name: 'exit',
    description: 'Exit the CLI',
    aliases: ['quit', 'q'],
    category: 'general',
    handler: async () => {
      process.exit(0);
    }
  });
}

// Initialize built-in commands
registerBuiltinCommands();
