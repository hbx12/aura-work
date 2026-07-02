import { useState, useEffect, useCallback } from 'react';
import { loadConfig } from '../../core/config.js';
import { getAgentClient } from '../../core/agent.js';
import { getRuntime } from '../../core/runtime.js';
import { randomUUID } from 'crypto';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  parts?: Array<{ type: string; text?: string }>;
  model?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

interface Session {
  id: string;
  name?: string;
  model?: string;
  projectId?: string;
}

interface UseSessionOptions {
  sessionId?: string;
  dir?: string;
}

export function useSession({ sessionId, dir }: UseSessionOptions) {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load session
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        if (sessionId) {
          // Load existing session from agent
          const config = loadConfig();
          const agent = getAgentClient();
          const runtime = await getRuntime();

          const response = await agent.sendChat(
            [{ role: 'user', content: `get session ${sessionId}` }],
            dir || process.cwd(),
            'GET_SESSION'
          );

          // Parse session from response
          // For now, create a placeholder
          setSession({ id: sessionId });
        }

        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }

    load();
  }, [sessionId, dir]);

  const createSession = useCallback(async () => {
    const newSession: Session = {
      id: randomUUID(),
      name: `session-${Date.now()}`
    };
    setSession(newSession);
    return newSession;
  }, []);

  const sendMessage = useCallback(async (content: string, model?: string) => {
    if (!session) return;

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const config = loadConfig();
      const agent = getAgentClient();
      const runtime = await getRuntime();

      const response = await agent.sendChat(
        [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        dir || process.cwd(),
        model
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content || '',
        timestamp: new Date().toISOString(),
        model: response.model,
        usage: response.usage ? {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens
        } : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        role: 'system',
        content: `Error: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [session, messages, dir]);

  return {
    session,
    messages,
    sendMessage,
    createSession,
    loading,
    error
  };
}
