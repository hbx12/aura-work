import { useState, useEffect, useCallback } from 'react';
import { randomUUID } from 'crypto';

interface Session {
  id: string;
  name?: string;
  model?: string;
  projectId?: string;
}

interface CreateSessionOptions {
  projectPath?: string;
}

export function useSession() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  const createSession = useCallback(async (options?: CreateSessionOptions) => {
    const newSession: Session = {
      id: randomUUID(),
      name: `session-${Date.now()}`
    };
    setActiveSession(newSession);
    return newSession;
  }, []);

  return {
    activeSession,
    createSession,
  };
}
