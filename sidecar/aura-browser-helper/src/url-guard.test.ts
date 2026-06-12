import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

import {
  assertSafeRemoteUrl,
  fetchSafe,
  resolveHostnameSafe,
} from "../src/url-guard.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

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

  it("rejects link-local metadata IP", () => {
    expect(() =>
      assertSafeRemoteUrl("http://169.254.169.254/latest/meta-data"),
    ).toThrow(/Blocked URL/);
  });

  it("rejects IPv4-mapped IPv6 loopback", () => {
    expect(() => assertSafeRemoteUrl("http://[::ffff:127.0.0.1]/")).toThrow(
      /Blocked URL/,
    );
  });

  it("rejects IPv4-mapped IPv6 private address", () => {
    expect(() => assertSafeRemoteUrl("http://[::ffff:192.168.1.1]/")).toThrow(
      /Blocked URL/,
    );
  });

  it("rejects expanded IPv6 loopback", () => {
    expect(() => assertSafeRemoteUrl("http://[0:0:0:0:0:0:0:1]/")).toThrow(
      /Blocked URL/,
    );
  });

  it("rejects IPv6 unique-local addresses", () => {
    expect(() => assertSafeRemoteUrl("http://[fc00::1]/")).toThrow(/Blocked URL/);
    expect(() => assertSafeRemoteUrl("http://[fd12::1]/")).toThrow(/Blocked URL/);
  });

  it("rejects IPv6 link-local addresses", () => {
    expect(() => assertSafeRemoteUrl("http://[fe80::1]/")).toThrow(/Blocked URL/);
  });

  it("rejects IPv6 multicast addresses", () => {
    expect(() => assertSafeRemoteUrl("http://[ff02::1]/")).toThrow(/Blocked URL/);
  });

  it("allows public IPv6 URLs", () => {
    expect(assertSafeRemoteUrl("https://[2606:4700:4700::1111]/").hostname).toBe(
      "[2606:4700:4700::1111]",
    );
  });

  it("allows public https URLs", () => {
    expect(assertSafeRemoteUrl("https://example.com/").hostname).toBe("example.com");
  });

  it("rejects non-http protocols", () => {
    expect(() => assertSafeRemoteUrl("file:///etc/passwd")).toThrow(
      /Only http and https/,
    );
  });

  it("resolves public hostnames safely", async () => {
    await expect(resolveHostnameSafe("example.com")).resolves.toBeUndefined();
  });

  it("rejects redirect to internal target", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/" },
        }),
      ),
    );

    await expect(
      fetchSafe("https://example.com/", {
        timeoutMs: 1_000,
      }),
    ).rejects.toThrow(/Blocked URL|private|local/i);
  });
});