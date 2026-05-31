import type { CloudSyncConfig, EncryptedSyncEnvelope } from "./types.js";

export async function cloudFetch<T>(
  config: CloudSyncConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${config.serverUrl.replace(/\/$/, "")}${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  const body = (await resp.json()) as T & { error?: string; message?: string };
  if (!resp.ok) {
    const msg = body.error ?? body.message ?? `Cloud error ${resp.status}`;
    throw new Error(msg);
  }
  return body;
}

export async function pushEnvelopes(
  config: CloudSyncConfig,
  envelopes: EncryptedSyncEnvelope[],
): Promise<{ saved: { id: string; fingerprint: string }[] }> {
  return cloudFetch(config, "/sync/push", {
    method: "POST",
    body: JSON.stringify({ envelopes }),
  });
}

export async function pullEnvelopes(
  config: CloudSyncConfig,
  since?: string,
): Promise<{ envelopes: EncryptedSyncEnvelope[] }> {
  const q = since ? `?since=${encodeURIComponent(since)}` : "";
  return cloudFetch(config, `/sync/pull${q}`);
}

export async function sendHeartbeat(config: CloudSyncConfig): Promise<void> {
  await cloudFetch(config, "/devices/heartbeat", {
    method: "POST",
    body: JSON.stringify({ deviceId: config.deviceId }),
  });
}

export async function fetchPendingDispatch(config: CloudSyncConfig) {
  const q = `?deviceId=${encodeURIComponent(config.deviceId)}`;
  return cloudFetch<{ pending: { id: string; sourceDeviceId: string; ciphertext: string; nonce: string; createdAt: string }[] }>(
    config,
    `/dispatch/pending${q}`,
  );
}

export async function ackDispatch(
  config: CloudSyncConfig,
  dispatchId: string,
  patch: {
    status: string;
    failureReason?: string;
    responseCiphertext?: string;
    responseNonce?: string;
  },
): Promise<void> {
  await cloudFetch(config, `/dispatch/${dispatchId}/ack`, {
    method: "POST",
    body: JSON.stringify(patch),
  });
}

export async function checkCloudHealth(serverUrl: string): Promise<boolean> {
  try {
    const resp = await fetch(`${serverUrl.replace(/\/$/, "")}/health`);
    return resp.ok;
  } catch {
    return false;
  }
}
