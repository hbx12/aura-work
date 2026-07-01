#!/usr/bin/env node

/**
 * Aura Work — Marketplace Validator
 * Validates all marketplace items have required fields and proper structure.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const MARKETPLACE_PATH = path.join(ROOT, 'registry/marketplace.json');

const REQUIRED_FIELDS = ['id', 'type', 'name', 'version', 'summary', 'description', 'publisher', 'categories', 'tags', 'risk', 'localized'];
const VALID_TYPES = ['skill', 'mcp', 'plugin'];
const VALID_RISKS = ['low', 'medium', 'high'];

let errors = 0;
let warnings = 0;

console.log('🔍 Validating marketplace registry...\n');

const data = JSON.parse(fs.readFileSync(MARKETPLACE_PATH, 'utf8'));
const items = data.plugins || [];

console.log(`Found ${items.length} marketplace items\n`);

for (const item of items) {
  const prefix = `[${item.id}]`;
  
  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!item[field]) {
      console.log(`❌ ${prefix} Missing required field: ${field}`);
      errors++;
    }
  }

  // Check type
  if (item.type && !VALID_TYPES.includes(item.type)) {
    console.log(`❌ ${prefix} Invalid type: ${item.type}`);
    errors++;
  }

  // Check risk
  if (item.risk && !VALID_RISKS.includes(item.risk)) {
    console.log(`❌ ${prefix} Invalid risk level: ${item.risk}`);
    errors++;
  }

  // Check ID format
  if (item.id && !/^[a-z0-9][a-z0-9.-]*$/i.test(item.id)) {
    console.log(`❌ ${prefix} Invalid ID format: ${item.id}`);
    errors++;
  }

  // Check Arabic localization
  if (!item.localized?.ar) {
    console.log(`⚠️  ${prefix} Missing Arabic localization`);
    warnings++;
  } else {
    if (!item.localized.ar.name) {
      console.log(`⚠️  ${prefix} Missing Arabic name`);
      warnings++;
    }
    if (!item.localized.ar.summary) {
      console.log(`⚠️  ${prefix} Missing Arabic summary`);
      warnings++;
    }
  }

  // Check publisher
  if (item.publisher) {
    if (!item.publisher.name) {
      console.log(`⚠️  ${prefix} Missing publisher name`);
      warnings++;
    }
  }

  // Check homepage/repository
  if (!item.homepage) {
    console.log(`⚠️  ${prefix} Missing homepage`);
    warnings++;
  }
  if (!item.repository) {
    console.log(`⚠️  ${prefix} Missing repository`);
    warnings++;
  }
}

// Check for duplicate IDs
const ids = items.map(i => i.id);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length > 0) {
  console.log(`\n❌ Duplicate IDs found: ${duplicates.join(', ')}`);
  errors++;
}

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Summary:`);
console.log(`   Items: ${items.length}`);
console.log(`   Errors: ${errors}`);
console.log(`   Warnings: ${warnings}`);

if (errors === 0) {
  console.log('\n✅ All marketplace items are valid!');
  process.exit(0);
} else {
  console.log(`\n❌ Found ${errors} error(s)`);
  process.exit(1);
}
