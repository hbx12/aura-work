import { useState, useCallback } from 'react';

interface Session {
  id: string;
  name?: string;
  projectPath?: string;
  model?: string;
}

export function useSession() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  const createSession = useCallback(async (options?: { projectPath?: string; model?: string }) => {
    const session: Session = {
      id: `session-${Date.now()}`,
      projectPath: options?.projectPath,
      model: options?.model,
    };
    setActiveSession(session);
    return session;
  }, []);

  return { activeSession, createSession };
}
