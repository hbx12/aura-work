import type { MountRequest, VmMount } from "./types.js";
import { winPathToWsl } from "./backend.js";

const mounts = new Map<string, VmMount>();

export function listMounts(): VmMount[] {
  return [...mounts.values()];
}

export function mountProject(req: MountRequest): VmMount {
  const guestPath =
    process.platform === "win32" ? winPathToWsl(req.hostPath) : req.hostPath;
  const mount: VmMount = {
    projectId: req.projectId,
    hostPath: req.hostPath,
    guestPath,
    mode: req.mode,
    mountedAt: new Date().toISOString(),
  };
  mounts.set(req.projectId, mount);
  return mount;
}

export function getMount(projectId: string): VmMount | undefined {
  return mounts.get(projectId);
}

export function clearMounts(): void {
  mounts.clear();
}
