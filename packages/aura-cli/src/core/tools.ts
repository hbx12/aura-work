/**
 * Tool Execution for Aura CLI
 * Provides shell, file, and search tools for the AI to use
 */

import { execSync, exec } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  result: string;
  success: boolean;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      type: 'function',
      function: {
        name: 'shell',
        description: 'Execute a shell command and return the output. Use for running tests, building, installing packages, etc.',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The shell command to execute',
            },
            cwd: {
              type: 'string',
              description: 'Working directory (optional)',
            },
          },
          required: ['command'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'read_file',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to read',
            },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'write_file',
        description: 'Write content to a file. Creates directories if needed.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to write',
            },
            content: {
              type: 'string',
              description: 'Content to write to the file',
            },
          },
          required: ['path', 'content'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_dir',
        description: 'List files and directories in a path',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory path to list',
            },
            pattern: {
              type: 'string',
              description: 'Glob pattern to filter (e.g., "**/*.ts")',
            },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search',
        description: 'Search for text patterns in files using regex',
        parameters: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Regex pattern to search for',
            },
            path: {
              type: 'string',
              description: 'Directory or file to search in',
            },
            glob: {
              type: 'string',
              description: 'File glob pattern to filter (e.g., "*.ts")',
            },
          },
          required: ['pattern'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'edit_file',
        description: 'Edit a file by replacing old text with new text',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to edit',
            },
            old_text: {
              type: 'string',
              description: 'Text to find and replace',
            },
            new_text: {
              type: 'string',
              description: 'Replacement text',
            },
          },
          required: ['path', 'old_text', 'new_text'],
        },
      },
    },
  ];
}

export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const { name, arguments: argsStr } = toolCall.function;
  let args: any;

  try {
    args = JSON.parse(argsStr);
  } catch {
    return {
      toolCallId: toolCall.id,
      result: `Error: Invalid JSON arguments: ${argsStr}`,
      success: false,
    };
  }

  try {
    let result: string;

    switch (name) {
      case 'shell':
        result = await execShell(args.command, args.cwd);
        break;
      case 'read_file':
        result = execReadFile(args.path);
        break;
      case 'write_file':
        result = execWriteFile(args.path, args.content);
        break;
      case 'list_dir':
        result = execListDir(args.path, args.pattern);
        break;
      case 'search':
        result = execSearch(args.pattern, args.path, args.glob);
        break;
      case 'edit_file':
        result = execEditFile(args.path, args.old_text, args.new_text);
        break;
      default:
        return {
          toolCallId: toolCall.id,
          result: `Unknown tool: ${name}`,
          success: false,
        };
    }

    return {
      toolCallId: toolCall.id,
      result: result.slice(0, 10000), // Limit output
      success: true,
    };
  } catch (err: any) {
    return {
      toolCallId: toolCall.id,
      result: `Error: ${err.message}`,
      success: false,
    };
  }
}

function execShell(command: string, cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, {
      cwd: cwd || process.cwd(),
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
    }, (error, stdout, stderr) => {
      if (error && !stdout) {
        reject(error);
        return;
      }
      const output = [stdout, stderr].filter(Boolean).join('\n');
      resolve(output || '(no output)');
    });
  });
}

function execReadFile(path: string): string {
  const resolved = resolve(path);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${path}`);
  }
  const content = readFileSync(resolved, 'utf-8');
  if (content.length > 50000) {
    return content.slice(0, 50000) + '\n... (truncated)';
  }
  return content;
}

function execWriteFile(path: string, content: string): string {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, content, 'utf-8');
  return `File written: ${path} (${content.length} bytes)`;
}

function execListDir(path: string, pattern?: string): string {
  const resolved = resolve(path || '.');
  if (!existsSync(resolved)) {
    throw new Error(`Directory not found: ${path}`);
  }

  const entries = readdirSync(resolved);

  if (pattern) {
    // Simple glob matching
    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    const filtered = entries.filter(e => regex.test(e));
    if (filtered.length === 0) {
      // Try recursive search
      const results: string[] = [];
      const search = (dir: string, prefix: string) => {
        try {
          for (const entry of readdirSync(dir)) {
            const rel = prefix ? `${prefix}/${entry}` : entry;
            const full = join(dir, entry);
            const stat = statSync(full);
            if (stat.isDirectory() && entry !== 'node_modules' && entry !== '.git') {
              search(full, rel);
            } else if (regex.test(entry) || regex.test(rel)) {
              results.push(rel);
            }
          }
        } catch {}
      };
      search(resolved, '');
      return results.length > 0 ? results.join('\n') : `No files matching: ${pattern}`;
    }
    return filtered.join('\n');
  }

  return entries.map(entry => {
    const fullPath = join(resolved, entry);
    const stat = statSync(fullPath);
    return `${stat.isDirectory() ? '📁' : '📄'} ${entry}`;
  }).join('\n');
}

function execSearch(pattern: string, path?: string, globPattern?: string): string {
  const searchPath = resolve(path || '.');
  const regex = new RegExp(pattern, 'gi');
  const results: string[] = [];

  function searchFile(filePath: string) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (regex.test(line)) {
          results.push(`${filePath}:${i + 1}: ${line.trim()}`);
          regex.lastIndex = 0;
        }
      });
    } catch {
      // Skip binary files
    }
  }

  function searchDir(dir: string, depth = 0) {
    if (depth > 5 || results.length > 100) return;
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry === 'node_modules' || entry === '.git') continue;
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          searchDir(fullPath, depth + 1);
        } else if (!globPattern || entry.match(globPattern.replace('*', '.*'))) {
          searchFile(fullPath);
        }
      }
    } catch {
      // Skip inaccessible dirs
    }
  }

  const stat = statSync(searchPath);
  if (stat.isDirectory()) {
    searchDir(searchPath);
  } else {
    searchFile(searchPath);
  }

  return results.length > 0 ? results.join('\n') : 'No matches found';
}

function execEditFile(path: string, oldText: string, newText: string): string {
  const resolved = resolve(path);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${path}`);
  }

  const content = readFileSync(resolved, 'utf-8');
  if (!content.includes(oldText)) {
    throw new Error(`Text not found in ${path}`);
  }

  const newContent = content.replace(oldText, newText);
  writeFileSync(resolved, newContent, 'utf-8');
  return `File edited: ${path}`;
}
