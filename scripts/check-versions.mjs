#!/usr/bin/env node

/**
 * Aura Work — Version Consistency Checker
 * Verifies all package versions are consistent across the monorepo.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const EXPECTED_VERSION = '0.1.0-alpha.11';

const packages = [
  'package.json',
  'apps/desktop/package.json',
  'packages/shared/package.json',
  'packages/aura-plugin/package.json',
  'packages/i18n/package.json',
  'packages/ui/package.json',
];

let errors = 0;

console.log('🔍 Checking version consistency...\n');

for (const pkg of packages) {
  const pkgPath = path.join(ROOT, pkg);
  if (!fs.existsSync(pkgPath)) {
    console.log(`⚠️  ${pkg} — not found`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = data.version;

  if (version === EXPECTED_VERSION) {
    console.log(`✅ ${pkg} — ${version}`);
  } else {
    console.log(`❌ ${pkg} — ${version} (expected ${EXPECTED_VERSION})`);
    errors++;
  }
}

console.log('\n' + '='.repeat(50));

if (errors === 0) {
  console.log('✅ All versions are consistent!');
  process.exit(0);
} else {
  console.log(`❌ Found ${errors} version mismatch(es)`);
  process.exit(1);
}
