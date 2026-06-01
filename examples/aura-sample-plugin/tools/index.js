/** @type {import('../../sidecar/aura-plugins-helper/src/types.js').PluginToolDef[]} */
export const tools = [
  {
    id: "sample.greet",
    name: "Greet",
    description: "Returns a greeting for the given name.",
  },
  {
    id: "sample.echo",
    name: "Echo",
    description: "Echoes back the input arguments as JSON.",
  },
];

/** @type {Record<string, (args: Record<string, unknown>) => Promise<unknown>>} */
export const handlers = {
  "sample.greet": async (args) => {
    const name = typeof args.name === "string" ? args.name : "world";
    return { greeting: `Hello, ${name}!`, from: "com.aura.sample" };
  },
  "sample.echo": async (args) => args,
};

export default { tools, handlers };
