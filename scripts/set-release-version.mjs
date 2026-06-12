import { readFile, writeFile } from "node:fs/promises";

const version = process.argv[2]?.replace(/^v/, "");

if (!version) {
  throw new Error("Usage: npm run release:version -- <semver>");
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`Invalid SemVer release version: ${version}`);
}

const jsonFiles = [
  "package.json",
  "apps/desktop/package.json",
  "apps/desktop/src-tauri/tauri.conf.json",
];

for (const file of jsonFiles) {
  const json = JSON.parse(await readFile(file, "utf8"));
  json.version = version;
  await writeFile(file, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  console.log(`Updated ${file}`);
}

const cargoPath = "apps/desktop/src-tauri/Cargo.toml";
const cargoToml = await readFile(cargoPath, "utf8");
const updatedCargo = cargoToml.replace(
  /(^\[package\][\s\S]*?^version\s*=\s*")[^"]+("$)/m,
  `$1${version}$2`,
);

if (updatedCargo === cargoToml) {
  throw new Error(`Could not update package version in ${cargoPath}`);
}

await writeFile(cargoPath, updatedCargo, "utf8");
console.log(`Updated ${cargoPath}`);
console.log(`Aura Work release version set to ${version}.`);
