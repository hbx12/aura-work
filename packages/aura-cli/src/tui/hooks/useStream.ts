import { useState, useCallback } from 'react';
import { loadConfig } from '../../core/config.js';
import { getAgentClient } from '../../core/agent.js';
import { getRuntime } from '../../core/runtime.js';

interface UseStreamOptions {
  dir?: string;
}

export function useStream({ dir }: UseStreamOptions) {
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');

  const streamMessage = useCallback(async (
    content: string,
    sessionId?: string,
    model?: string
  ) => {
    setStreaming(true);
    setCurrentResponse('');

    try {
      const config = loadConfig();
      const agent = getAgentClient();
      const runtime = await getRuntime();

      // Use the streaming endpoint
      const baseUrl = config.agentUrl || 'http://127.0.0.1:47821';
      const response = await fetch(`${baseUrl}/task/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sidecar-Auth': config.agentAuthToken || 'aura'
        },
        body: JSON.stringify({
          prompt: content,
          context: {
            projectId: runtime.project?.id,
            sessionId,
            model,
            workingDirectory: dir || process.cwd()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Agent error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk' || data.type === 'text') {
                setCurrentResponse(prev => prev + (data.content || data.text || ''));
              } else if (data.type === 'done') {
                break;
              }
            } catch {
              // Not JSON, skip
            }
          }
        }
      }

      setStreaming(false);
      return currentResponse;
    } catch (err: any) {
      setStreaming(false);
      // Return error message instead of throwing to prevent TUI crash
      const errorMsg = err?.code === 'ECONNREFUSED' || err?.message?.includes('fetch')
        ? '⚠ Agent offline — start sidecar first: `aura-work agent start`'
        : `Error: ${err?.message || 'Unknown error'}`;
      setCurrentResponse(errorMsg);
      return errorMsg;
    }
  }, [dir, currentResponse]);

  return {
    streaming,
    currentResponse,
    streamMessage
  };
}
