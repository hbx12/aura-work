import { spawn } from "node:child_process";
import type { BackendInfo } from "./backend.js";
import { winPathToWsl } from "./backend.js";
import { getMount } from "./mounts.js";
import { redactSecrets, truncateOutput } from "./redact.js";
import type { ExecRequest, ExecResult } from "./types.js";

const DEFAULT_TIMEOUT_MS = 120_000;

export function isUnsafeHostExecutionAllowed(): boolean {
  return process.env.AURA_ALLOW_UNSAFE_HOST_EXECUTION === "1";
}

const ALLOWED_ENV_KEYS = [
  "PATH",
  "PATHEXT",
  "SystemRoot",
  "WINDIR",
  "HOME",
  "USER",
  "USERNAME",
  "USERPROFILE",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "SHELL",
  "TMP",
  "TEMP",
  "TMPDIR",
  "WSLENV",
  "WSL_DISTRO_NAME",
] as const;

const SENSITIVE_ENV_PATTERN = /(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTH)/i;

function isAllowedEnvKey(key: string): boolean {
  if (SENSITIVE_ENV_PATTERN.test(key)) return false;
  return (ALLOWED_ENV_KEYS as readonly string[]).includes(key);
}

function sandboxEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { AURA_VM: "1" };
  for (const key of ALLOWED_ENV_KEYS) {
    if (!isAllowedEnvKey(key)) continue;
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  return env;
}

function runProcess(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ exitCode: number | null; stdout: string; stderr: string; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: sandboxEnv(),
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2000);
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: killed ? null : code,
        stdout,
        stderr: killed ? `${stderr}\nCommand timed out after ${timeoutMs}ms` : stderr,
        durationMs: Date.now() - started,
      });
    });
  });
}

async function execWsl(
  command: string,
  hostCwd: string,
  timeoutMs: number,
): Promise<{ exitCode: number | null; stdout: string; stderr: string; durationMs: number }> {
  const wslCwd = winPathToWsl(hostCwd);
  const escaped = command.replace(/'/g, `'\\''`);
  const script = `cd '${wslCwd}' && ${escaped}`;
  return runProcess("wsl", ["-e", "bash", "-lc", script], hostCwd, timeoutMs);
}

async function execSandbox(
  command: string,
  hostCwd: string,
  timeoutMs: number,
): Promise<{ exitCode: number | null; stdout: string; stderr: string; durationMs: number }> {
  if (!isUnsafeHostExecutionAllowed()) {
    throw new Error(
      "UNSAFE host process execution is disabled. Enable WSL2 or another isolated backend, or set AURA_ALLOW_UNSAFE_HOST_EXECUTION=1 for local development only.",
    );
  }
  console.warn("[aura-vm-helper] UNSAFE host process execution — development only");
  if (process.platform === "win32") {
    return runProcess("cmd.exe", ["/d", "/s", "/c", command], hostCwd, timeoutMs);
  }
  return runProcess("bash", ["-lc", command], hostCwd, timeoutMs);
}

export async function execCommand(
  backend: BackendInfo,
  req: ExecRequest,
): Promise<ExecResult> {
  const mount = getMount(req.projectId);
  if (!mount) {
    throw new Error(`Project ${req.projectId} is not mounted`);
  }

  const cwd = req.cwd ?? mount.hostPath;
  const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let raw: { exitCode: number | null; stdout: string; stderr: string; durationMs: number };

  if (backend.id === "wsl" && process.platform === "win32") {
    raw = await execWsl(req.command, cwd, timeoutMs);
  } else if (backend.id === "process-sandbox") {
    raw = await execSandbox(req.command, cwd, timeoutMs);
  } else if (backend.available) {
    throw new Error(
      `Isolated backend ${backend.label} is not ready. ${backend.remediation ?? "Install and verify the signed workspace image."}`,
    );
  } else {
    throw new Error(
      `Workspace unavailable: ${backend.label}. ${backend.remediation ?? "Enable an isolated execution backend."}`,
    );
  }

  const stdoutRedacted = redactSecrets(raw.stdout);
  const stderrRedacted = redactSecrets(raw.stderr);
  const out = truncateOutput(stdoutRedacted);
  const err = truncateOutput(stderrRedacted, 8000);

  return {
    exitCode: raw.exitCode,
    stdout: out.text,
    stderr: err.text,
    durationMs: raw.durationMs,
    truncated: out.truncated || err.truncated,
    backend: backend.id === "wsl" ? "wsl" : "process-sandbox",
  };
}

export { isUnsafeHostExecutionAllowed as allowUnsafeHostExecution };
