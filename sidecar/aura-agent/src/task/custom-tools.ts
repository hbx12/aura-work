import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import * as esbuild from "esbuild";

export interface CustomTool {
  name: string;
  description: string;
  args: Record<string, any>;
  execute: (args: any, context: any) => Promise<any>;
  filePath: string;
  error?: string;
}

const tmpDir = path.join(os.tmpdir(), "aura-custom-tools");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

export async function loadCustomTools(projectPath?: string): Promise<CustomTool[]> {
  const tools: CustomTool[] = [];
  const home = os.homedir();
  const dirsToScan: string[] = [];

  if (projectPath) {
    dirsToScan.push(path.join(projectPath, ".aura", "tools"));
  }
  dirsToScan.push(path.join(home, ".config", "aura", "tools"));

  for (const dir of dirsToScan) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith(".ts") && !file.endsWith(".js") && !file.endsWith(".tsx") && !file.endsWith(".jsx")) {
          continue;
        }
        const fullPath = path.resolve(dir, file);
        const baseName = path.basename(file, path.extname(file));

        try {
          // Read content to hash it and build cache path
          const content = fs.readFileSync(fullPath, "utf-8");
          const hash = crypto.createHash("sha256").update(fullPath + content).digest("hex");
          const cachedPath = path.join(tmpDir, `${hash}.js`);

          // Compile using esbuild if cache misses
          if (!fs.existsSync(cachedPath)) {
            await esbuild.build({
              entryPoints: [fullPath],
              bundle: true,
              outfile: cachedPath,
              format: "esm",
              platform: "node",
              target: "node20",
              external: ["@aura-os/plugin", "zod"],
            });
          }

          // Import compiled ESM file
          const mod = await import(`file://${cachedPath}`);

          // 1. Check default export
          if (mod.default) {
            const toolDef = mod.default;
            const name = toolDef.name || baseName;
            const description = toolDef.description || "";
            const args = toolDef.args || {};
            const execute = toolDef.execute;
            if (typeof execute === "function") {
              tools.push({ name, description, args, execute, filePath: fullPath });
            } else {
              tools.push({
                name: baseName,
                description: "",
                args: {},
                execute: async () => {},
                filePath: fullPath,
                error: "Default export is missing a valid execute function.",
              });
            }
          } else {
            // 2. Check named exports
            let namedFound = false;
            for (const key of Object.keys(mod)) {
              if (key === "default") continue;
              const toolDef = mod[key];
              if (toolDef && typeof toolDef.execute === "function") {
                const name = `${baseName}_${key}`;
                const description = toolDef.description || "";
                const args = toolDef.args || {};
                const execute = toolDef.execute;
                tools.push({ name, description, args, execute, filePath: fullPath });
                namedFound = true;
              }
            }
            if (!namedFound) {
              tools.push({
                name: baseName,
                description: "",
                args: {},
                execute: async () => {},
                filePath: fullPath,
                error: "No default or named tool exports with an execute function were found.",
              });
            }
          }
        } catch (err: any) {
          console.warn(`[custom-tools] Failed to load custom tool file ${file}:`, err);
          tools.push({
            name: baseName,
            description: "",
            args: {},
            execute: async () => {},
            filePath: fullPath,
            error: err.message || String(err),
          });
        }
      }
    } catch (err) {
      console.warn(`[custom-tools] Failed to read custom tools directory ${dir}:`, err);
    }
  }

  return tools;
}

export async function executeCustomTool(
  toolName: string,
  args: any,
  context: any,
  projectPath?: string
): Promise<any> {
  const tools = await loadCustomTools(projectPath);
  const tool = tools.find((t) => t.name === toolName && !t.error);
  if (!tool) {
    throw new Error(`Custom tool "${toolName}" not found or failed compilation.`);
  }
  return await tool.execute(args, context);
}
