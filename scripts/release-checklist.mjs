#!/usr/bin/env node

/**
 * Aura Work — Release Checklist
 * Verifies everything is ready for a release.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
let checks = 0;
let passed = 0;
let warnings = 0;

function check(name, condition, isWarning = false) {
  checks++;
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else if (isWarning) {
    console.log(`⚠️  ${name}`);
    warnings++;
  } else {
    console.log(`❌ ${name}`);
  }
}

console.log('🚀 Running release checklist...\n');

// 1. Version consistency
console.log('📦 Version Consistency');
const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
check('Root package.json version', rootPkg.version === '0.1.0-alpha.11');

// 2. Tests
console.log('\n🧪 Tests');
check('Test script exists', !!rootPkg.scripts.test);
check('Lint script exists', !!rootPkg.scripts.lint);
check('Build script exists', !!rootPkg.scripts.build);

// 3. Documentation
console.log('\n📚 Documentation');
check('README.md exists', fs.existsSync(path.join(ROOT, 'README.md')));
check('README.ar.md exists', fs.existsSync(path.join(ROOT, 'README.ar.md')));
check('CHANGELOG.md exists', fs.existsSync(path.join(ROOT, 'CHANGELOG.md')));
check('LICENSE exists', fs.existsSync(path.join(ROOT, 'LICENSE')));
check('SECURITY.md exists', fs.existsSync(path.join(ROOT, 'SECURITY.md')));

// 4. CI/CD
console.log('\n🔄 CI/CD');
check('CI workflow exists', fs.existsSync(path.join(ROOT, '.github/workflows/ci.yml')));
check('Release workflow exists', fs.existsSync(path.join(ROOT, '.github/workflows/release.yml')));

// 5. Security
console.log('\n🔒 Security');
check('SECURITY.md has content', fs.readFileSync(path.join(ROOT, 'SECURITY.md'), 'utf8').length > 100);
check('.env.example exists', fs.existsSync(path.join(ROOT, '.env.example')));

// 6. Marketplace
console.log('\n🛒 Marketplace');
const marketplace = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/marketplace.json'), 'utf8'));
check(`Marketplace items: ${marketplace.plugins.length}`, marketplace.plugins.length >= 50);

// 7. i18n
console.log('\n🌐 i18n');
const locales = fs.readdirSync(path.join(ROOT, 'packages/i18n/locales')).filter(f => f.endsWith('.json'));
check(`Locale files: ${locales.length}`, locales.length >= 25);

// 8. Build artifacts
console.log('\n📦 Build Artifacts');
check('bundle/ exists', fs.existsSync(path.join(ROOT, 'bundle')));

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 Release Checklist Summary:');
console.log(`   Total checks: ${checks}`);
console.log(`   Passed: ${passed}`);
console.log(`   Warnings: ${warnings}`);
console.log(`   Failed: ${checks - passed - warnings}`);

if (checks - passed - warnings === 0) {
  console.log('\n✅ Ready for release!');
  process.exit(0);
} else {
  console.log('\n❌ Not ready for release');
  process.exit(1);
}
