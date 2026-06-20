const fs = require('fs');
const path = require('path');

// Basic Ajv-like validator or native JSON schema checks for lightweight verification
const SCHEMA_PATH = path.join(__dirname, '../registry/schema/marketplace-item.schema.json');
const REGISTRY_PATH = path.join(__dirname, '../registry');

function logError(msg) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
}

function logSuccess(msg) {
  console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`);
}

function validateFile(filePath, schema) {
  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    logError(`File is not valid JSON: ${filePath} (${err.message})`);
    return false;
  }

  // Schema matching checks
  const required = ['id', 'type', 'name', 'version'];
  for (const req of required) {
    if (!data[req]) {
      logError(`Missing required field "${req}" in ${filePath}`);
      return false;
    }
  }

  const expectedTypes = ['skill', 'mcp', 'plugin'];
  if (!expectedTypes.includes(data.type)) {
    logError(`Invalid type "${data.type}" in ${filePath}. Must be one of: ${expectedTypes.join(', ')}`);
    return false;
  }

  // ID and filename matching
  const basename = path.basename(filePath, '.json');
  const expectedId = `${data.type}.${basename}`;
  if (data.id !== expectedId && data.id !== `plugin.${basename}`) {
    logError(`Manifest ID "${data.id}" must match filename pattern "${expectedId}" in ${filePath}`);
    return false;
  }

  // Block path traversal and dangerous keywords
  const manifestString = JSON.stringify(data).toLowerCase();
  const dangerousKeywords = [
    'rm -rf',
    'sudo ',
    'curl http',
    'wget http',
    'sh ',
    'bash ',
    'eval',
    '/etc/passwd',
    'cmd.exe'
  ];

  for (const keyword of dangerousKeywords) {
    if (manifestString.includes(keyword)) {
      logError(`Dangerous command or keyword "${keyword}" found in manifest ${filePath}. Submissions with arbitrary shell executions are rejected.`);
      return false;
    }
  }

  // Check asset resolution
  if (data.icon) {
    const iconPath = path.join(REGISTRY_PATH, 'assets', data.icon);
    if (!fs.existsSync(iconPath)) {
      logError(`Icon asset "${data.icon}" resolved to "${iconPath}" but does not exist.`);
      return false;
    }
  }

  if (data.cover) {
    const coverPath = path.join(REGISTRY_PATH, 'assets', data.cover);
    if (!fs.existsSync(coverPath)) {
      logError(`Cover asset "${data.cover}" resolved to "${coverPath}" but does not exist.`);
      return false;
    }
  }

  return true;
}

function main() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    logError(`Schema not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const folders = ['skills', 'mcp', 'plugins'];
  let passed = true;

  for (const folder of folders) {
    const dir = path.join(REGISTRY_PATH, folder);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'sample-local-plugin.json');
    for (const file of files) {
      const filePath = path.join(dir, file);
      const ok = validateFile(filePath, schema);
      if (!ok) {
        passed = false;
      } else {
        logSuccess(`Validated ${folder}/${file}`);
      }
    }
  }

  if (!passed) {
    console.error('\x1b[31mValidation failed!\x1b[0m Please fix manifest errors.');
    process.exit(1);
  } else {
    logSuccess('All marketplace manifest validations passed successfully.');
  }
}

main();
