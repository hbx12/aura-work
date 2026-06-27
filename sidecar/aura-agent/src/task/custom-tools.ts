import fs from "fs";
import path from "path";
import os from "os";

export interface CustomTool {
  name: string;
  description: string;
  args: Record<string, any>;
  execute: (args: any, context: any) => Promise<any>;
  filePath: string;
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
        try {
          const mod = await import(`file://${fullPath}`);
          const baseName = path.basename(file, path.extname(file));

          // 1. Check default export
          if (mod.default) {
            const toolDef = mod.default;
            const name = toolDef.name || baseName;
            const description = toolDef.description || "";
            const args = toolDef.args || {};
            const execute = toolDef.execute;
            if (typeof execute === "function") {
              tools.push({ name, description, args, execute, filePath: fullPath });
            }
          }

          // 2. Check named exports
          for (const key of Object.keys(mod)) {
            if (key === "default") continue;
            const toolDef = mod[key];
            if (toolDef && typeof toolDef.execute === "function") {
              const name = `${baseName}_${key}`;
              const description = toolDef.description || "";
              const args = toolDef.args || {};
              const execute = toolDef.execute;
              tools.push({ name, description, args, execute, filePath: fullPath });
            }
          }
        } catch (err) {
          console.warn(`[custom-tools] Failed to load custom tool file ${file}:`, err);
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
  const tool = tools.find((t) => t.name === toolName);
  if (!tool) {
    throw new Error(`Custom tool "${toolName}" not found.`);
  }
  return await tool.execute(args, context);
}
