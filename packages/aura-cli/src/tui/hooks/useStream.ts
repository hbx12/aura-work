import { useState, useCallback, useRef } from 'react';
import { chatStream, type ChatMessage } from '../../core/ai.js';

interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolCall?: (name: string, args: any) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

interface StreamOptions {
  model?: string;
  projectPath?: string;
  sessionId?: string;
}

export function useStream() {
  const [streaming, setStreaming] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  const cancel = useCallback(() => {
    setStreaming(false);
  }, []);

  const send = useCallback(async (message: string, callbacks: StreamCallbacks, options?: StreamOptions) => {
    setStreaming(true);

    try {
      // Add user message to history
      messagesRef.current.push({ role: 'user', content: message });

      // Stream the response using the ai module
      let fullResponse = '';
      await chatStream(messagesRef.current, {
        onToken: (token) => {
          fullResponse += token;
          callbacks.onToken(token);
        },
        onToolCall: callbacks.onToolCall ? async (toolCall) => {
          callbacks.onToolCall!(toolCall.function?.name || 'unknown', toolCall.function?.arguments || '');
          return { id: toolCall.id, result: 'Tool executed' };
        } : undefined,
        onDone: () => {
          // Add assistant response to history
          messagesRef.current.push({ role: 'assistant', content: fullResponse });
          callbacks.onComplete();
          setStreaming(false);
        },
        onError: (err) => {
          callbacks.onError(err.message || String(err));
          setStreaming(false);
        },
      }, { model: options?.model });
    } catch (err: any) {
      callbacks.onError(err.message || String(err));
      setStreaming(false);
    }
  }, []);

  return { streaming, cancel, send };
}
