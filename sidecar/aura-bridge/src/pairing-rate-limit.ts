export const PAIRING_RATE_LIMIT_MAX_FAILURES = 5;
export const PAIRING_RATE_LIMIT_WINDOW_MS = 60_000;
export const PAIRING_RATE_LIMIT_LOCKOUT_MS = 5 * 60_000;

interface PairingRateLimitEntry {
failures: number[];
lockedUntil?: number;
}

export class PairingRateLimitError extends Error {
public readonly statusCode = 429;

constructor(public readonly retryAfterSeconds: number) {
super("Too many pairing attempts. Try again later.");
this.name = "PairingRateLimitError";
}
}

export class PairingRateLimiter {
private readonly entries = new Map<string, PairingRateLimitEntry>();

assertAllowed(key: string, now = Date.now()): void {
const entry = this.entries.get(key);


if (!entry?.lockedUntil) {
  return;
}

if (entry.lockedUntil <= now) {
  this.entries.delete(key);
  return;
}

throw new PairingRateLimitError(
  Math.max(1, Math.ceil((entry.lockedUntil - now) / 1_000)),
);


}

recordFailure(key: string, now = Date.now()): void {
const entry = this.entries.get(key) ?? { failures: [] };


entry.failures = entry.failures.filter(
  (timestamp) => now - timestamp < PAIRING_RATE_LIMIT_WINDOW_MS,
);

entry.failures.push(now);

if (entry.failures.length >= PAIRING_RATE_LIMIT_MAX_FAILURES) {
  entry.failures = [];
  entry.lockedUntil = now + PAIRING_RATE_LIMIT_LOCKOUT_MS;
}

this.entries.set(key, entry);


}

recordSuccess(key: string): void {
this.entries.delete(key);
}
}
