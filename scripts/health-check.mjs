#!/usr/bin/env node

/**
 * Aura Work — Health Check Script
 * Verifies all components are properly configured and working.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
let checks = 0;
let passed = 0;
let failed = 0;

function check(name, condition) {
  checks++;
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

console.log('🏥 Running health checks...\n');

// 1. Check Node.js version
console.log('📦 Node.js');
const nodeVersion = process.version;
check(`Node.js version: ${nodeVersion}`, parseInt(nodeVersion.slice(1)) >= 20);

// 2. Check required files
console.log('\n📁 Required Files');
check('package.json', fs.existsSync(path.join(ROOT, 'package.json')));
check('tsconfig.json', fs.existsSync(path.join(ROOT, 'tsconfig.json')));
check('eslint.config.mjs', fs.existsSync(path.join(ROOT, 'eslint.config.mjs')));
check('.env.example', fs.existsSync(path.join(ROOT, '.env.example')));
check('README.md', fs.existsSync(path.join(ROOT, 'README.md')));
check('README.ar.md', fs.existsSync(path.join(ROOT, 'README.ar.md')));
check('LICENSE', fs.existsSync(path.join(ROOT, 'LICENSE')));
check('SECURITY.md', fs.existsSync(path.join(ROOT, 'SECURITY.md')));

// 3. Check directories
console.log('\n📂 Required Directories');
check('apps/', fs.existsSync(path.join(ROOT, 'apps')));
check('packages/', fs.existsSync(path.join(ROOT, 'packages')));
check('sidecar/', fs.existsSync(path.join(ROOT, 'sidecar')));
check('server/', fs.existsSync(path.join(ROOT, 'server')));
check('cli/', fs.existsSync(path.join(ROOT, 'cli')));
check('registry/', fs.existsSync(path.join(ROOT, 'registry')));
check('docs/', fs.existsSync(path.join(ROOT, 'docs')));
check('scripts/', fs.existsSync(path.join(ROOT, 'scripts')));
check('.github/', fs.existsSync(path.join(ROOT, '.github')));

// 4. Check sidecars
console.log('\n🤖 Sidecars');
const sidecars = [
  'aura-agent',
  'aura-vm-helper',
  'aura-browser-helper',
  'aura-plugins-helper',
  'aura-cloud-sync',
  'aura-bridge',
  'aura-computer-use'
];

for (const sidecar of sidecars) {
  check(`${sidecar}/`, fs.existsSync(path.join(ROOT, 'sidecar', sidecar)));
}

// 5. Check packages
console.log('\n📦 Packages');
const packages = ['shared', 'aura-plugin', 'ui', 'i18n'];
for (const pkg of packages) {
  check(`packages/${pkg}/`, fs.existsSync(path.join(ROOT, 'packages', pkg)));
}

// 6. Check CI/CD
console.log('\n🔄 CI/CD');
check('CI workflow', fs.existsSync(path.join(ROOT, '.github/workflows/ci.yml')));
check('Security workflow', fs.existsSync(path.join(ROOT, '.github/workflows/security.yml')));
check('Labeler workflow', fs.existsSync(path.join(ROOT, '.github/workflows/labeler.yml')));

// 7. Check marketplace
console.log('\n🛒 Marketplace');
const marketplace = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/marketplace.json'), 'utf8'));
check(`Marketplace items: ${marketplace.plugins.length}`, marketplace.plugins.length >= 50);

// 8. Check i18n
console.log('\n🌐 i18n');
const locales = fs.readdirSync(path.join(ROOT, 'packages/i18n/locales')).filter(f => f.endsWith('.json'));
check(`Locale files: ${locales.length}`, locales.length >= 25);
check('English locale', locales.includes('en.json'));
check('Arabic locale', locales.includes('ar.json'));
check('Hebrew locale', locales.includes('he.json'));

// 9. Check documentation
console.log('\n📚 Documentation');
const docs = fs.readdirSync(path.join(ROOT, 'docs'));
check('Troubleshooting guide', docs.includes('troubleshooting.md'));
check('Self-hosting guide', docs.includes('self-hosting.md'));
check('API reference', docs.includes('api-reference.md'));
check('Marketplace guide', docs.includes('marketplace-guide.md'));

// 10. Check scripts
console.log('\n🔧 Scripts');
const scripts = fs.readdirSync(path.join(ROOT, 'scripts'));
check('Version checker', scripts.includes('check-versions.mjs'));
check('Marketplace validator', scripts.includes('validate-marketplace.mjs'));
check('Security audit', scripts.includes('security-audit.mjs'));
check('i18n validator', scripts.includes('validate-i18n.mjs'));

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 Health Check Summary:');
console.log(`   Total checks: ${checks}`);
console.log(`   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✅ All health checks passed!');
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} check(s) failed`);
  process.exit(1);
}
