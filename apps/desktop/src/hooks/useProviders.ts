import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { RoutingPolicy } from "@aura-os/shared";

export interface ProviderConfigPublic {
  providerId: string;
  displayName: string;
  enabled: boolean;
  hasSecret: boolean;
  baseUrl?: string | null;
  defaultModel?: string | null;
  manualModel?: string | null;
  validatedAt?: string | null;
  validationStatus: string;
  keyFingerprint?: string | null;
  authMode?: string | null;
}

export interface VaultStatus {
  unlocked: boolean;
  version: number;
  secretCount: number;
  deviceBound: boolean;
}

export interface ProviderModelPublic {
  id: string;
  displayName: string;
  enabled: boolean;
}

export function useProviders() {
  const [providers, setProviders] = useState<ProviderConfigPublic[]>([]);
  const [routingPolicy, setRoutingPolicyState] = useState<RoutingPolicy>("quality-first");
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, policy, vault] = await Promise.all([
        invoke<ProviderConfigPublic[]>("list_providers"),
        invoke<string>("get_routing_policy"),
        invoke<VaultStatus>("get_vault_status"),
      ]);
      setProviders(list);
      setRoutingPolicyState(policy as RoutingPolicy);
      setVaultStatus(vault);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateProvider = async (
    providerId: string,
    patch: Partial<{
      enabled: boolean;
      baseUrl: string | null;
      defaultModel: string | null;
      manualModel: string | null;
    }>,
  ) => {
    const list = await invoke<ProviderConfigPublic[]>("update_provider", {
      input: { providerId, ...patch },
    });
    setProviders(list);
  };

  const setProviderSecret = async (
    providerId: string,
    apiKey?: string | null,
    baseUrl?: string | null,
    authMode?: string | null,
  ) => {
    const list = await invoke<ProviderConfigPublic[]>("set_provider_secret", {
      input: { providerId, apiKey: apiKey ?? null, baseUrl: baseUrl ?? null, authMode: authMode ?? null },
    });
    setProviders(list);
    await refresh();
  };

  const clearProviderSecret = async (providerId: string) => {
    const list = await invoke<ProviderConfigPublic[]>("clear_provider_secret", { providerId });
    setProviders(list);
    await refresh();
  };

  const setRoutingPolicy = async (policy: RoutingPolicy) => {
    const saved = await invoke<string>("set_routing_policy", { policy });
    setRoutingPolicyState(saved as RoutingPolicy);
  };

  const validateProvider = async (providerId: string) => {
    const result = await invoke<{ valid: boolean; message?: string; status: string }>("validate_provider", {
      providerId,
    });
    await refresh();
    return result;
  };

  const listProviderModels = async (providerId: string) => {
    const models = await invoke<ProviderModelPublic[]>("list_provider_models", {
      providerId,
    });
    await refresh();
    return models;
  };

  const setProviderModelEnabled = async (providerId: string, modelId: string, enabled: boolean) => {
    await invoke("set_provider_model_enabled", {
      input: { providerId, modelId, enabled },
    });
  };

  const exportVault = async (password: string) => {
    return invoke<string>("export_vault", { password });
  };

  const importVault = async (password: string, dataBase64: string) => {
    const status = await invoke<VaultStatus>("import_vault", { password, dataBase64 });
    setVaultStatus(status);
    await refresh();
  };

  const fetchPricing = async () => invoke<{ updated: number; source: string; message?: string }>("fetch_pricing");

  return {
    providers,
    routingPolicy,
    vaultStatus,
    loading,
    error,
    refresh,
    updateProvider,
    setProviderSecret,
    clearProviderSecret,
    setRoutingPolicy,
    validateProvider,
    listProviderModels,
    setProviderModelEnabled,
    exportVault,
    importVault,
    fetchPricing,
  };
}
