# Aura Work — Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Aura Work, please report it responsibly.

### How to Report

1. **DO NOT** open a public GitHub issue
2. Email security concerns to: [INSERT EMAIL]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Fix timeline**: Depends on severity

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| **Critical** | Remote code execution, data breach | 24-48 hours |
| **High** | Authentication bypass, privilege escalation | 3-5 days |
| **Medium** | Information disclosure, denial of service | 7-14 days |
| **Low** | Minor issues, best practice violations | 30 days |

---

## Security Measures

### Local Security

- **Encrypted Vault**: API keys stored with OS-backed secure storage
  - Windows: DPAPI
  - macOS: Keychain
  - Linux: Secret Service
- **SQLite Encryption**: Database encrypted at rest
- **Sidecar Auth**: Per-session Bearer tokens (32+ chars)

### Network Security

- **Localhost Only**: Sidecars listen on 127.0.0.1
- **No Telemetry**: No data sent to external servers
- **E2EE Cloud Sync**: Server never sees plaintext

### Code Security

- **CSP Headers**: Chrome extension has Content Security Policy
- **Input Validation**: All inputs validated with Zod
- **No eval()**: No dynamic code execution
- **Dependency Scanning**: Automated vulnerability scanning

---

## Security Auditing

### Automated Checks

```bash
# npm audit
npm audit --audit-level=high

# Cargo audit
cargo audit -f apps/desktop/src-tauri/Cargo.lock

# Security audit script
node scripts/security-audit.mjs
```

### Manual Checks

1. Review code for hardcoded secrets
2. Check for SQL injection vulnerabilities
3. Verify input validation
4. Test authentication flows
5. Review permission model

---

## Secure Development

### Guidelines

1. **Never commit secrets**
   - Use `.env` files (gitignored)
   - Use OS secure storage for API keys
   - Rotate keys regularly

2. **Validate all inputs**
   - Use Zod schemas
   - Sanitize user input
   - Validate file paths

3. **Follow principle of least privilege**
   - Minimal permissions
   - Sandboxed execution
   - Explicit approval for high-impact actions

4. **Keep dependencies updated**
   - Run `npm audit` regularly
   - Update dependencies promptly
   - Review changelogs for security fixes

### Code Review Checklist

- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Error handling proper
- [ ] No SQL injection
- [ ] No XSS vulnerabilities
- [ ] Authentication checked
- [ ] Authorization verified
- [ ] Logging appropriate

---

## Security Features

### Vault Encryption

```typescript
// Keys are encrypted with:
// - ChaCha20Poly1305 (encryption)
// - Argon2 (key derivation)
// - OS secure storage (key protection)
```

### Sidecar Authentication

```typescript
// All sidecar requests require:
Authorization: Bearer <token>
// Token must be 32+ characters
```

### Permission Model

```typescript
// High-impact actions require approval:
// - File writes
// - Shell execution
// - Network requests
// - Database modifications
```

---

## Incident Response

### If a Vulnerability is Found

1. **Assess** the severity and impact
2. **Contain** the vulnerability
3. **Fix** the issue
4. **Test** the fix
5. **Release** a patch
6. **Notify** affected users
7. **Document** lessons learned

### Communication

- Security advisories on GitHub
- Release notes mention security fixes
- Email notifications for critical issues

---

## Bug Bounty

Currently, Aura Work does not have a formal bug bounty program. However, we appreciate responsible disclosure and will:

- Credit reporters in release notes
- Provide Aura Work swag (when available)
- Prioritize fixing reported issues

---

## Contact

For security concerns:
- Email: [INSERT EMAIL]
- GitHub: Use private vulnerability reporting

For general questions:
- GitHub Discussions: [Link]
- Matrix: [Link]

---

## Acknowledgments

We thank the security researchers who have helped improve Aura Work's security:

- [List will be updated as reports are received]

---

## Updates

This security policy is reviewed and updated regularly. Last updated: 2026-07-01.
