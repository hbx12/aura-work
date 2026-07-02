import { useState, useCallback } from 'react';

export interface Session {
  id: string;
  projectPath: string;
  createdAt: string;
}

function makeSession(projectPath: string): Session {
  return {
    id: `session-${Date.now()}`,
    projectPath,
    createdAt: new Date().toISOString(),
  };
}

export function useSession(projectPath: string) {
  const [session, setSession] = useState<Session>(() => makeSession(projectPath));

  const createSession = useCallback(() => {
    const newSession = makeSession(projectPath);
    setSession(newSession);
    return newSession;
  }, [projectPath]);

  return { session, createSession };
}
