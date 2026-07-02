import { describe, it, expect } from 'vitest';
import { loadConfig, updateConfig } from '../src/core/config.js';

describe('Config', () => {
  it('should load default config', () => {
    const config = loadConfig();
    expect(config).toBeDefined();
    expect(config.agentUrl).toBe('http://127.0.0.1:47821');
  });

  it('should update config values', () => {
    const updated = updateConfig({ theme: 'test-theme' });
    expect(updated.theme).toBe('test-theme');
  });
});
