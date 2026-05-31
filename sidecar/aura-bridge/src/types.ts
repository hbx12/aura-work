export type BridgeClientType =
  | "chrome-extension"
  | "office-word"
  | "office-excel"
  | "office-powerpoint"
  | "cli";
export interface BridgeClientConfig {
  id: string;
  name: string;
  clientType: string;
  sessionToken: string;
  projectId?: string | null;
  pairedAt: string;
}

export interface BridgeConfig {
  internalSecret: string;
  clients: BridgeClientConfig[];
}

export interface BridgeStatus {
  state: "stopped" | "starting" | "running" | "unavailable";
  clientCount: number;
  connectedClients: number;
  startedAt?: string;
  lastError?: string;
  remediation?: string;
  running: boolean;
}

export type HelperState = BridgeStatus["state"];
