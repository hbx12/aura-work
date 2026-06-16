import type { IncomingMessage, ServerResponse } from "node:http";

export const SIDECAR_AUTH_ENV = "AURA_SIDECAR_AUTH_TOKEN";
export const DEFAULT_JSON_BODY_LIMIT_BYTES = 1024 * 1024;

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

export async function readJsonBody<T>(
  req: IncomingMessage,
  options: { maxBytes?: number; allowEmpty?: boolean } = {},
): Promise<T> {
  const maxBytes = options.maxBytes ?? DEFAULT_JSON_BODY_LIMIT_BYTES;
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.byteLength;
    if (total > maxBytes) {
      throw new Error(`Request body too large; limit is ${maxBytes} bytes.`);
    }
    chunks.push(buf);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim() && options.allowEmpty) return {} as T;
  return JSON.parse(raw) as T;
}
