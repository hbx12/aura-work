# Aura Work — Performance Guide

Guide for optimizing Aura Work performance.

## Table of Contents

- [Overview](#overview)
- [Desktop App](#desktop-app)
- [Sidecars](#sidecars)
- [Database](#database)
- [Network](#network)
- [Monitoring](#monitoring)

---

## Overview

Aura Work is designed for performance with:
- Lazy loading for page components
- Code splitting for large bundles
- Virtual scrolling for long lists
- Caching for frequently accessed data
- Debounced user inputs

---

## Desktop App

### Bundle Size

Current bundle sizes:
- Main bundle: ~4.3 MB (gzipped: ~1.1 MB)
- Monaco Editor: ~2 MB (lazy loaded)
- CSS: ~256 KB (gzipped: ~44 KB)

### Optimization Strategies

#### 1. Code Splitting

```typescript
// Lazy load page components
const BrowserPage = React.lazy(() => import('./components/BrowserPage'));
const PluginsPage = React.lazy(() => import('./components/PluginsPage'));
```

#### 2. Tree Shaking

Ensure unused code is eliminated:
```typescript
// Good: Import only what you need
import { debounce } from 'lodash-es';

// Bad: Import entire library
import _ from 'lodash';
```

#### 3. Image Optimization

- Use SVG for icons
- Compress images
- Use responsive images

---

## Sidecars

### Startup Time

Target: < 2 seconds for each sidecar

### Optimization

1. **Lazy Loading**: Load modules on demand
2. **Connection Pooling**: Reuse HTTP connections
3. **Caching**: Cache frequently accessed data

### Memory Usage

Target: < 100 MB per sidecar

```typescript
// Monitor memory usage
const used = process.memoryUsage();
console.log(`Memory: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
```

---

## Database

### SQLite Optimization

#### 1. Indexing

```sql
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

#### 2. WAL Mode

```sql
PRAGMA journal_mode=WAL;
```

#### 3. Connection Pooling

```typescript
// Reuse database connections
const db = new Database('aura.db', { 
  readonly: false,
  fileMustExist: true 
});
```

### Query Optimization

1. Use specific SELECT clauses
2. Avoid N+1 queries
3. Use prepared statements
4. Batch operations

---

## Network

### HTTP Optimization

1. **Compression**: Enable gzip/brotli
2. **Connection Reuse**: Keep-alive connections
3. **Request Batching**: Batch multiple requests

### Cloud Sync

1. **Delta Sync**: Only sync changed data
2. **Compression**: Compress payloads
3. **Retry Logic**: Exponential backoff

---

## Monitoring

### Performance Metrics

```typescript
// Track operation duration
const start = performance.now();
await operation();
const duration = performance.now() - start;
console.log(`Operation took ${duration}ms`);
```

### Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| App startup | < 3s | ~2s |
| Sidecar startup | < 2s | ~1s |
| Task execution | < 5s | ~3s |
| Memory usage | < 500MB | ~300MB |
| Bundle size | < 5MB | ~4.3MB |

### Monitoring Tools

1. **Chrome DevTools**: Performance profiling
2. **Rust Profiler**: Backend profiling
3. **Vitest Coverage**: Code coverage
4. **Bundle Analyzer**: Bundle size analysis

---

## Best Practices

### Do's

- Use lazy loading for routes
- Implement virtual scrolling
- Cache expensive operations
- Debounce user inputs
- Use Web Workers for heavy tasks

### Don'ts

- Don't render unnecessary DOM nodes
- Don't make redundant API calls
- Don't store large objects in state
- Don't use synchronous operations
- Don't ignore memory leaks

---

## Profiling

### Chrome DevTools

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Perform actions
5. Stop recording
6. Analyze results

### Rust Profiling

```bash
# Enable profiling
RUSTFLAGS="-C instrument-coverage" cargo build

# Run with profiling
./target/debug/aura-desktop
```

---

## Optimization Checklist

- [ ] Lazy load routes
- [ ] Code split large bundles
- [ ] Virtual scroll long lists
- [ ] Cache API responses
- [ ] Debounce user inputs
- [ ] Optimize images
- [ ] Database indexing
- [ ] Connection pooling
- [ ] Memory monitoring
- [ ] Bundle analysis

---

## Resources

- [React Performance](https://react.dev/reference/react)
- [Vite Performance](https://vitejs.dev/guide/performance)
- [Tauri Performance](https://tauri.app/v1/references/performance)
