import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { VmBackendId } from "./types.js";

const execFileAsync = promisify(execFile);

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
    return {
      id: "process-sandbox",
      label: "Process sandbox (Hyper-V/WSL unavailable)",
      available: true,
      remediation:
        "Enable WSL2 or Hyper-V for full VM isolation. Shell runs in a restricted process sandbox until then.",
    };
  }

  if (process.platform === "linux") {
    const kvmOk = await probe("test", ["-e", "/dev/kvm"]);
    if (kvmOk) {
      return {
        id: "kvm",
        label: "KVM/QEMU (image not bundled in dev)",
        available: false,
        remediation:
          "KVM detected but bundled image is not installed. Using process sandbox. Full VM ships with installers.",
      };
    }
  }

  if (process.platform === "darwin") {
    return {
      id: "apple-vz",
      label: "Apple Virtualization (image not bundled in dev)",
      available: false,
      remediation:
        "Using process sandbox in development. Full Apple Virtualization backend ships with macOS installers.",
    };
  }

  return {
    id: "process-sandbox",
    label: "Process sandbox",
    available: true,
    remediation: "Hypervisor unavailable — commands run in an isolated process with project cwd.",
  };
}

export function winPathToWsl(winPath: string): string {
  const normalized = winPath.replace(/\\/g, "/");
  const match = /^([A-Za-z]):\/(.*)$/.exec(normalized);
  if (!match) return normalized;
  const drive = match[1].toLowerCase();
  const rest = match[2];
  return `/mnt/${drive}/${rest}`;
}
