import type { IncomingMessage, ServerResponse } from "node:http";

export const SIDECAR_AUTH_ENV = "AURA_SIDECAR_AUTH_TOKEN";

export function loadSidecarToken(): string {
  const token = process.env[SIDECAR_AUTH_ENV]?.trim();
  if (!token || token.length < 32) {
    console.error(
      `[sidecar] Missing or invalid ${SIDECAR_AUTH_ENV}. Sidecar refused to start without internal auth.`,
    );
    process.exit(1);
  }
  return token;
}

export function isSidecarAuthorized(req: IncomingMessage, expectedToken: string): boolean {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length).trim();
  if (!provided || provided.length < 32) return false;
  if (provided.length !== expectedToken.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  return mismatch === 0;
}

export function rejectUnauthorized(res: ServerResponse): void {
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Unauthorized" }));
}

export function requireSidecarAuth(
  req: IncomingMessage,
  res: ServerResponse,
  expectedToken: string,
): boolean {
  if (isSidecarAuthorized(req, expectedToken)) return true;
  rejectUnauthorized(res);
  return false;
}
