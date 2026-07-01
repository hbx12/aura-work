# Aura Work — API Reference

Complete API reference for all sidecar endpoints.

## Table of Contents

- [Authentication](#authentication)
- [Agent Sidecar](#agent-sidecar)
- [VM Helper](#vm-helper)
- [Browser Helper](#browser-helper)
- [Plugins Helper](#plugins-helper)
- [Cloud Sync](#cloud-sync)
- [Bridge](#bridge)

---

## Authentication

All sidecar endpoints require Bearer token authentication:

```
Authorization: Bearer <AURA_SIDECAR_AUTH_TOKEN>
```

The token must be 32+ characters and match between the desktop app and sidecars.

---

## Agent Sidecar

**Port:** 47821

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "version": "0.4.0",
  "capabilities": ["task", "vm", "browser", "plugins", "cloud"]
}
```

### Validate Provider

```
POST /providers/validate
```

Request:
```json
{
  "providerId": "openai",
  "credentials": {
    "apiKey": "sk-..."
  }
}
```

Response:
```json
{
  "valid": true,
  "message": "Credentials are valid"
}
```

### List Models

```
POST /providers/models
```

Request:
```json
{
  "providerId": "openai",
  "credentials": {
    "apiKey": "sk-..."
  }
}
```

### Chat Completion

```
POST /chat
```

Request:
```json
{
  "providerId": "openai",
  "modelId": "gpt-4",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "credentials": {
    "apiKey": "sk-..."
  }
}
```

### Route Request

```
POST /route
```

Request:
```json
{
  "policy": "quality",
  "context": {
    "allowedProviders": ["openai", "anthropic"]
  }
}
```

### Task Plan

```
POST /task/plan
```

Request:
```json
{
  "projectId": "my-project",
  "prompt": "Create a todo app"
}
```

### Task Iterate

```
POST /task/iterate
```

Request:
```json
{
  "projectId": "my-project",
  "taskId": "task-123",
  "iteration": 1
}
```

---

## VM Helper

**Port:** 47822

### Health Check

```
GET /health
```

### Execute Command

```
POST /exec
```

Request:
```json
{
  "command": "ls -la",
  "cwd": "/workspace"
}
```

---

## Browser Helper

**Port:** 47823

### Health Check

```
GET /health
```

### Navigate

```
POST /navigate
```

Request:
```json
{
  "url": "https://example.com"
}
```

### Screenshot

```
POST /screenshot
```

---

## Plugins Helper

**Port:** 47824

### Health Check

```
GET /health
```

### List Plugins

```
GET /plugins
```

### Execute Plugin

```
POST /plugins/execute
```

---

## Cloud Sync

**Port:** 47825

### Health Check

```
GET /health
```

### Sync Status

```
GET /status
```

### Push Envelopes

```
POST /push
```

### Pull Envelopes

```
POST /pull
```

---

## Bridge

**Port:** 47826

### Health Check

```
GET /health
```

### Pair Device

```
POST /pair
```

Request:
```json
{
  "code": "123456"
}
```

### Send Command

```
POST /command
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or missing auth token |
| `INVALID_REQUEST` | Malformed request body |
| `PROVIDER_ERROR` | External provider API error |
| `INTERNAL_ERROR` | Server-side error |
| `RATE_LIMITED` | Too many requests |

---

## Rate Limiting

- **Default:** 100 requests per minute per IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Response:** 429 Too Many Requests with `Retry-After` header
