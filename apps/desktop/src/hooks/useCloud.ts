import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
  CloudAccountStatus,
  CloudDeviceInfo,
  CloudRegisterResult,
  CloudSyncStatus,
} from "@aura-os/shared";

export function useCloud() {
  const [status, setStatus] = useState<CloudAccountStatus | null>(null);
  const [devices, setDevices] = useState<CloudDeviceInfo[]>([]);
  const [syncHelper, setSyncHelper] = useState<CloudSyncStatus | null>(null);
  const [usage, setUsage] = useState<any | null>(null);
  const [releaseInfo, setReleaseInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await invoke<CloudAccountStatus>("get_cloud_status");
      setStatus(s);
      setSyncHelper(s.syncHelper ?? null);
      if (s.signedIn) {
        const d = await invoke<CloudDeviceInfo[]>("cloud_list_devices");
        setDevices(d);
      } else {
        setDevices([]);
      }
      try {
        setUsage(await invoke("get_aura_cloud_usage"));
      } catch {
        setUsage(null);
      }
      try {
        setReleaseInfo(await invoke("get_latest_aura_work_release"));
      } catch {
        setReleaseInfo(null);
      }
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const register = useCallback(
    async (email: string, password: string, displayName?: string, serverUrl?: string) => {
      setLoading(true);
      try {
        const result = await invoke<CloudRegisterResult>("cloud_register", {
          input: { email, password, displayName, serverUrl },
        });
        setStatus(result.status);
        await refresh();
        return result;
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const login = useCallback(
    async (email: string, password: string, serverUrl?: string) => {
      setLoading(true);
      try {
        const s = await invoke<CloudAccountStatus>("cloud_login", {
          input: { email, password, serverUrl },
        });
        setStatus(s);
        await refresh();
        return s;
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const s = await invoke<CloudAccountStatus>("cloud_logout");
      setStatus(s);
      setDevices([]);
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const setupRecovery = useCallback(
    async (recoveryKey: string) => {
      setLoading(true);
      try {
        const s = await invoke<CloudAccountStatus>("cloud_setup_recovery", {
          input: { recoveryKey },
        });
        setStatus(s);
        return s;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const setSyncEnabled = useCallback(
    async (enabled: boolean) => {
      setLoading(true);
      try {
        const s = await invoke<CloudAccountStatus>("cloud_set_sync_enabled", { enabled });
        setStatus(s);
        await refresh();
        return s;
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const syncNow = useCallback(async () => {
    setLoading(true);
    try {
      const s = await invoke<CloudAccountStatus>("cloud_sync_now");
      setStatus(s);
      await refresh();
      return s;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const createPairing = useCallback(async () => {
    setLoading(true);
    try {
      return await invoke<{ code: string; expiresAt: string; qrPayload: string }>("cloud_create_pairing");
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeDevice = useCallback(
    async (deviceId: string) => {
      setLoading(true);
      try {
        await invoke("cloud_revoke_device", { deviceId });
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const remoteDispatch = useCallback(
    async (targetDeviceId: string, projectId: string, prompt: string) => {
      setLoading(true);
      try {
        return await invoke("cloud_remote_dispatch", {
          input: { targetDeviceId, projectId, prompt },
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const inspectServer = useCallback(async () => {
    setLoading(true);
    try {
      return await invoke("cloud_inspect_server");
    } finally {
      setLoading(false);
    }
  }, []);

  const startSyncHelper = useCallback(async () => {
    setLoading(true);
    try {
      const s = await invoke<CloudSyncStatus>("start_cloud_sync");
      setSyncHelper(s);
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopSyncHelper = useCallback(async () => {
    setLoading(true);
    try {
      const s = await invoke<CloudSyncStatus>("stop_cloud_sync");
      setSyncHelper(s);
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const startDeviceLogin = useCallback(async () => {
    return invoke<any>("start_aura_cloud_device_login");
  }, []);

  const completeDeviceLogin = useCallback(async () => {
    return invoke<any>("complete_aura_cloud_device_login");
  }, []);

  return {
    status,
    devices,
    syncHelper,
    usage,
    releaseInfo,
    loading,
    error,
    refresh,
    register,
    login,
    logout,
    setupRecovery,
    setSyncEnabled,
    syncNow,
    createPairing,
    revokeDevice,
    remoteDispatch,
    inspectServer,
    startSyncHelper,
    stopSyncHelper,
    startDeviceLogin,
    completeDeviceLogin,
  };
}
