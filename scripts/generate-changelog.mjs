#!/usr/bin/env node

/**
 * Aura Work — Changelog Generator
 * Generates CHANGELOG.md from conventional commits.
 */

import fs from 'fs';
import { execSync } from 'child_process';

const TYPES = {
  feat: '🚀 Features',
  fix: '🐛 Bug Fixes',
  docs: '📚 Documentation',
  style: '💅 Styles',
  refactor: '♻️ Refactoring',
  test: '🧪 Tests',
  chore: '🔧 Chores',
  perf: '⚡ Performance',
  ci: '👷 CI',
  build: '📦 Build',
  revert: '⏪ Reverts',
};

function getCommits(fromTag) {
  const range = fromTag ? `${fromTag}..HEAD` : 'HEAD';
  try {
    const log = execSync(`git log ${range} --pretty=format:"%H|%s|%an|%ad" --date=short`, { encoding: 'utf8' });
    return log.split('\n').filter(Boolean).map(line => {
      const [hash, subject, author, date] = line.split('|');
      return { hash, subject, author, date };
    });
  } catch (e) {
    return [];
  }
}

function categorizeCommits(commits) {
  const categories = {};
  
  for (const commit of commits) {
    const match = commit.subject.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)/);
    if (match) {
      const [, type, scope, description] = match;
      const category = TYPES[type] || '📋 Other Changes';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        ...commit,
        description,
        scope,
      });
    }
  }
  
  return categories;
}

function generateChangelog() {
  const commits = getCommits();
  const categories = categorizeCommits(commits);
  
  let changelog = '# Changelog\n\n';
  changelog += `Generated on ${new Date().toISOString().split('T')[0]}\n\n`;
  
  for (const [category, items] of Object.entries(categories)) {
    changelog += `## ${category}\n\n`;
    for (const item of items) {
      const scope = item.scope ? `**${item.scope}:** ` : '';
      changelog += `- ${scope}${item.description} (${item.hash.substring(0, 7)})\n`;
    }
    changelog += '\n';
  }
  
  return changelog;
}

const changelog = generateChangelog();
fs.writeFileSync('CHANGELOG-GENERATED.md', changelog);
console.log('✅ Generated CHANGELOG-GENERATED.md');
console.log(`   Total entries: ${changelog.split('\n').filter(l => l.startsWith('- ')).length}`);
