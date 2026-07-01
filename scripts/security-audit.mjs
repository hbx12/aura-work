#!/usr/bin/env node

/**
 * Aura Work — Security Audit Script
 * Performs comprehensive security checks on the codebase.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
let issues = [];
let warnings = [];

console.log('🔒 Running security audit...\n');

// Check 1: No hardcoded secrets
console.log('1️⃣ Checking for hardcoded secrets...');
const secretPatterns = [
  /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi,
  /(?:secret|password|token)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi,
  /(?:sk|pk)_(?:test|live)_[a-zA-Z0-9]{20,}/gi,
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const pattern of secretPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        issues.push(`Potential secret in ${filePath}: ${match.substring(0, 50)}...`);
      }
    }
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'target'].includes(entry.name)) {
      scanDir(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

scanDir(path.join(ROOT, 'apps'));
scanDir(path.join(ROOT, 'packages'));
scanDir(path.join(ROOT, 'sidecar'));
scanDir(path.join(ROOT, 'server'));

if (issues.length === 0) {
  console.log('✅ No hardcoded secrets found\n');
} else {
  console.log(`❌ Found ${issues.length} potential secret(s)\n`);
}

// Check 2: CSP headers
console.log('2️⃣ Checking Chrome extension CSP...');
const manifestPath = path.join(ROOT, 'extensions/aura-chrome/manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.content_security_policy) {
    console.log('✅ CSP headers configured\n');
  } else {
    warnings.push('Chrome extension missing CSP headers');
    console.log('⚠️  Chrome extension missing CSP headers\n');
  }
}

// Check 3: .env.example exists
console.log('3️⃣ Checking .env.example...');
if (fs.existsSync(path.join(ROOT, '.env.example'))) {
  console.log('✅ .env.example exists\n');
} else {
  warnings.push('Missing .env.example file');
  console.log('⚠️  Missing .env.example file\n');
}

// Check 4: Security workflow exists
console.log('4️⃣ Checking security workflow...');
if (fs.existsSync(path.join(ROOT, '.github/workflows/security.yml'))) {
  console.log('✅ Security workflow exists\n');
} else {
  warnings.push('Missing security workflow');
  console.log('⚠️  Missing security workflow\n');
}

// Check 5: SECURITY.md exists
console.log('5️⃣ Checking SECURITY.md...');
if (fs.existsSync(path.join(ROOT, 'SECURITY.md'))) {
  console.log('✅ SECURITY.md exists\n');
} else {
  warnings.push('Missing SECURITY.md');
  console.log('⚠️  Missing SECURITY.md\n');
}

// Check 6: No eval() usage
console.log('6️⃣ Checking for eval() usage...');
let evalCount = 0;
function checkEval(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'target'].includes(entry.name)) {
      checkEval(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const evalMatches = content.match(/\beval\s*\(/g);
      if (evalMatches) {
        evalCount += evalMatches.length;
        warnings.push(`eval() usage in ${fullPath}`);
      }
    }
  }
}

checkEval(path.join(ROOT, 'apps'));
checkEval(path.join(ROOT, 'packages'));

if (evalCount === 0) {
  console.log('✅ No eval() usage found\n');
} else {
  console.log(`⚠️  Found ${evalCount} eval() usage(s)\n`);
}

// Summary
console.log('='.repeat(50));
console.log('\n📊 Security Audit Summary:');
console.log(`   Issues: ${issues.length}`);
console.log(`   Warnings: ${warnings.length}`);

if (issues.length > 0) {
  console.log('\n❌ Issues:');
  issues.forEach(i => console.log(`   - ${i}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(w => console.log(`   - ${w}`));
}

if (issues.length === 0) {
  console.log('\n✅ Security audit passed!');
  process.exit(0);
} else {
  console.log('\n❌ Security audit failed');
  process.exit(1);
}
