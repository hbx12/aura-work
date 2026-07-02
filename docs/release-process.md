# Aura Work — Release Process

Guide for releasing new versions of Aura Work.

## Table of Contents

- [Version Numbering](#version-numbering)
- [Release Checklist](#release-checklist)
- [Creating a Release](#creating-a-release)
- [Post-Release](#post-release)

---

## Version Numbering

Aura Work uses [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH-prerelease
```

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)
- **prerelease**: Alpha/beta/rc tags

### Current Version

```
0.1.0-alpha.11
```

### Version Locations

Update version in:
1. `package.json` (root)
2. `apps/desktop/package.json`
3. `packages/*/package.json`
4. `sidecar/*/package.json`
5. `apps/desktop/src-tauri/tauri.conf.json`

---

## Release Checklist

### Pre-Release

- [ ] All tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version numbers consistent
- [ ] Security audit passed
- [ ] Marketplace validation passed

### Build

- [ ] Sidecars built (`npm run build:sidecars`)
- [ ] Bundle staged (`npm run stage:bundle`)
- [ ] Desktop app built (`npm run build`)
- [ ] Tauri installer built (`npm run tauri build`)

### Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Acceptance tests pass
- [ ] Manual testing on Windows
- [ ] Manual testing on macOS
- [ ] Manual testing on Linux

### Documentation

- [ ] README.md updated
- [ ] README.ar.md updated
- [ ] CHANGELOG.md updated
- [ ] API docs updated (if applicable)

### Security

- [ ] No known vulnerabilities
- [ ] Dependencies audited
- [ ] Secrets scan clean
- [ ] CSP headers configured

---

## Creating a Release

### 1. Update Version

```bash
# Update package.json versions
node scripts/check-versions.mjs

# Update Cargo.toml version
cd apps/desktop/src-tauri
# Edit Cargo.toml version
```

### 2. Update CHANGELOG

```bash
node scripts/generate-changelog.mjs
# Review and merge CHANGELOG-GENERATED.md into CHANGELOG.md
```

### 3. Run Release Checklist

```bash
node scripts/release-checklist.mjs
```

### 4. Create Git Tag

```bash
git tag -a v0.1.0-alpha.12 -m "Release v0.1.0-alpha.12"
git push origin v0.1.0-alpha.12
```

### 5. GitHub Release

1. Go to [GitHub Releases](https://github.com/hbx12/aura-work/releases)
2. Click "Create a new release"
3. Select the tag
4. Add release notes from CHANGELOG
5. Upload installers
6. Publish release

### 6. Automated Release

The CI will automatically:
- Build installers for all platforms
- Run all tests
- Create release artifacts
- Upload to GitHub Releases

---

## Post-Release

### Verify

- [ ] GitHub Release created
- [ ] Installers downloadable
- [ ] Documentation deployed
- [ ] Marketplace updated

### Announce

- [ ] GitHub Discussions post
- [ ] Social media (if applicable)
- [ ] Update website (if applicable)

### Monitor

- [ ] Watch for issues
- [ ] Monitor error reports
- [ ] Check download stats

---

## Hotfix Process

For critical bugs in production:

1. Create hotfix branch from release tag
2. Fix the bug
3. Test thoroughly
4. Create patch release
5. Deploy immediately

```bash
git checkout -b hotfix/v0.1.0-alpha.12.1 v0.1.0-alpha.12
# Fix bug
git commit -m "fix: critical bug description"
git tag -a v0.1.0-alpha.12.1 -m "Hotfix v0.1.0-alpha.12.1"
git push origin v0.1.0-alpha.12.1
```

---

## Release Automation

### GitHub Actions

The release workflow (`release.yml`) automates:
- Building installers
- Running tests
- Creating GitHub Release
- Uploading artifacts

### Manual Trigger

```bash
gh workflow run release.yml -f version=0.1.0-alpha.12
```

---

## Troubleshooting

### Build Fails

1. Check Node.js version (20+)
2. Check Rust version (latest stable)
3. Clear caches: `npm run clean`
4. Reinstall dependencies: `npm ci`

### Tests Fail

1. Run tests locally: `npm test`
2. Check for environment issues
3. Review test logs

### Release Not Creating

1. Check GitHub token permissions
2. Verify tag format
3. Check workflow logs

---

## Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
