import { describe, it, expect } from 'vitest';
import {
  registerCommand,
  getCommand,
  getAllCommands,
  isSlashCommand
} from '../src/commands/slash/index.js';

describe('Slash Commands', () => {
  it('should have built-in commands', () => {
    const commands = getAllCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should get command by name', () => {
    const cmd = getCommand('help');
    expect(cmd).toBeDefined();
    expect(cmd?.name).toBe('help');
  });

  it('should get command by alias', () => {
    const cmd = getCommand('h');
    expect(cmd).toBeDefined();
    expect(cmd?.name).toBe('help');
  });

  it('should detect slash commands', () => {
    expect(isSlashCommand('/help')).toBe(true);
    expect(isSlashCommand('hello')).toBe(false);
  });

  it('should register custom commands', () => {
    registerCommand({
      name: 'test-cmd',
      description: 'Test command',
      handler: async () => 'test'
    });

    const cmd = getCommand('test-cmd');
    expect(cmd).toBeDefined();
  });
});
