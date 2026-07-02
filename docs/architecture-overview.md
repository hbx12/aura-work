# Aura Work — Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop App (Tauri)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   React UI  │  │   Rust Core │  │   WebView   │        │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘        │
│         │                │                                  │
│         └────────────────┼──────────────────────────────┐  │
│                          │                              │  │
│  ┌───────────────────────┼──────────────────────────────┘  │
│  │                       │                                  │
│  ▼                       ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Sidecar Manager                         │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │   │
│  │  │ Agent   │ │ Browser │ │ VM      │ │ Plugins │  │   │
│  │  │ :47821  │ │ :47823  │ │ :47822  │ │ :47824  │  │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │   │
│  │       │           │           │           │        │   │
│  │  ┌────┴────┐ ┌────┴────┐ ┌────┴────┐             │   │
│  │  │ Cloud   │ │ Bridge  │ │ Computer│             │   │
│  │  │ :47825  │ │ :47826  │ │ :47827  │             │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘             │   │
│  └───────┼───────────┼───────────┼─────────────────────┘   │
│          │           │           │                          │
└──────────┼───────────┼───────────┼──────────────────────────┘
           │           │           │
           ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Cloud   │ │  Chrome  │ │   OS     │
    │  Server  │ │ Extension│ │  APIs    │
    │ :47828   │ │          │ │          │
    └──────────┘ └──────────┘ └──────────┘
```

## Component Overview

### Desktop App (Tauri)

The main application built with:
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Rust (Tauri 2)
- **Database**: SQLite (local)
- **Encryption**: ChaCha20Poly1305 + Argon2

### Sidecars

Independent microservices that run alongside the desktop app:

| Sidecar | Port | Purpose |
|---------|------|---------|
| **Agent** | 47821 | Task engine, provider routing, MCP |
| **VM Helper** | 47822 | Linux VM workspace execution |
| **Browser Helper** | 47823 | Chromium browser automation |
| **Plugins Helper** | 47824 | Plugin management, marketplace |
| **Cloud Sync** | 47825 | E2EE cloud synchronization |
| **Bridge** | 47826 | Chrome extension + Office add-in |
| **Computer Use** | 47827 | Screen/app automation (experimental) |

### Cloud Server

Self-hostable E2EE sync relay:
- Stores encrypted blobs only
- Never has access to plaintext
- Supports multi-device sync

## Data Flow

### Task Execution

```
User Input → UI → Agent Sidecar → Provider API → Response → UI
                    ↓
              [Optional: VM, Browser, Plugins]
```

### Cloud Sync

```
Desktop → Encrypt → Cloud Server → Other Devices
                                   ↓
                              Decrypt → Desktop
```

## Security Model

### Local Security

- API keys stored in OS secure storage (DPAPI/Keychain/Secret Service)
- SQLite database encrypted at rest
- Sidecar authentication via per-session Bearer tokens

### Cloud Security

- End-to-end encryption (E2EE)
- Server never sees plaintext data
- Client-side key management

### Permission Model

- High-impact actions require explicit approval
- File operations are sandboxed
- Network access is controlled per-sidecar

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Tauri 2 (Rust) |
| Frontend | React 19, TypeScript 5.8, Vite 8 |
| UI Components | Custom @aura-os/ui |
| Backend | Node.js 20+ (sidecars) |
| Database | SQLite (rusqlite) |
| Encryption | ChaCha20Poly1305, Argon2 |
| Browser Automation | Puppeteer Core |
| MCP | @modelcontextprotocol/sdk |
| Testing | Vitest 4.1, Cargo Test |
| Build | esbuild, Tauri CLI |
| CI/CD | GitHub Actions |

## Development Patterns

### Sidecar Communication

All sidecars communicate via HTTP on localhost with:
- Bearer token authentication
- JSON request/response bodies
- Consistent error handling

### State Management

- React state for UI
- SQLite for persistent data
- In-memory caches for sidecars

### Error Handling

- Typed errors with Zod validation
- Graceful degradation
- User-friendly error messages

## Performance Considerations

- Lazy loading for page components
- Code splitting for Monaco Editor
- Virtual scrolling for long lists
- Debounced search inputs
- Marketplace data caching

## Future Architecture

### Planned Improvements

- Unix sockets / Named pipes for IPC
- WebAssembly for sidecar plugins
- Distributed task execution
- Multi-cloud sync support
