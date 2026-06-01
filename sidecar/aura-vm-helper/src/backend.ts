import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { VmBackendId } from "./types.js";

const execFileAsync = promisify(execFile);
const allowUnsafeHostExecution = process.env.AURA_ALLOW_UNSAFE_HOST_EXECUTION === "1";

export interface BackendInfo {
  id: VmBackendId;
  label: string;
  available: boolean;
  remediation?: string;
}

async function probe(command: string, args: string[]): Promise<boolean> {
  try {
    await execFileAsync(command, args, { timeout: 5000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function unsafeFallback(remediation: string): BackendInfo {
  return {
    id: "process-sandbox",
    label: allowUnsafeHostExecution
      ? "UNSAFE host process execution (development override enabled)"
      : "Host process execution disabled",
    available: allowUnsafeHostExecution,
    remediation: allowUnsafeHostExecution
      ? "Development override is enabled. Commands execute on the host OS. Never enable this for production or sensitive workspaces."
      : `${remediation} For local development only, explicitly set AURA_ALLOW_UNSAFE_HOST_EXECUTION=1 to accept host execution risk.`,
  };
}

export async function detectBackend(): Promise<BackendInfo> {
  if (process.platform === "win32") {
    const wslOk = await probe("wsl", ["--status"]);
    if (wslOk) {
      return {
        id: "wsl",
        label: "WSL2 Linux workspace",
        available: true,
      };
    }
    return unsafeFallback("Enable WSL2 or install a supported isolated execution backend.");
  }

  if (process.platform === "linux") {
    const kvmOk = await probe("test", ["-e", "/dev/kvm"]);
    if (kvmOk) {
      return {
        id: "kvm",
        label: "KVM/QEMU backend detected but not configured",
        available: false,
        remediation: "Install and verify the signed Aura workspace image before enabling shell execution.",
      };
    }
    return unsafeFallback("Install KVM/QEMU with the signed Aura workspace image.");
  }

  if (process.platform === "darwin") {
    return {
      id: "apple-vz",
      label: "Apple Virtualization backend not configured",
      available: false,
      remediation: "Install and verify the signed Aura workspace image before enabling shell execution.",
    };
  }

  return unsafeFallback("Install a supported isolated execution backend.");
}

export function winPathToWsl(winPath: string): string {
  const normalized = winPath.replace(/\\/g, "/");
  const match = /^([A-Za-z]):\/(.*)$/.exec(normalized);
  if (!match) return normalized;
  const drive = match[1].toLowerCase();
  const rest = match[2];
  return `/mnt/${drive}/${rest}`;
}
