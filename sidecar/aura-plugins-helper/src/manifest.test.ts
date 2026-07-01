import { describe, it, expect } from "vitest";
import { validateManifest, manifestTools } from "./manifest.js";
import type { PluginManifest, PluginToolDef } from "./types.js";

describe("aura-plugins-helper manifest", () => {
  describe("validateManifest", () => {
    it("should accept a valid manifest", () => {
      const manifest: PluginManifest = {
        schemaVersion: "1.0",
        id: "my-plugin",
        name: "My Plugin",
        version: "1.0.0",
      };
      const result = validateManifest(manifest);
      expect(result).toEqual(manifest);
    });

    it("should throw if schemaVersion is missing", () => {
      const manifest = {
        id: "my-plugin",
        name: "My Plugin",
        version: "1.0.0",
      } as unknown as PluginManifest;
      expect(() => validateManifest(manifest)).toThrow(
        "Manifest missing schemaVersion"
      );
    });

    it("should throw if id is missing", () => {
      const manifest = {
        schemaVersion: "1.0",
        name: "My Plugin",
        version: "1.0.0",
      } as unknown as PluginManifest;
      expect(() => validateManifest(manifest)).toThrow(
        "Manifest missing or invalid id"
      );
    });

    it("should throw if id is invalid", () => {
      const manifest: PluginManifest = {
        schemaVersion: "1.0",
        id: "-invalid-id",
        name: "My Plugin",
        version: "1.0.0",
      };
      expect(() => validateManifest(manifest)).toThrow(
        "Manifest missing or invalid id"
      );
    });

    it("should throw if name is missing", () => {
      const manifest = {
        schemaVersion: "1.0",
        id: "my-plugin",
        version: "1.0.0",
      } as unknown as PluginManifest;
      expect(() => validateManifest(manifest)).toThrow(
        "Manifest missing name"
      );
    });

    it("should throw if version is missing", () => {
      const manifest = {
        schemaVersion: "1.0",
        id: "my-plugin",
        name: "My Plugin",
      } as unknown as PluginManifest;
      expect(() => validateManifest(manifest)).toThrow(
        "Manifest missing version"
      );
    });

    it("should accept valid id formats", () => {
      const validIds = ["my-plugin", "plugin123", "a.b.c", "my-plugin-v2"];
      for (const id of validIds) {
        const manifest: PluginManifest = {
          schemaVersion: "1.0",
          id,
          name: "Test",
          version: "1.0.0",
        };
        expect(() => validateManifest(manifest)).not.toThrow();
      }
    });

    it("should preserve optional fields", () => {
      const manifest: PluginManifest = {
        schemaVersion: "1.0",
        id: "my-plugin",
        name: "My Plugin",
        version: "1.0.0",
        publisher: "Test Publisher",
        description: "A test plugin",
        homepage: "https://example.com",
        license: "MIT",
      };
      const result = validateManifest(manifest);
      expect(result.publisher).toBe("Test Publisher");
      expect(result.description).toBe("A test plugin");
      expect(result.homepage).toBe("https://example.com");
      expect(result.license).toBe("MIT");
    });
  });

  describe("manifestTools", () => {
    it("should return tools array when present", () => {
      const tools: PluginToolDef[] = [
        { id: "tool1", name: "Tool 1", description: "First tool" },
        { id: "tool2", name: "Tool 2", description: "Second tool" },
      ];
      const manifest: PluginManifest = {
        schemaVersion: "1.0",
        id: "my-plugin",
        name: "My Plugin",
        version: "1.0.0",
        tools,
      };
      expect(manifestTools(manifest)).toEqual(tools);
    });

    it("should return empty array when tools is undefined", () => {
      const manifest: PluginManifest = {
        schemaVersion: "1.0",
        id: "my-plugin",
        name: "My Plugin",
        version: "1.0.0",
      };
      expect(manifestTools(manifest)).toEqual([]);
    });

    it("should return empty array when tools is empty", () => {
      const manifest: PluginManifest = {
        schemaVersion: "1.0",
        id: "my-plugin",
        name: "My Plugin",
        version: "1.0.0",
        tools: [],
      };
      expect(manifestTools(manifest)).toEqual([]);
    });
  });
});

describe("aura-plugins-helper types", () => {
  describe("McpServerConfig", () => {
    it("should create a valid MCP server config", () => {
      const config = {
        id: "mcp-server-1",
        name: "Test MCP Server",
        transport: "stdio",
        command: "node",
        args: ["server.js"],
        env: { NODE_ENV: "development" },
        enabled: true,
      };
      expect(config.id).toBe("mcp-server-1");
      expect(config.transport).toBe("stdio");
      expect(config.enabled).toBe(true);
    });

    it("should support optional headers and timeout", () => {
      const config = {
        id: "mcp-server-1",
        name: "Test MCP Server",
        transport: "sse",
        command: "node",
        args: ["server.js"],
        env: {},
        enabled: true,
        headers: { Authorization: "Bearer token" },
        timeout: 30000,
      };
      expect(config.headers?.Authorization).toBe("Bearer token");
      expect(config.timeout).toBe(30000);
    });
  });

  describe("InstalledPluginConfig", () => {
    it("should create a valid installed plugin config", () => {
      const config = {
        id: "my-plugin",
        installPath: "/path/to/plugin",
        enabled: true,
        manifest: {
          schemaVersion: "1.0",
          id: "my-plugin",
          name: "My Plugin",
          version: "1.0.0",
        },
      };
      expect(config.id).toBe("my-plugin");
      expect(config.enabled).toBe(true);
      expect(config.manifest.version).toBe("1.0.0");
    });
  });
});
