import { useState, useEffect } from 'react';
import { loadConfig, type AuraConfig } from '../../core/config.js';

export type ModelState = 'not_configured' | 'env_detected' | 'configured' | 'local_available';

export interface ModelInfo {
  state: ModelState;
  provider: string;
  model: string;
  display: string;
  hasApiKey: boolean;
  detectedEnvKey: string | null;
}

export interface ConfigInfo {
  config: AuraConfig;
  model: ModelInfo;
  projectPath: string;
  projectName: string;
  agent: string;
  mode: string;
}

function detectModelState(config: AuraConfig): ModelInfo {
  const envKeys: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    groq: 'GROQ_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    google: 'GOOGLE_API_KEY',
  };

  // Check config for API keys
  const configKeys = config.apiKeys || {};
  const hasConfigKey = Object.keys(configKeys).length > 0;
  const configProvider = hasConfigKey ? Object.keys(configKeys)[0] : null;

  // Check env vars
  let detectedEnvKey: string | null = null;
  let detectedProvider: string | null = null;
  for (const [provider, envKey] of Object.entries(envKeys)) {
    if (process.env[envKey]) {
      detectedEnvKey = envKey;
      detectedProvider = provider;
      break;
    }
  }

  // Check if model is explicitly configured
  if (config.defaultModel && config.defaultProvider) {
    const hasKey = configKeys[config.defaultProvider] || process.env[envKeys[config.defaultProvider] || ''];
    if (hasKey) {
      return {
        state: 'configured',
        provider: config.defaultProvider as string,
        model: config.defaultModel,
        display: `${config.defaultProvider}/${config.defaultModel}`,
        hasApiKey: true,
        detectedEnvKey: null,
      };
    }
  }

  // Config key exists
  if (hasConfigKey && configProvider) {
    return {
      state: 'configured',
      provider: configProvider,
      model: configKeys[configProvider] ? (config.defaultModel || 'default') : 'not set',
      display: config.defaultModel ? `${configProvider}/${config.defaultModel}` : configProvider,
      hasApiKey: true,
      detectedEnvKey: null,
    };
  }

  // Env key detected
  if (detectedEnvKey && detectedProvider) {
    return {
      state: 'env_detected',
      provider: detectedProvider,
      model: config.defaultModel || 'not set',
      display: config.defaultModel ? `${detectedProvider}/${config.defaultModel}` : `${detectedProvider} (env)`,
      hasApiKey: false,
      detectedEnvKey,
    };
  }

  // Check Ollama
  // We'll assume Ollama might be available locally
  return {
    state: 'not_configured',
    provider: '',
    model: '',
    display: 'not set',
    hasApiKey: false,
    detectedEnvKey: null,
  };
}

export function useConfig(): ConfigInfo {
  const [info, setInfo] = useState<ConfigInfo>(() => {
    const config = loadConfig();
    const model = detectModelState(config);
    const projectPath = process.cwd();
    const projectName = projectPath.split(/[\\/]/).pop() || 'project';
    return {
      config,
      model,
      projectPath,
      projectName,
      agent: (config.defaultAgent as string) || 'build',
      mode: (config.defaultMode as string) || 'build',
    };
  });

  return info;
}
