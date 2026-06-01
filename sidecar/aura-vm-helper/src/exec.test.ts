import { describe, expect, it } from "vitest";
import { isUnsafeHostExecutionAllowed } from "./exec.js";

describe("host shell fallback policy", () => {
  it("is disabled by default", () => {
    const previous = process.env.AURA_ALLOW_UNSAFE_HOST_EXECUTION;
    delete process.env.AURA_ALLOW_UNSAFE_HOST_EXECUTION;
    expect(isUnsafeHostExecutionAllowed()).toBe(false);
    if (previous === undefined) delete process.env.AURA_ALLOW_UNSAFE_HOST_EXECUTION;
    else process.env.AURA_ALLOW_UNSAFE_HOST_EXECUTION = previous;
  });

  it("enables only with explicit env flag", () => {
    const previous = process.env.AURA_ALLOW_UNSAFE_HOST_EXECUTION;
    process.env.AURA_ALLOW_UNSAFE_HOST_EXECUTION = "1";
    expect(isUnsafeHostExecutionAllowed()).toBe(true);
    if (previous === undefined) delete process.env.AURA_ALLOW_UNSAFE_HOST_EXECUTION;
    else process.env.AURA_ALLOW_UNSAFE_HOST_EXECUTION = previous;
  });
});
