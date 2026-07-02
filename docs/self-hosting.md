# Self-Hosting Aura Cloud

Guide for deploying Aura Cloud server for team/org use.

## Overview

Aura Cloud is a self-hostable E2EE sync relay server. It stores encrypted blobs only — the server never has access to plaintext data.

## Requirements

- Node.js 20+
- 512MB RAM minimum
- 1GB disk space
- TLS certificate (recommended)

## Quick Start

### 1. Clone and build

```bash
git clone https://github.com/hbx12/aura-work.git
cd aura-work
npm install
npm run build:cloud
```

### 2. Configure environment

Create `.env` in the project root:

```bash
# Server port
AURA_CLOUD_PORT=47828

# Authentication token (generate with: openssl rand -hex 32)
AURA_CLOUD_ADMIN_TOKEN=your-admin-token-here

# Storage path
AURA_CLOUD_STORAGE_PATH=./data

# Max upload size (bytes)
AURA_CLOUD_MAX_UPLOAD=10485760  # 10MB

# Rate limiting
AURA_CLOUD_RATE_LIMIT=100  # requests per minute per IP
```

### 3. Start the server

```bash
npm run cloud-server
```

The server will start on `http://127.0.0.1:47828`.

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY server/aura-cloud ./server/aura-cloud
COPY packages/shared ./packages/shared

RUN npm ci --omit=dev

EXPOSE 47828

CMD ["node", "server/aura-cloud/dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  aura-cloud:
    build: .
    ports:
      - "47828:47828"
    environment:
      - AURA_CLOUD_PORT=47828
      - AURA_CLOUD_ADMIN_TOKEN=${AURA_CLOUD_ADMIN_TOKEN}
      - AURA_CLOUD_STORAGE_PATH=/data
    volumes:
      - aura-cloud-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:47828/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  aura-cloud-data:
```

### Run with Docker Compose

```bash
# Set admin token
export AURA_CLOUD_ADMIN_TOKEN=$(openssl rand -hex 32)

# Start
docker-compose up -d

# Check logs
docker-compose logs -f aura-cloud

# Stop
docker-compose down
```

---

## Reverse Proxy (Nginx)

### Nginx configuration

```nginx
server {
    listen 443 ssl http2;
    server_name cloud.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/cloud.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cloud.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:47828;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Max upload size
        client_max_body_size 10M;
    }
}
```

### Enable with Certbot

```bash
sudo certbot --nginx -d cloud.yourdomain.com
```

---

## Reverse Proxy (Caddy)

### Caddyfile

```
cloud.yourdomain.com {
    reverse_proxy localhost:47828
    request_body {
        max_size 10MB
    }
}
```

Caddy automatically provisions TLS certificates.

---

## Health Check

```bash
curl http://localhost:47828/health
```

Response:
```json
{
  "status": "ok",
  "version": "0.7.0",
  "uptime": 3600,
  "storage": {
    "envelopes": 42,
    "accounts": 3
  }
}
```

---

## Backup & Restore

### Backup

```bash
# Stop the server
docker-compose down

# Backup data directory
tar -czf aura-cloud-backup-$(date +%Y%m%d).tar.gz ./data

# Restart
docker-compose up -d
```

### Restore

```bash
# Stop the server
docker-compose down

# Restore data
tar -xzf aura-cloud-backup-20260701.tar.gz

# Restart
docker-compose up -d
```

---

## Monitoring

### Prometheus metrics

The server exposes metrics at `/metrics`:

```bash
curl http://localhost:47828/metrics
```

### Grafana dashboard

Import the provided dashboard from `docs/grafana-aura-cloud.json`.

---

## Security Considerations

1. **Always use TLS** in production
2. **Rotate admin tokens** regularly
3. **Limit upload size** to prevent abuse
4. **Enable rate limiting** to prevent DDoS
5. **Monitor logs** for suspicious activity
6. **Keep dependencies updated** with `npm audit`

---

## Troubleshooting

### Server won't start

Check if port is in use:
```bash
lsof -i :47828
```

### High memory usage

Reduce cache TTL in configuration or increase server memory.

### Sync failures

Check client logs and ensure the admin token matches.

---

## Support

- [GitHub Issues](https://github.com/hbx12/aura-work/issues)
- [GitHub Discussions](https://github.com/hbx12/aura-work/discussions)
