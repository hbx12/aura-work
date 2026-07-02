import { useState, useCallback, useRef } from 'react';
import { chatStream, type ChatMessage } from '../../core/ai.js';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolCall?: (name: string, args: any) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

export function useStream() {
  const [streaming, setStreaming] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  const cancel = useCallback(() => {
    setStreaming(false);
  }, []);

  const send = useCallback(async (message: string, callbacks: StreamCallbacks, model?: string) => {
    setStreaming(true);
    messagesRef.current.push({ role: 'user', content: message });

    let fullResponse = '';
    await chatStream(messagesRef.current, {
      onToken: (token) => {
        fullResponse += token;
        callbacks.onToken(token);
      },
      onDone: () => {
        messagesRef.current.push({ role: 'assistant', content: fullResponse });
        callbacks.onComplete();
        setStreaming(false);
      },
      onError: (err) => {
        callbacks.onError(err.message || String(err));
        setStreaming(false);
      },
    }, { model });
  }, []);

  return { streaming, cancel, send };
}
