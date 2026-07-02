import { useState, useCallback, useRef } from 'react';
import { chatStream } from '../../core/ai.js';

interface StreamOptions {
  model?: string;
  projectPath?: string;
  sessionId?: string;
  onToken?: (token: string) => void;
  onToolCall?: (name: string, args: any) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function useStream() {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Array<{ role: string; content: string }>>([]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStreaming(false);
  }, []);

  const send = useCallback(async (message: string, options: StreamOptions) => {
    const { model, projectPath, sessionId, onToken, onToolCall, onComplete, onError } = options;

    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      // Add user message to history
      messagesRef.current.push({ role: 'user', content: message });

      await chatStream(messagesRef.current, {
        model,
        projectPath,
        sessionId,
        signal: abortRef.current.signal,
        onToken: (token) => {
          onToken?.(token);
        },
        onToolCall: (name, args) => {
          onToolCall?.(name, args);
          // Add tool call to history
          messagesRef.current.push({
            role: 'assistant',
            content: `Using tool: ${name}`,
          });
        },
        onComplete: (fullResponse) => {
          // Add assistant response to history
          messagesRef.current.push({ role: 'assistant', content: fullResponse });
          onComplete?.();
        },
        onError: (err) => {
          onError?.(err);
        },
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError?.(err.message || 'Unknown error');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, []);

  return { streaming, cancel, send };
}


