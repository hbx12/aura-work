/**
 * Direct AI Provider Integration
 * Supports OpenAI-compatible APIs (OpenAI, Anthropic via proxy, Ollama, etc.)
 */

import { loadConfig } from './config.js';
import { executeTool, getToolDefinitions, type ToolCall, type ToolResult } from './tools.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (result: ToolResult) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
}

const PROVIDERS: Record<string, AIProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3', 'codellama', 'mistral'],
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
};

export function getProvider(id: string): AIProvider | undefined {
  return PROVIDERS[id];
}

export function listProviders(): AIProvider[] {
  return Object.values(PROVIDERS);
}

function getApiKey(providerId: string): string | undefined {
  const envKeys: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    groq: 'GROQ_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    ollama: '', // No key needed
  };

  const envKey = envKeys[providerId];
  if (envKey) {
    return process.env[envKey];
  }

  // Check config
  const config = loadConfig();
  return config.apiKeys?.[providerId];
}

export function resolveModel(model?: string): { providerId: string; modelId: string } {
  if (model?.includes('/')) {
    const [providerId, modelId] = model.split('/');
    return { providerId, modelId };
  }

  const config = loadConfig();
  return {
    providerId: (config.defaultProvider as string) || 'openai',
    modelId: model || config.defaultModel || 'gpt-4o',
  };
}

const SYSTEM_PROMPT = `You are Aura, an AI coding assistant running in the terminal. You can:
- Read and write files
- Run shell commands
- Search code with glob and grep
- Help with coding tasks

When you need to perform an action, use the available tools. Always explain what you're doing.
Be concise and direct. Use markdown formatting when helpful.`;

export async function chatStream(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  opts?: { model?: string; maxTokens?: number }
): Promise<void> {
  const { providerId, modelId } = resolveModel(opts?.model);
  const provider = PROVIDERS[providerId];

  if (!provider) {
    callbacks.onError(new Error(`Unknown provider: ${providerId}. Available: ${Object.keys(PROVIDERS).join(', ')}`));
    return;
  }

  const apiKey = getApiKey(providerId);
  if (providerId !== 'ollama' && !apiKey) {
    callbacks.onError(new Error(
      `No API key for ${provider.name}. Set ${providerId.toUpperCase()}_API_KEY environment variable or run: aura-work config set apiKeys.${providerId} <key>`
    ));
    return;
  }

  const tools = getToolDefinitions();
  const allMessages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  try {
    await streamChat(provider, apiKey, modelId, allMessages, tools, callbacks, opts?.maxTokens);
  } catch (err: any) {
    callbacks.onError(err);
  }
}

async function streamChat(
  provider: AIProvider,
  apiKey: string | undefined,
  model: string,
  messages: ChatMessage[],
  tools: any[],
  callbacks: StreamCallbacks,
  maxTokens?: number
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    if (provider.id === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  const body: any = {
    model,
    messages,
    stream: true,
    max_tokens: maxTokens || 4096,
  };

  // Add tools for OpenAI-compatible providers
  if (provider.id !== 'anthropic' && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const url = provider.id === 'anthropic'
    ? `${provider.baseUrl}/messages`
    : `${provider.baseUrl}/chat/completions`;

  // Anthropic has different request format
  if (provider.id === 'anthropic') {
    const systemMsg = messages.find(m => m.role === 'system');
    body.system = systemMsg?.content || SYSTEM_PROMPT;
    body.messages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content,
    }));
    delete body.stream; // Anthropic streaming format differs
    body.stream = true;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${provider.name} API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let toolCallsBuffer: ToolCall[] = [];
  let currentToolCall: Partial<ToolCall> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);
      if (data === '[DONE]') {
        // Process any remaining tool calls
        if (toolCallsBuffer.length > 0) {
          for (const tc of toolCallsBuffer) {
            if (callbacks.onToolCall) callbacks.onToolCall(tc);
            try {
              const result = await executeTool(tc);
              if (callbacks.onToolResult) callbacks.onToolResult(result);
              // Add tool result to messages and continue conversation
              messages.push({
                role: 'assistant',
                content: '',
                tool_calls: toolCallsBuffer,
              });
              messages.push({
                role: 'tool',
                content: result.result,
                tool_call_id: tc.id,
                name: tc.function.name,
              });
            } catch (err: any) {
              const errorResult: ToolResult = {
                toolCallId: tc.id,
                result: `Error: ${err.message}`,
                success: false,
              };
              if (callbacks.onToolResult) callbacks.onToolResult(errorResult);
            }
          }
          // Continue conversation with tool results
          toolCallsBuffer = [];
          await streamChat(provider, apiKey, model, messages, getToolDefinitions(), callbacks, maxTokens);
          return;
        }
        callbacks.onDone();
        return;
      }

      try {
        const parsed = JSON.parse(data);

        if (provider.id === 'anthropic') {
          // Anthropic streaming format
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            callbacks.onToken(parsed.delta.text);
          }
        } else {
          // OpenAI-compatible streaming format
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta;

          // Text content
          if (delta?.content) {
            callbacks.onToken(delta.content);
          }

          // Tool calls
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.index !== undefined) {
                if (!toolCallsBuffer[tc.index]) {
                  toolCallsBuffer[tc.index] = {
                    id: tc.id || `call_${Date.now()}_${tc.index}`,
                    type: 'function',
                    function: {
                      name: tc.function?.name || '',
                      arguments: tc.function?.arguments || '',
                    },
                  };
                } else {
                  if (tc.function?.arguments) {
                    toolCallsBuffer[tc.index].function.arguments += tc.function.arguments;
                  }
                  if (tc.id) {
                    toolCallsBuffer[tc.index].id = tc.id;
                  }
                  if (tc.function?.name) {
                    toolCallsBuffer[tc.index].function.name = tc.function.name;
                  }
                }
              }
            }
          }
        }
      } catch {
        // Not JSON, skip
      }
    }
  }

  callbacks.onDone();
}

export async function chat(
  messages: ChatMessage[],
  opts?: { model?: string; maxTokens?: number }
): Promise<{ content: string; toolCalls?: ToolCall[] }> {
  const { providerId, modelId } = resolveModel(opts?.model);
  const provider = PROVIDERS[providerId];

  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const apiKey = getApiKey(providerId);
  if (providerId !== 'ollama' && !apiKey) {
    throw new Error(`No API key for ${provider.name}`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    if (provider.id === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  const allMessages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  const body: any = {
    model: modelId,
    messages: allMessages,
    max_tokens: opts?.maxTokens || 4096,
  };

  if (provider.id !== 'anthropic') {
    body.tools = getToolDefinitions();
    body.tool_choice = 'auto';
  }

  const url = provider.id === 'anthropic'
    ? `${provider.baseUrl}/messages`
    : `${provider.baseUrl}/chat/completions`;

  if (provider.id === 'anthropic') {
    const systemMsg = allMessages.find(m => m.role === 'system');
    body.system = systemMsg?.content;
    body.messages = allMessages.filter(m => m.role !== 'system');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${provider.name} API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const result = await response.json() as any;

  if (provider.id === 'anthropic') {
    return {
      content: result.content?.[0]?.text || '',
    };
  }

  const choice = result.choices?.[0];
  return {
    content: choice?.message?.content || '',
    toolCalls: choice?.message?.tool_calls,
  };
}
