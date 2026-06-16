import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const bundleRoot = join(root, "bundle");
const token = randomBytes(32).toString("hex");
let shuttingDown = false;

const sidecars = [
  { id: "aura-agent", portEnv: "AURA_AGENT_PORT", expectedPort: 47821, port: 48921 },
  { id: "aura-vm-helper", portEnv: "AURA_VM_PORT", expectedPort: 47822, port: 48922 },
  { id: "aura-browser-helper", portEnv: "AURA_BROWSER_PORT", expectedPort: 47823, port: 48923 },
  { id: "aura-plugins-helper", portEnv: "AURA_PLUGINS_PORT", expectedPort: 47824, port: 48924 },
  { id: "aura-cloud-sync", portEnv: "AURA_CLOUD_SYNC_PORT", expectedPort: 47825, port: 48925 },
  { id: "aura-bridge", portEnv: "AURA_BRIDGE_PORT", expectedPort: 47826, port: 48926 },
  { id: "aura-computer-use", portEnv: "AURA_COMPUTER_USE_PORT", expectedPort: 47828, port: 48928 },
];

function assertFile(path, label) {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`Missing ${label}: ${path}`);
  }
  if (statSync(path).size === 0) {
    throw new Error(`Empty ${label}: ${path}`);
  }
}

function assertDirMissing(path, label) {
  if (existsSync(path)) {
    throw new Error(`${label} must not exist in the install bundle: ${path}`);
  }
}

function assertManifest() {
  const manifestPath = join(bundleRoot, "manifest.json");
  assertFile(manifestPath, "bundle manifest");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  if (manifest.nodeRuntime?.resourcePath !== "node") {
    throw new Error("bundle manifest points at the wrong Node runtime resource path.");
  }

  const expectedNodeExecutable = process.platform === "win32" ? "node/node.exe" : "node/bin/node";
  if (manifest.nodeRuntime?.executable !== expectedNodeExecutable) {
    throw new Error("bundle manifest points at the wrong Node runtime executable.");
  }

  for (const sidecar of sidecars) {
    const entry = manifest.sidecars?.find((item) => item.id === sidecar.id);
    if (!entry) throw new Error(`bundle manifest is missing ${sidecar.id}.`);
    if (entry.port !== sidecar.expectedPort) {
      throw new Error(`bundle manifest has the wrong port for ${sidecar.id}.`);
    }
    if (entry.resourcePath !== `sidecars/${sidecar.id}`) {
      throw new Error(`bundle manifest has the wrong resource path for ${sidecar.id}.`);
    }
    if (entry.entry !== `sidecars/${sidecar.id}/dist/index.js`) {
      throw new Error(`bundle manifest has the wrong entry for ${sidecar.id}.`);
    }
  }
}

function nodeRuntimePath() {
  return process.platform === "win32"
    ? join(bundleRoot, "node", "node.exe")
    : join(bundleRoot, "node", "bin", "node");
}

async function fetchHealth(port, withAuth) {
  const headers = withAuth ? { Authorization: `Bearer ${token}` } : {};
  return fetch(`http://127.0.0.1:${port}/health`, { headers });
}

async function waitForHealth(sidecar) {
  const deadline = Date.now() + 15_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetchHealth(sidecar.port, true);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `${sidecar.id} did not become healthy on port ${sidecar.port}: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

async function assertAuthRequired(sidecar) {
  const response = await fetchHealth(sidecar.port, false);
  if (response.status !== 401) {
    throw new Error(`${sidecar.id} health endpoint accepted an unauthenticated request.`);
  }
}

function childEnvironment(sidecar) {
  const env = { ...process.env };
  delete env.NODE_PATH;
  delete env.npm_config_prefix;
  delete env.npm_node_execpath;
  delete env.INIT_CWD;

  env.AURA_SIDECAR_AUTH_TOKEN = token;
  env[sidecar.portEnv] = String(sidecar.port);
  return env;
}

function startSidecar(node, sidecar) {
  const workdir = join(bundleRoot, "sidecars", sidecar.id);
  const entry = join(workdir, "dist", "index.js");
  assertFile(entry, `${sidecar.id} entry`);
  assertDirMissing(join(workdir, "node_modules"), `${sidecar.id} node_modules`);

  const child = spawn(node, ["dist/index.js"], {
    cwd: workdir,
    env: childEnvironment(sidecar),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.once("exit", (code, signal) => {
    if (shuttingDown) return;
    if (code !== null && code !== 0) {
      console.error(`[test-sidecar-bundle] ${sidecar.id} exited ${code}: ${stderr.trim()}`);
    } else if (signal) {
      console.error(`[test-sidecar-bundle] ${sidecar.id} stopped by ${signal}`);
    }
  });

  return child;
}

async function main() {
  const node = nodeRuntimePath();
  assertManifest();
  assertFile(node, "bundled Node runtime");

  const children = [];
  try {
    for (const sidecar of sidecars) {
      const child = startSidecar(node, sidecar);
      children.push(child);
      await waitForHealth(sidecar);
      await assertAuthRequired(sidecar);
      console.log(`[ok] ${sidecar.id} starts from bundle with internal auth`);
    }
  } finally {
    shuttingDown = true;
    for (const child of children) {
      if (!child.killed) child.kill();
    }
    await Promise.all(
      children.map(
        (child) =>
          new Promise((resolve) => {
            child.once("exit", resolve);
            setTimeout(resolve, 1_000);
          }),
      ),
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
