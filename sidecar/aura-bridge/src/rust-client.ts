import { createHash } from "node:crypto";

export const BRIDGE_PORT = Number(process.env.AURA_BRIDGE_PORT ?? 47826);
export const INTERNAL_URL = process.env.AURA_BRIDGE_INTERNAL_URL ?? "http://127.0.0.1:47827";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function internalFetch<T>(
  secret: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const resp = await fetch(`${INTERNAL_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Aura-Bridge-Secret": secret,
      ...(init?.headers ?? {}),
    },
  });
  const body = (await resp.json()) as T & { error?: string };
  if (!resp.ok) {
    throw new Error(body.error ?? `Bridge internal error (${resp.status})`);
  }
  return body;
}
