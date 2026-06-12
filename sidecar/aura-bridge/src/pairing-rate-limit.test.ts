import { describe, expect, it } from "vitest";
import {
PAIRING_RATE_LIMIT_LOCKOUT_MS,
PairingRateLimitError,
PairingRateLimiter,
} from "./pairing-rate-limit.js";

describe("PairingRateLimiter", () => {
it("allows initial pairing attempts", () => {
const limiter = new PairingRateLimiter();


expect(() => limiter.assertAllowed("127.0.0.1", 1_000)).not.toThrow();


});

it("locks the source after five failed attempts", () => {
const limiter = new PairingRateLimiter();
const key = "127.0.0.1";
const now = 1_000;


for (let attempt = 0; attempt < 5; attempt += 1) {
  limiter.recordFailure(key, now + attempt);
}

expect(() => limiter.assertAllowed(key, now + 10)).toThrow(
  PairingRateLimitError,
);


});

it("returns a retry delay while locked", () => {
const limiter = new PairingRateLimiter();
const key = "127.0.0.1";
const now = 1_000;


for (let attempt = 0; attempt < 5; attempt += 1) {
  limiter.recordFailure(key, now + attempt);
}

expect(() => limiter.assertAllowed(key, now + 10)).toThrowError(
  expect.objectContaining({
    name: "PairingRateLimitError",
    statusCode: 429,
    retryAfterSeconds: expect.any(Number),
  }),
);


});

it("allows attempts again after the lockout expires", () => {
const limiter = new PairingRateLimiter();
const key = "127.0.0.1";
const now = 1_000;


for (let attempt = 0; attempt < 5; attempt += 1) {
  limiter.recordFailure(key, now + attempt);
}

expect(() =>
  limiter.assertAllowed(key, now + PAIRING_RATE_LIMIT_LOCKOUT_MS + 10),
).not.toThrow();


});

it("clears failures after a successful pairing", () => {
const limiter = new PairingRateLimiter();
const key = "127.0.0.1";


limiter.recordFailure(key, 1_000);
limiter.recordFailure(key, 1_001);
limiter.recordSuccess(key);

expect(() => limiter.assertAllowed(key, 1_002)).not.toThrow();


});
});
