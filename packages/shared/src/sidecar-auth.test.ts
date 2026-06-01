import { describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadSidecarToken, requireSidecarAuth } from "@aura-os/shared";

function withEnv(token: string, fn: () => Promise<void>) {
  const prev = process.env.AURA_SIDECAR_AUTH_TOKEN;
  process.env.AURA_SIDECAR_AUTH_TOKEN = token;
  return fn().finally(() => {
    if (prev === undefined) delete process.env.AURA_SIDECAR_AUTH_TOKEN;
    else process.env.AURA_SIDECAR_AUTH_TOKEN = prev;
  });
}

describe("sidecar auth", () => {
  const token = "a".repeat(48);

  it("loadSidecarToken accepts configured token", async () => {
    await withEnv(token, async () => {
      expect(loadSidecarToken()).toBe(token);
    });
  });

  it("rejects missing Authorization header", async () => {
    await withEnv(token, async () => {
      const authToken = loadSidecarToken();
      await new Promise<void>((resolve) => {
        const server = createServer((req: IncomingMessage, res: ServerResponse) => {
          if (!requireSidecarAuth(req, res, authToken)) return;
          res.writeHead(200);
          res.end("ok");
        });
        server.listen(0, "127.0.0.1", async () => {
          const addr = server.address();
          const port = typeof addr === "object" && addr ? addr.port : 0;
          const resp = await fetch(`http://127.0.0.1:${port}/health`);
          expect(resp.status).toBe(401);
          server.close(() => resolve());
        });
      });
    });
  });

  it("rejects wrong token", async () => {
    await withEnv(token, async () => {
      const authToken = loadSidecarToken();
      await new Promise<void>((resolve) => {
        const server = createServer((req, res) => {
          if (!requireSidecarAuth(req, res, authToken)) return;
          res.writeHead(200);
          res.end("ok");
        });
        server.listen(0, "127.0.0.1", async () => {
          const addr = server.address();
          const port = typeof addr === "object" && addr ? addr.port : 0;
          const resp = await fetch(`http://127.0.0.1:${port}/health`, {
            headers: { Authorization: "Bearer " + "b".repeat(48) },
          });
          expect(resp.status).toBe(401);
          server.close(() => resolve());
        });
      });
    });
  });

  it("accepts valid bearer token", async () => {
    await withEnv(token, async () => {
      const authToken = loadSidecarToken();
      await new Promise<void>((resolve) => {
        const server = createServer((req, res) => {
          if (!requireSidecarAuth(req, res, authToken)) return;
          res.writeHead(200);
          res.end("ok");
        });
        server.listen(0, "127.0.0.1", async () => {
          const addr = server.address();
          const port = typeof addr === "object" && addr ? addr.port : 0;
          const resp = await fetch(`http://127.0.0.1:${port}/health`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          expect(resp.status).toBe(200);
          server.close(() => resolve());
        });
      });
    });
  });
});
