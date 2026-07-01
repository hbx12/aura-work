#!/usr/bin/env node

/**
 * Aura Work — Dependency Report
 * Generates a report of all dependencies and their licenses.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();

console.log('📦 Generating dependency report...\n');

// Get npm dependencies
function getNpmDeps() {
  try {
    const output = execSync('npm ls --all --json', { encoding: 'utf8', cwd: ROOT });
    return JSON.parse(output);
  } catch (e) {
    return null;
  }
}

// Get Cargo dependencies
function getCargoDeps() {
  const cargoPath = path.join(ROOT, 'apps/desktop/src-tauri/Cargo.toml');
  if (!fs.existsSync(cargoPath)) return null;
  
  const content = fs.readFileSync(cargoPath, 'utf8');
  const deps = [];
  const depSection = content.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
  if (depSection) {
    const lines = depSection[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w[\w-]*)\s*=/);
      if (match) {
        deps.push(match[1]);
      }
    }
  }
  return deps;
}

// Count dependencies
function countDeps(deps, count = { total: 0 }) {
  if (!deps) return count;
  count.total++;
  if (deps.dependencies) {
    for (const dep of Object.values(deps.dependencies)) {
      countDeps(dep, count);
    }
  }
  return count;
}

// Generate report
const npmDeps = getNpmDeps();
const cargoDeps = getCargoDeps();

let report = '# Dependency Report\n\n';
report += `Generated: ${new Date().toISOString()}\n\n`;

// npm dependencies
report += '## npm Dependencies\n\n';
if (npmDeps) {
  const count = countDeps(npmDeps);
  report += `Total: ${count.total} packages\n\n`;
  
  // Direct dependencies
  if (npmDeps.dependencies) {
    report += '### Direct Dependencies\n\n';
    report += '| Package | Version |\n';
    report += '|---------|--------|\n';
    for (const [name, info] of Object.entries(npmDeps.dependencies)) {
      report += `| ${name} | ${info.version || 'N/A'} |\n`;
    }
    report += '\n';
  }
  
  // Dev dependencies
  if (npmDeps.devDependencies) {
    report += '### Dev Dependencies\n\n';
    report += '| Package | Version |\n';
    report += '|---------|--------|\n';
    for (const [name, info] of Object.entries(npmDeps.devDependencies)) {
      report += `| ${name} | ${info.version || 'N/A'} |\n`;
    }
    report += '\n';
  }
} else {
  report += 'Unable to retrieve npm dependencies.\n\n';
}

// Cargo dependencies
report += '## Rust Dependencies\n\n';
if (cargoDeps) {
  report += `Total: ${cargoDeps.length} direct dependencies\n\n`;
  report += '| Package |\n';
  report += '|---------|\n';
  for (const dep of cargoDeps) {
    report += `| ${dep} |\n`;
  }
  report += '\n';
} else {
  report += 'Unable to retrieve Cargo dependencies.\n\n';
}

// Write report
fs.writeFileSync('DEPENDENCY-REPORT.md', report);
console.log('✅ Generated DEPENDENCY-REPORT.md');

// Summary
console.log('\n📊 Summary:');
if (npmDeps) {
  const count = countDeps(npmDeps);
  console.log(`   npm packages: ${count.total}`);
}
if (cargoDeps) {
  console.log(`   Cargo packages: ${cargoDeps.length}`);
}
