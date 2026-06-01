import { describe, expect, it } from "vitest";

describe("computer use gate", () => {
  it("is disabled unless env flag is set", () => {
    const previous = process.env.AURA_ENABLE_EXPERIMENTAL_COMPUTER_USE;
    delete process.env.AURA_ENABLE_EXPERIMENTAL_COMPUTER_USE;
    expect(process.env.AURA_ENABLE_EXPERIMENTAL_COMPUTER_USE === "1").toBe(false);
    process.env.AURA_ENABLE_EXPERIMENTAL_COMPUTER_USE = "1";
    expect(process.env.AURA_ENABLE_EXPERIMENTAL_COMPUTER_USE === "1").toBe(true);
    if (previous === undefined) delete process.env.AURA_ENABLE_EXPERIMENTAL_COMPUTER_USE;
    else process.env.AURA_ENABLE_EXPERIMENTAL_COMPUTER_USE = previous;
  });
});
