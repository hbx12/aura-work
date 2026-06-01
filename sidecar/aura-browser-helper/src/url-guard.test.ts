import { describe, expect, it } from "vitest";
import {
  assertSafeRemoteUrl,
  fetchSafe,
  isBlockedHostname,
  resolveHostnameSafe,
} from "../src/url-guard.js";

describe("url-guard SSRF protection", () => {
  it("rejects loopback IPv4", () => {
    expect(() => assertSafeRemoteUrl("http://127.0.0.1/")).toThrow(/Blocked URL/);
  });

  it("rejects localhost hostname", () => {
    expect(() => assertSafeRemoteUrl("http://localhost/admin")).toThrow(/Blocked URL/);
  });

  it("rejects private IPv4", () => {
    expect(() => assertSafeRemoteUrl("http://192.168.1.1/")).toThrow(/Blocked URL/);
  });

  it("rejects link-local IPv4", () => {
    expect(isBlockedHostname("169.254.1.1")).toBe(true);
  });

  it("allows public https URLs", () => {
    expect(assertSafeRemoteUrl("https://example.com/").hostname).toBe("example.com");
  });

  it("rejects non-http protocols", () => {
    expect(() => assertSafeRemoteUrl("file:///etc/passwd")).toThrow(/Only http and https/);
  });

  it("resolves public hostnames safely", async () => {
    await expect(resolveHostnameSafe("example.com")).resolves.toBeUndefined();
  });

  it("rejects redirect to internal target", async () => {
    await expect(
      fetchSafe("https://httpbin.org/redirect-to?url=http%3A%2F%2F127.0.0.1%2F", {
        timeoutMs: 15_000,
      }),
    ).rejects.toThrow(/Blocked URL|private|local/i);
  });
});
