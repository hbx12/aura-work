import { useState, useEffect } from 'react';
import { loadConfig, type AuraConfig } from '../../core/config.js';

export function useConfig() {
  const [config, setConfig] = useState<AuraConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig()
      .then(c => { setConfig(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { config, loading };
}
