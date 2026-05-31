export type ComputerUseBackendId = "windows-native" | "macos-native" | "linux-native" | "simulated";

export interface BackendInfo {
  id: ComputerUseBackendId;
  label: string;
  available: boolean;
  experimental: boolean;
  remediation?: string;
}

export type ComputerUseState = "stopped" | "running" | "unavailable";

export interface DesktopWindow {
  id: string;
  processName: string;
  title: string;
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface ComputerUseStatus {
  state: ComputerUseState;
  backend: ComputerUseBackendId;
  backendLabel: string;
  experimental: boolean;
  startedAt?: string;
  lastError?: string;
  remediation?: string;
  running: boolean;
}

export interface ScreenshotResult {
  width: number;
  height: number;
  mimeType: string;
  base64: string;
  backend: ComputerUseBackendId;
  capturedAt: string;
  windowId?: string;
}

export interface ActionResult {
  ok: boolean;
  backend: ComputerUseBackendId;
  message: string;
}
