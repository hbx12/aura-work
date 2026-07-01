# Aura Work — Testing Guide

Complete guide for testing in Aura Work.

## Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)

---

## Overview

Aura Work uses multiple testing levels:

1. **Unit Tests** — Test individual functions and components
2. **Integration Tests** — Test component interactions
3. **Acceptance Tests** — Test end-to-end workflows
4. **Rust Tests** — Test Tauri backend code

### Testing Stack

- **Framework**: Vitest 4.1
- **Coverage**: @vitest/coverage-v8
- **Assertions**: Vitest built-in assertions
- **Mocking**: Vitest built-in mocking

---

## Running Tests

### All Tests

```bash
npm test
```

### Sidecar Tests

```bash
npm run test:sidecars
```

### Rust Tests

```bash
npm run test:rust
```

### Acceptance Tests

```bash
npm run test:acceptance
```

### With Coverage

```bash
npm run test:coverage
```

### Watch Mode

```bash
npx vitest --watch
```

---

## Writing Tests

### File Naming

- Test files: `*.test.ts` or `*.spec.ts`
- Location: Same directory as source or `__tests__/` folder

### Basic Test Structure

```typescript
import { describe, it, expect } from "vitest";

describe("MyFeature", () => {
  it("should do something", () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });

  it("should handle errors", () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Testing Async Code

```typescript
it("should handle async operations", async () => {
  const result = await myAsyncFunction();
  expect(result).toBeDefined();
});
```

### Testing with Mocks

```typescript
import { vi } from "vitest";

it("should mock external dependency", () => {
  const mockFn = vi.fn().mockReturnValue("mocked");
  const result = myFunction(mockFn);
  expect(result).toBe("mocked");
  expect(mockFn).toHaveBeenCalled();
});
```

### Testing Types

```typescript
it("should have correct type", () => {
  const result: MyType = myFunction();
  expect(typeof result).toBe("object");
  expect(result).toHaveProperty("key");
});
```

---

## Test Coverage

### Running with Coverage

```bash
npm run test:coverage
```

### Coverage Thresholds

Current thresholds (enforced in CI):
- Lines: 10%
- Functions: 10%
- Branches: 10%
- Statements: 10%

### Viewing Coverage Report

```bash
# Open HTML report
open coverage/index.html
```

### Improving Coverage

1. Identify uncovered code: `npx vitest --coverage`
2. Write tests for uncovered functions
3. Focus on critical paths first
4. Aim for 80%+ coverage on new code

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Every push to `main`
- Every pull request
- Scheduled runs (weekly)

### Test Jobs

1. **build-test** — Runs on Ubuntu, Windows, macOS
2. **coverage** — Generates coverage report
3. **acceptance** — Runs acceptance tests

### Failure Handling

- Tests must pass before merging
- Coverage must meet thresholds
- Linting must pass

---

## Test Categories

### Sidecar Tests

Located in `sidecar/*/src/*.test.ts`

```typescript
// sidecar/aura-agent/src/routing.test.ts
describe("Routing Engine", () => {
  it("should route to quality provider", () => {
    const decision = routeRequest({ policy: "quality" });
    expect(decision.provider).toBe("openai");
  });
});
```

### Package Tests

Located in `packages/*/src/*.test.ts`

```typescript
// packages/i18n/src/catalog.test.ts
describe("i18n Catalog", () => {
  it("should have all locales", () => {
    expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(25);
  });
});
```

### Acceptance Tests

Located in `qa/acceptance-suite/src/tests/*.test.ts`

```typescript
describe("Infrastructure", () => {
  it("should have 25 locale files", () => {
    const locales = listLocaleFiles();
    expect(locales).toHaveLength(25);
  });
});
```

---

## Best Practices

### Do's

- Write descriptive test names
- Test edge cases
- Use meaningful assertions
- Keep tests independent
- Mock external dependencies
- Test error handling

### Don'ts

- Don't test implementation details
- Don't write fragile tests
- Don't skip tests without reason
- Don't test third-party code
- Don't ignore flaky tests

---

## Debugging Tests

### Running Specific Tests

```bash
# Run specific file
npx vitest run path/to/test.ts

# Run specific test
npx vitest run -t "test name"

# Run with debug output
DEBUG=* npx vitest run
```

### Common Issues

1. **Timeout**: Increase timeout in test config
2. **Mock not working**: Check mock setup
3. **Async issues**: Use `async/await` properly
4. **Import errors**: Check module resolution

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Mock Service Worker](https://mswjs.io/)
