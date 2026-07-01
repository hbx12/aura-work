#!/usr/bin/env node

/**
 * Aura Work — i18n Validator
 * Validates all locale files have consistent keys and proper formatting.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const LOCALES_DIR = path.join(ROOT, 'packages/i18n/locales');

console.log('🌐 Validating i18n locale files...\n');

// Load all locales
const localeFiles = fs.readdirSync(LOCALES_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', ''));

console.log(`Found ${localeFiles.length} locale files\n`);

const locales = {};
for (const locale of localeFiles) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  locales[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Check English as reference
const enKeys = Object.keys(locales['en'] || {});
console.log(`English has ${enKeys.length} keys\n`);

let errors = 0;
let warnings = 0;

// Validate each locale
for (const locale of localeFiles) {
  if (locale === 'en') continue;
  
  const data = locales[locale];
  const keys = Object.keys(data);
  const prefix = `[${locale}]`;
  
  // Check key count
  const diff = enKeys.length - keys.length;
  if (diff > 50) {
    console.log(`❌ ${prefix} Missing ${diff} keys (has ${keys.length}/${enKeys.length})`);
    errors++;
  } else if (diff > 0) {
    console.log(`⚠️  ${prefix} Missing ${diff} keys`);
    warnings++;
  } else {
    console.log(`✅ ${prefix} ${keys.length} keys`);
  }
  
  // Check for empty values
  let emptyCount = 0;
  for (const [key, value] of Object.entries(data)) {
    if (!value || String(value).trim() === '') {
      emptyCount++;
    }
  }
  if (emptyCount > 0) {
    console.log(`   ⚠️  ${emptyCount} empty value(s)`);
    warnings++;
  }
  
  // Check interpolation placeholders
  const placeholderRegex = /\{[^}]+\}/g;
  let placeholderMismatch = 0;
  for (const [key, enValue] of Object.entries(locales['en'])) {
    const enPlaceholders = String(enValue).match(placeholderRegex);
    if (!enPlaceholders) continue;
    
    const localeValue = data[key];
    if (!localeValue) continue;
    
    const localePlaceholders = String(localeValue).match(placeholderRegex);
    if (localePlaceholders) {
      const enSorted = enPlaceholders.sort().join(',');
      const localeSorted = localePlaceholders.sort().join(',');
      if (enSorted !== localeSorted) {
        placeholderMismatch++;
      }
    }
  }
  if (placeholderMismatch > 0) {
    console.log(`   ⚠️  ${placeholderMismatch} placeholder mismatch(es)`);
    warnings++;
  }
}

// Check RTL configuration
console.log('\n🔍 Checking RTL configuration...');
const rtlLocales = ['ar', 'fa', 'he'];
for (const locale of rtlLocales) {
  if (localeFiles.includes(locale)) {
    console.log(`✅ ${locale} is present (RTL)`);
  } else {
    console.log(`❌ ${locale} is missing (RTL)`);
    errors++;
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 i18n Validation Summary:');
console.log(`   Locales: ${localeFiles.length}`);
console.log(`   Errors: ${errors}`);
console.log(`   Warnings: ${warnings}`);

if (errors === 0) {
  console.log('\n✅ All locale files are valid!');
  process.exit(0);
} else {
  console.log(`\n❌ Found ${errors} error(s)`);
  process.exit(1);
}
