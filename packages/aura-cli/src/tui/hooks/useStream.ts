import { useState, useCallback, useRef } from 'react';
import { loadConfig } from '../../core/config.js';
import { chatStream, type ChatMessage } from '../../core/ai.js';

interface UseStreamOptions {
  dir?: string;
}

export function useStream({ dir }: UseStreamOptions) {
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const messagesRef = useRef<ChatMessage[]>([]);

  const streamMessage = useCallback(async (
    content: string,
    sessionId?: string,
    model?: string
  ) => {
    setStreaming(true);
    setCurrentResponse('');

    // Add user message to history
    messagesRef.current.push({ role: 'user', content });

    try {
      const config = loadConfig();
      const selectedModel = model || `${config.defaultProvider || 'openai'}/${config.defaultModel || 'gpt-4o'}`;

      let fullResponse = '';

      await chatStream(
        messagesRef.current,
        {
          onToken: (token) => {
            fullResponse += token;
            setCurrentResponse(fullResponse);
          },
          onToolCall: (toolCall) => {
            fullResponse += `\n\n🔧 Running: ${toolCall.function.name}...`;
            setCurrentResponse(fullResponse);
          },
          onToolResult: (result) => {
            if (result.success) {
              // Don't show full tool output to user, just confirmation
              fullResponse += ` ✓`;
            } else {
              fullResponse += ` ✗ ${result.result}`;
            }
            setCurrentResponse(fullResponse);
          },
          onDone: () => {
            // Add assistant message to history
            if (fullResponse) {
              messagesRef.current.push({ role: 'assistant', content: fullResponse });
            }
            setStreaming(false);
          },
          onError: (error) => {
            const errorMsg = error.message;
            setCurrentResponse(`⚠ ${errorMsg}`);
            setStreaming(false);
          },
        },
        { model: selectedModel }
      );

      return fullResponse;
    } catch (err: any) {
      setStreaming(false);
      const errorMsg = `Error: ${err?.message || 'Unknown error'}`;
      setCurrentResponse(errorMsg);
      return errorMsg;
    }
  }, [dir]);

  const clearHistory = useCallback(() => {
    messagesRef.current = [];
    setCurrentResponse('');
  }, []);

  return {
    streaming,
    currentResponse,
    streamMessage,
    clearHistory
  };
}
