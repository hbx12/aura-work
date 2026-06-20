const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '../registry/schema/marketplace-item.schema.json');
const REGISTRY_PATH = path.join(__dirname, '../registry');
const AGGREGATE_PATH = path.join(REGISTRY_PATH, 'marketplace.json');

function logError(msg) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
}

function logWarn(msg) {
  console.warn(`\x1b[33m[WARN]\x1b[0m ${msg}`);
}

function logSuccess(msg) {
  console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`);
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`File is not valid JSON: ${filePath} (${err.message})`);
  }
}

function hasUnsafeAssetPath(assetPath) {
  return path.isAbsolute(assetPath) || assetPath.includes('..') || assetPath.includes('\\');
}

function assetExists(assetPath) {
  if (hasUnsafeAssetPath(assetPath)) return false;
  return fs.existsSync(path.join(REGISTRY_PATH, 'assets', assetPath));
}

function containsPotentialSecret(data) {
  const raw = JSON.stringify(data);
  const secretPatterns = [
    /sk-[A-Za-z0-9_-]{20,}/,
    /ghp_[A-Za-z0-9_]{20,}/,
    /github_pat_[A-Za-z0-9_]{20,}/,
    /xox[baprs]-[A-Za-z0-9-]{20,}/,
    /AKIA[0-9A-Z]{16}/,
    /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    /postgres:\/\/[^\s"']+:[^\s"']+@/,
    /mysql:\/\/[^\s"']+:[^\s"']+@/,
  ];
  return secretPatterns.some((pattern) => pattern.test(raw));
}

function validateFile(filePath) {
  let data;
  try {
    data = readJson(filePath);
  } catch (err) {
    logError(err.message);
    return { ok: false, id: null };
  }

  const required = [
    'id',
    'type',
    'name',
    'version',
    'summary',
    'description',
    'publisher',
    'icon',
    'cover',
    'categories',
    'tags',
    'risk',
    'auth',
    'install',
    'setup',
  ];
  for (const req of required) {
    if (data[req] === undefined || data[req] === null || data[req] === '') {
      logError(`Missing required field "${req}" in ${filePath}`);
      return { ok: false, id: data.id ?? null };
    }
  }

  const expectedTypes = ['skill', 'mcp', 'plugin'];
  if (!expectedTypes.includes(data.type)) {
    logError(`Invalid type "${data.type}" in ${filePath}. Must be one of: ${expectedTypes.join(', ')}`);
    return { ok: false, id: data.id ?? null };
  }

  if (!/^[a-z0-9.-]+$/.test(data.id)) {
    logError(`Manifest ID "${data.id}" must match ^[a-z0-9.-]+$ in ${filePath}`);
    return { ok: false, id: data.id ?? null };
  }

  const basename = path.basename(filePath, '.json');
  const expectedId = `${data.type}.${basename}`;
  if (data.id !== expectedId) {
    logError(`Manifest ID "${data.id}" must match filename pattern "${expectedId}" in ${filePath}`);
    return { ok: false, id: data.id };
  }

  if (data.install?.kind !== data.type) {
    logError(`install.kind must match item type "${data.type}" in ${filePath}`);
    return { ok: false, id: data.id };
  }

  if ((data.type === 'mcp' || data.type === 'plugin') && (!Array.isArray(data.permissions) || data.permissions.length === 0)) {
    logError(`${data.type} manifest must declare at least one permission in ${filePath}`);
    return { ok: false, id: data.id };
  }

  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    logError(`categories must contain at least one category in ${filePath}`);
    return { ok: false, id: data.id };
  }

  if (!Array.isArray(data.setup) || data.setup.length === 0) {
    logError(`setup must contain at least one setup instruction in ${filePath}`);
    return { ok: false, id: data.id };
  }

  if (!data.publisher || typeof data.publisher.name !== 'string' || data.publisher.name.trim().length < 2) {
    logError(`publisher.name is required in ${filePath}`);
    return { ok: false, id: data.id };
  }

  if (!['low', 'medium', 'high'].includes(data.risk)) {
    logError(`risk must be low, medium, or high in ${filePath}`);
    return { ok: false, id: data.id };
  }

  if (!data.auth || typeof data.auth.type !== 'string') {
    logError(`auth.type is required in ${filePath}`);
    return { ok: false, id: data.id };
  }

  const manifestString = JSON.stringify(data).toLowerCase();
  const dangerousKeywords = [
    'rm -rf',
    'sudo ',
    'curl http',
    'wget http',
    'curl -fs',
    'curl -s',
    '| sh',
    '| bash',
    'eval(',
    '/etc/passwd',
    'cmd.exe',
    'powershell -enc',
    'invoke-expression',
  ];

  for (const keyword of dangerousKeywords) {
    if (manifestString.includes(keyword)) {
      logError(`Dangerous command or keyword "${keyword}" found in manifest ${filePath}. Submissions with arbitrary shell execution are rejected.`);
      return { ok: false, id: data.id };
    }
  }

  if (containsPotentialSecret(data)) {
    logError(`Potential hardcoded secret detected in ${filePath}. Use auth.fields with secret=true instead.`);
    return { ok: false, id: data.id };
  }

  if (!assetExists(data.icon)) {
    logError(`Icon asset "${data.icon}" is invalid or missing under registry/assets.`);
    return { ok: false, id: data.id };
  }

  if (!assetExists(data.cover)) {
    logError(`Cover asset "${data.cover}" is invalid or missing under registry/assets.`);
    return { ok: false, id: data.id };
  }

  if (data.risk !== 'high' && Array.isArray(data.permissions)) {
    const highRiskPerms = ['execute_command', 'docker_api', 'database_access', 'write_file'];
    const hasHighRiskPerm = data.permissions.some((permission) => highRiskPerms.includes(permission));
    if (hasHighRiskPerm) {
      logWarn(`${data.id} requests powerful permissions but is marked ${data.risk}. Consider marking it high risk.`);
    }
  }

  return { ok: true, id: data.id };
}

function listManifestFiles() {
  const folders = ['skills', 'mcp', 'plugins'];
  const files = [];

  for (const folder of folders) {
    const dir = path.join(REGISTRY_PATH, folder);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'sample-local-plugin.json')) {
      files.push({ folder, file, filePath: path.join(dir, file) });
    }
  }

  return files;
}

function validateAggregate(expectedIds) {
  if (!fs.existsSync(AGGREGATE_PATH)) {
    logError(`Aggregated marketplace registry is missing: ${AGGREGATE_PATH}`);
    return false;
  }

  let aggregate;
  try {
    aggregate = readJson(AGGREGATE_PATH);
  } catch (err) {
    logError(err.message);
    return false;
  }

  const plugins = Array.isArray(aggregate) ? aggregate : aggregate.plugins;
  if (!Array.isArray(plugins)) {
    logError('registry/marketplace.json must be either an array or an object with a plugins array.');
    return false;
  }

  const aggregateIds = new Set(plugins.map((item) => item.id));
  let ok = true;
  for (const id of expectedIds) {
    if (!aggregateIds.has(id)) {
      logError(`registry/marketplace.json is missing manifest id ${id}. Regenerate the aggregate registry.`);
      ok = false;
    }
  }

  return ok;
}

function main() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    logError(`Schema not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const manifestFiles = listManifestFiles();
  const expectedIds = [];
  let passed = true;

  for (const { folder, file, filePath } of manifestFiles) {
    const result = validateFile(filePath);
    if (!result.ok) {
      passed = false;
    } else {
      expectedIds.push(result.id);
      logSuccess(`Validated ${folder}/${file}`);
    }
  }

  if (!validateAggregate(expectedIds)) {
    passed = false;
  }

  if (!passed) {
    console.error('\x1b[31mValidation failed!\x1b[0m Please fix manifest errors.');
    process.exit(1);
  } else {
    logSuccess('All marketplace manifest validations passed successfully.');
  }
}

main();
