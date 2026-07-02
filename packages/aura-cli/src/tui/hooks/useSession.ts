import { useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create session immediately on mount
  useEffect(() => {
    if (!session) {
      const newSession: Session = {
        id: sessionId || randomUUID(),
        name: `session-${Date.now()}`
      };
      setSession(newSession);
    }
  }, [sessionId]);

  const createSession = useCallback(async () => {
    const newSession: Session = {
      id: randomUUID(),
      name: `session-${Date.now()}`
    };
    setSession(newSession);
    return newSession;
  }, []);

  const sendMessage = useCallback(async (content: string, model?: string) => {
    // This is handled by useStream now
  }, []);

  return {
    session,
    messages,
    sendMessage,
    createSession,
    loading,
    error
  };
}
