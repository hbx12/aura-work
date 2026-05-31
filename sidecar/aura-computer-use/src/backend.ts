import { platform } from "node:os";
import type { BackendInfo, ComputerUseBackendId } from "./types.js";

export async function detectBackend(): Promise<BackendInfo> {
  const p = platform();
  if (p === "win32") {
    return {
      id: "windows-native",
      label: "Windows desktop automation (experimental)",
      available: true,
      experimental: true,
    };
  }
  if (p === "darwin") {
    return {
      id: "macos-native",
      label: "macOS desktop automation (experimental)",
      available: true,
      experimental: true,
      remediation:
        "Grant Screen Recording and Accessibility permissions to Terminal/Node when prompted.",
    };
  }
  if (p === "linux") {
    return {
      id: "linux-native",
      label: "Linux desktop automation (experimental — requires X11 tools)",
      available: true,
      experimental: true,
      remediation: "Install scrot and xdotool for full automation on X11 sessions.",
    };
  }
  return {
    id: "simulated",
    label: "Simulated desktop (unsupported platform)",
    available: true,
    experimental: true,
  };
}

export function backendId(): ComputerUseBackendId {
  const p = platform();
  if (p === "win32") return "windows-native";
  if (p === "darwin") return "macos-native";
  if (p === "linux") return "linux-native";
  return "simulated";
}
