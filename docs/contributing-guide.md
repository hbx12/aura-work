# Aura Work — Contributing Guide

Thank you for your interest in contributing to Aura Work!

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Adding Features](#adding-features)
- [Reporting Issues](#reporting-issues)
- [Community](#community)

---

## Getting Started

### Ways to Contribute

1. **Report bugs** — Open an issue with reproduction steps
2. **Suggest features** — Open an issue with your idea
3. **Fix issues** — Pick an issue and submit a PR
4. **Add translations** — Help translate to your language
5. **Add marketplace items** — Create skills, MCP connectors, or plugins
6. **Improve documentation** — Fix typos, add examples, clarify instructions
7. **Write tests** — Increase test coverage

### Good First Issues

Look for issues labeled `good first issue`:
- [Good First Issues](https://github.com/hbx12/aura-work/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

---

## Development Setup

### Prerequisites

- Node.js 20+
- Rust (latest stable)
- Git

### Setup Steps

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/aura-work.git
cd aura-work

# 2. Install dependencies
npm install

# 3. Build sidecars
npm run build:sidecars

# 4. Start development
npm run dev
```

### Environment Variables

Create `.env` file:

```bash
AURA_SIDECAR_AUTH_TOKEN=your-token-here-min-32-chars
```

---

## Code Style

### TypeScript/JavaScript

- **Formatter:** Prettier
- **Linter:** ESLint
- **Style:** Follow existing code patterns

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format

# Run linter
npm run lint

# Fix lint issues
npm run lint:fix
```

### Rust

- **Formatter:** rustfmt
- **Style:** Follow Rust conventions

```bash
cd apps/desktop/src-tauri
cargo fmt
cargo clippy
```

### CSS

- Use design tokens from `packages/ui/src/tokens.css`
- No hardcoded colors or font sizes
- Support RTL layouts

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting (no code change) |
| `refactor` | Code refactoring |
| `test` | Adding tests |
| `chore` | Maintenance |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |
| `build` | Build system changes |

### Examples

```bash
feat(i18n): add Hebrew locale support
fix(ui): resolve theme selector overflow
docs(readme): update installation instructions
test(agent): add unit tests for routing engine
chore(deps): update dependencies
```

---

## Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feat/my-feature
# or
git checkout -b fix/my-bugfix
```

### 2. Make Changes

- Write clean, well-documented code
- Add tests for new features
- Update documentation if needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run linter
npm run lint

# Run specific tests
npm run test:sidecars
```

### 4. Commit

```bash
git add .
git commit -m "feat(scope): description"
```

### 5. Push and Create PR

```bash
git push origin feat/my-feature
```

Then create a PR on GitHub.

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Documentation updated (if applicable)
- [ ] Arabic translations added (for UI changes)
- [ ] Commit messages follow convention

---

## Adding Features

### Adding a New Language

1. Create locale file: `packages/i18n/locales/xx.json`
2. Update `packages/i18n/src/catalog.ts`:
   - Add to `LocaleId` type
   - Add to `SUPPORTED_LOCALES` array
   - Add to `RTL_LOCALES` if RTL
   - Add to `CATALOG` object
3. Run tests: `npm run test:sidecars`
4. Update acceptance test if needed

### Adding a Marketplace Item

1. Add to `registry/marketplace.json`
2. Include Arabic localization
3. Add icon and cover images
4. Run validation: `node scripts/validate-marketplace.mjs`

### Adding a New Sidecar

1. Create directory: `sidecar/my-sidecar/`
2. Add `package.json`, `tsconfig.json`, `src/index.ts`
3. Add to root `package.json` workspaces
4. Add build script
5. Update CI workflow

---

## Reporting Issues

### Bug Reports

Include:
1. **OS and version**
2. **Node.js version** (`node --version`)
3. **Rust version** (`rustc --version`)
4. **Steps to reproduce**
5. **Expected behavior**
6. **Actual behavior**
7. **Error logs** (terminal output)

### Feature Requests

Include:
1. **Problem description**
2. **Proposed solution**
3. **Alternatives considered**
4. **Additional context**

---

## Community

### Getting Help

- [GitHub Discussions](https://github.com/hbx12/aura-work/discussions)
- [Matrix Chat](https://matrix.to/#/#aura-os:matrix.org)

### Code of Conduct

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md).

### License

By contributing, you agree that your contributions will be licensed under the project's license.

---

## Thank You!

Your contributions help make Aura Work better for everyone. We appreciate your time and effort! 🎉
