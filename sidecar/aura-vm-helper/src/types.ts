export type VmBackendId = "wsl" | "process-sandbox" | "hyper-v" | "kvm" | "apple-vz";

export type VmState = "stopped" | "starting" | "running" | "unavailable";

export interface VmMount {
  projectId: string;
  hostPath: string;
  guestPath: string;
  mode: "read" | "read-write";
  mountedAt: string;
}

export interface VmStatus {
  state: VmState;
  backend: VmBackendId;
  backendLabel: string;
  imageVersion: string;
  mounts: VmMount[];
  startedAt?: string;
  lastError?: string;
  remediation?: string;
  running?: boolean;
}

export interface ExecRequest {
  projectId: string;
  command: string;
  timeoutMs?: number;
  cwd?: string;
}

export interface ExecResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  truncated: boolean;
  backend: VmBackendId;
}

export interface MountRequest {
  projectId: string;
  hostPath: string;
  mode: "read" | "read-write";
}
