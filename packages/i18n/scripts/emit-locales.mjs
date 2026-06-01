import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "locales");
mkdirSync(outDir, { recursive: true });

// Load compiled catalog via dynamic import of TS source (Node 22+ strip types)
const { CATALOG, resolveCatalog, SUPPORTED_LOCALES } = await import("../src/catalog.ts");

for (const { id } of SUPPORTED_LOCALES) {
  const messages = resolveCatalog(id);
  writeFileSync(join(outDir, `${id}.json`), `${JSON.stringify(messages, null, 2)}\n`, "utf8");
}

console.log(`[i18n] emitted ${SUPPORTED_LOCALES.length} locale files to locales/`);
