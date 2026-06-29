import { z } from "zod";

export function tool(def: {
  description: string;
  args?: any;
  execute: (args: any, context: any) => Promise<any>;
}) {
  return def;
}

tool.schema = z;
