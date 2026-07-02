import { useState, useCallback } from 'react';

export interface Session {
  id: string;
  projectPath: string;
  createdAt: string;
}

export function useSession(projectPath: string) {
  const [session, setSession] = useState<Session | null>(null);

  const createSession = useCallback(() => {
    const newSession: Session = {
      id: `session-${Date.now()}`,
      projectPath,
      createdAt: new Date().toISOString(),
    };
    setSession(newSession);
    return newSession;
  }, [projectPath]);

  if (!session) {
    createSession();
  }

  return { session: session!, createSession };
}
