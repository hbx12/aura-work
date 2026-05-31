import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import type { BridgeClientRecord, BridgePairingResult, BridgeStatus } from "@aura-os/shared";

export function useBridge() {
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [clients, setClients] = useState<BridgeClientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, cl] = await Promise.all([
        invoke<BridgeStatus>("get_bridge_status"),
        invoke<BridgeClientRecord[]>("list_bridge_clients"),
      ]);
      setStatus(st);
      setClients(cl);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const st = await invoke<BridgeStatus>("start_bridge");
    setStatus(st);
    await refresh();
    return st;
  }, [refresh]);

  const stop = useCallback(async () => {
    setError(null);
    const st = await invoke<BridgeStatus>("stop_bridge");
    setStatus(st);
    return st;
  }, []);

  const createPairing = useCallback(async () => {
    setError(null);
    return invoke<BridgePairingResult>("create_bridge_pairing");
  }, []);

  const revokeClient = useCallback(
    async (clientId: string) => {
      setError(null);
      const cl = await invoke<BridgeClientRecord[]>("revoke_bridge_client", { clientId });
      setClients(cl);
      await refresh();
    },
    [refresh],
  );

  return {
    status,
    clients,
    loading,
    error,
    refresh,
    start,
    stop,
    createPairing,
    revokeClient,
  };
}
