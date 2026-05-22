# IaC Security Reference: Dockerfile & Docker Compose

## Dockerfile Security Patterns

### 1. Running as Root (Missing USER Directive)

- **Severity:** High
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
# Check for absence of USER directive
grep -c "^USER" Dockerfile  # Should be >= 1
```

**Vulnerable:**
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "server.js"]
# No USER directive — runs as root
```

**Secure:**
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
CMD ["node", "server.js"]
```

---

### 2. Unpinned Base Images (Using `latest` Tag)

- **Severity:** Medium
- **CWE:** CWE-1104 (Use of Unmaintained Third-Party Components)
- **OWASP:** A03:2025 (Software Supply Chain Failures)

**What to grep for:**
```
grep -E "^FROM\s+\S+(:latest)?$" Dockerfile
grep -E "^FROM\s+\S+\s*$" Dockerfile  # No tag at all defaults to latest
```

**Vulnerable:**
```dockerfile
FROM node:latest
FROM python
FROM ubuntu:latest
```

**Secure:**
```dockerfile
FROM node:18.19.0-alpine3.19@sha256:abcdef1234567890...
FROM python:3.12.1-slim-bookworm
FROM ubuntu:22.04
```

---

### 3. Using ADD Instead of COPY

- **Severity:** Medium
- **CWE:** CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
- **OWASP:** A08:2025 (Software and Data Integrity Failures)

**What to grep for:**
```
grep "^ADD" Dockerfile
```

**Vulnerable:**
```dockerfile
ADD https://example.com/app.tar.gz /app/
ADD . /app/
```

**Secure:**
```dockerfile
COPY . /app/
# If you need to download, use curl/wget explicitly so it's auditable:
RUN curl -fsSL https://example.com/app.tar.gz | tar xz -C /app/
```

**Note:** ADD auto-extracts tars and can fetch remote URLs, introducing supply chain risk. Use COPY for local files and explicit RUN commands for downloads.

---

### 4. Secrets in Build Args or ENV

- **Severity:** Critical
- **CWE:** CWE-798 (Use of Hard-coded Credentials)
- **OWASP:** A07:2025 (Identification and Authentication Failures)

**What to grep for:**
```
grep -iE "(ARG|ENV)\s+(PASSWORD|SECRET|API_KEY|TOKEN|PRIVATE_KEY|AWS_)" Dockerfile
grep -iE "ARG\s+\w*(password|secret|key|token)" Dockerfile
```

**Vulnerable:**
```dockerfile
ARG DB_PASSWORD=supersecret
ENV API_KEY=sk-1234567890abcdef
RUN echo "machine github.com login token $GITHUB_TOKEN" > ~/.netrc
```

**Secure:**
```dockerfile
# Use BuildKit secrets (never stored in image layers)
RUN --mount=type=secret,id=db_password cat /run/secrets/db_password
# Or use runtime secrets via orchestrator (Docker Swarm, K8s)
```

---

### 5. COPY . . Without .dockerignore

- **Severity:** High
- **CWE:** CWE-200 (Exposure of Sensitive Information)
- **OWASP:** A01:2025 (Broken Access Control)

**What to grep for:**
```
grep "COPY \. " Dockerfile
# Then check: does .dockerignore exist?
ls -la .dockerignore
```

**Vulnerable:**
```dockerfile
COPY . .
# Without .dockerignore, this copies:
# .env, .git/, node_modules/, *.pem, credentials.json, etc.
```

**Secure .dockerignore:**
```
.git
.env
.env.*
*.pem
*.key
node_modules
.aws
credentials.json
docker-compose*.yml
```

---

### 6. Missing .dockerignore File

- **Severity:** Medium
- **CWE:** CWE-200 (Exposure of Sensitive Information)
- **OWASP:** A01:2025 (Broken Access Control)

**What to grep for:**
```
# Check for file existence
test -f .dockerignore && echo "EXISTS" || echo "MISSING"
```

**Minimum recommended .dockerignore:**
```
.git
.gitignore
.env
.env.*
*.md
*.pem
*.key
*.crt
node_modules
__pycache__
.pytest_cache
.vscode
.idea
docker-compose*.yml
Dockerfile
```

---

### 7. Installing Unnecessary Packages

- **Severity:** Low
- **CWE:** CWE-1104 (Use of Unmaintained Third-Party Components)
- **OWASP:** A03:2025 (Software Supply Chain Failures)

**What to grep for:**
```
grep -E "apt-get install|apk add|yum install|dnf install" Dockerfile
# Look for: vim, curl, wget, net-tools, telnet, ssh, etc. in production images
```

**Vulnerable:**
```dockerfile
RUN apt-get update && apt-get install -y \
    vim curl wget net-tools telnet ssh gcc make
```

**Secure:**
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
```

---

### 8. Not Cleaning Package Manager Cache

- **Severity:** Low
- **CWE:** CWE-459 (Incomplete Cleanup)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep "apt-get install" Dockerfile | grep -v "rm -rf /var/lib/apt/lists"
grep "apk add" Dockerfile | grep -v "no-cache"
```

**Vulnerable:**
```dockerfile
RUN apt-get update
RUN apt-get install -y python3
# Cache left behind — larger image, stale package indexes
```

**Secure:**
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*

# For Alpine:
RUN apk add --no-cache python3
```

---

### 9. Using Full OS Images Instead of Alpine/Distroless

- **Severity:** Medium
- **CWE:** CWE-1104 (Use of Unmaintained Third-Party Components)
- **OWASP:** A03:2025 (Software Supply Chain Failures)

**What to grep for:**
```
grep -E "^FROM\s+(ubuntu|debian|centos|fedora|node:|python:|golang:|java:)" Dockerfile
# Flag if not using -slim, -alpine, or distroless variants
```

**Vulnerable:**
```dockerfile
FROM python:3.12        # ~1GB, hundreds of packages
FROM node:18            # ~900MB
FROM ubuntu:22.04       # ~77MB base, but full OS
```

**Secure:**
```dockerfile
FROM python:3.12-slim-bookworm    # ~150MB
FROM node:18-alpine               # ~170MB
FROM gcr.io/distroless/python3    # ~50MB, no shell
```

---

### 10. Missing HEALTHCHECK

- **Severity:** Low
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep -c "^HEALTHCHECK" Dockerfile  # Should be >= 1
```

**Vulnerable:**
```dockerfile
FROM node:18-alpine
CMD ["node", "server.js"]
# No health check — container may serve errors but appear "running"
```

**Secure:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

---

### 11. Exposed Unnecessary Ports

- **Severity:** Low
- **CWE:** CWE-284 (Improper Access Control)
- **OWASP:** A01:2025 (Broken Access Control)

**What to grep for:**
```
grep "^EXPOSE" Dockerfile
# Flag debug ports: 5005 (Java debug), 9229 (Node debug), 4200, 8080
```

**Vulnerable:**
```dockerfile
EXPOSE 3000
EXPOSE 9229   # Node.js debug port
EXPOSE 5005   # Java debug port
```

**Secure:**
```dockerfile
EXPOSE 3000
# Only expose the port your application actually needs
```

---

### 12. Missing Multi-Stage Build

- **Severity:** Medium
- **CWE:** CWE-1104 (Use of Unmaintained Third-Party Components)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep -c "^FROM" Dockerfile  # If only 1 FROM and build tools present, flag it
grep -E "(gcc|make|build-essential|maven|gradle|npm run build)" Dockerfile
```

**Vulnerable:**
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Build tools, devDependencies, source all in production image
CMD ["node", "dist/server.js"]
```

**Secure:**
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]
```

---

### 13. Using sudo in Dockerfile

- **Severity:** Medium
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep "sudo" Dockerfile
```

**Vulnerable:**
```dockerfile
USER appuser
RUN sudo apt-get update    # Defeats the purpose of non-root user
```

**Secure:**
```dockerfile
# Do privileged operations before switching user
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
USER appuser
```

---

### 14. WORKDIR Not Set

- **Severity:** Low
- **CWE:** CWE-427 (Uncontrolled Search Path Element)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep -c "^WORKDIR" Dockerfile  # Should be >= 1
```

**Vulnerable:**
```dockerfile
FROM node:18-alpine
COPY . .         # Copies into / (filesystem root)
CMD ["node", "server.js"]
```

**Secure:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
CMD ["node", "server.js"]
```

---

### 15. Shell Form vs Exec Form for CMD/ENTRYPOINT

- **Severity:** Low
- **CWE:** CWE-78 (OS Command Injection)
- **OWASP:** A05:2025 (Injection)

**What to grep for:**
```
grep -E "^(CMD|ENTRYPOINT)\s+[^[]" Dockerfile  # Shell form (no brackets)
```

**Vulnerable:**
```dockerfile
CMD npm start                    # Shell form: runs via /bin/sh -c
ENTRYPOINT python app.py         # PID 1 is shell, not your app
```

**Secure:**
```dockerfile
CMD ["npm", "start"]             # Exec form: app is PID 1
ENTRYPOINT ["python", "app.py"]  # Proper signal handling
```

**Note:** Shell form wraps the command in `/bin/sh -c`, which means signals (SIGTERM) go to the shell, not your app. This prevents graceful shutdown.

---

### 16. Missing LABEL for Image Metadata

- **Severity:** Info
- **CWE:** N/A
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep -c "^LABEL" Dockerfile  # Should be >= 1
```

**Secure:**
```dockerfile
LABEL maintainer="security@example.com"
LABEL org.opencontainers.image.source="https://github.com/org/repo"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.description="Production API server"
```

---

## Docker Compose Security Patterns

### 1. privileged: true

- **Severity:** Critical
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep "privileged:\s*true" docker-compose.yml
```

**Vulnerable:**
```yaml
services:
  app:
    image: myapp:latest
    privileged: true    # Full host kernel access, can escape container
```

**Secure:**
```yaml
services:
  app:
    image: myapp:latest
    # Add only specific capabilities if needed:
    cap_add:
      - NET_ADMIN
    cap_drop:
      - ALL
```

---

### 2. network_mode: host

- **Severity:** High
- **CWE:** CWE-284 (Improper Access Control)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep "network_mode:\s*host" docker-compose.yml
```

**Vulnerable:**
```yaml
services:
  app:
    image: myapp:latest
    network_mode: host    # No network isolation
```

**Secure:**
```yaml
services:
  app:
    image: myapp:latest
    networks:
      - app-network
    ports:
      - "127.0.0.1:3000:3000"

networks:
  app-network:
    driver: bridge
```

---

### 3. Mounting Docker Socket

- **Severity:** Critical
- **CWE:** CWE-269 (Improper Privilege Management)
- **OWASP:** A01:2025 (Broken Access Control)

**What to grep for:**
```
grep "docker.sock" docker-compose.yml
grep "/var/run/docker.sock" docker-compose.yml
```

**Vulnerable:**
```yaml
services:
  app:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      # Grants full control over Docker daemon = root on host
```

**Secure:**
```yaml
# If Docker API access is truly needed, use a proxy with filtering:
services:
  docker-proxy:
    image: tecnativa/docker-socket-proxy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      CONTAINERS: 1
      SERVICES: 0
      TASKS: 0
  app:
    depends_on:
      - docker-proxy
    environment:
      DOCKER_HOST: tcp://docker-proxy:2375
```

---

### 4. Mounting Sensitive Host Paths

- **Severity:** Critical
- **CWE:** CWE-552 (Files or Directories Accessible to External Parties)
- **OWASP:** A01:2025 (Broken Access Control)

**What to grep for:**
```
grep -E "^\s*-\s+/(etc|root|home|var/log|proc|sys|dev)" docker-compose.yml
grep -E "^\s*-\s+/:" docker-compose.yml    # Mounting entire root filesystem
```

**Vulnerable:**
```yaml
services:
  app:
    volumes:
      - /:/host            # Entire host filesystem
      - /etc:/etc          # Host configuration
      - /root:/root        # Root home directory
```

**Secure:**
```yaml
services:
  app:
    volumes:
      - app-data:/app/data    # Named volume
      - ./config:/app/config:ro  # Read-only bind mount of specific dir
    read_only: true
    tmpfs:
      - /tmp
```

---

### 5. Missing Resource Limits

- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep -A5 "deploy:" docker-compose.yml | grep "limits"
# If no deploy.resources.limits section exists, flag it
```

**Vulnerable:**
```yaml
services:
  app:
    image: myapp:latest
    # No resource limits — can consume all host resources (DoS)
```

**Secure:**
```yaml
services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    # For docker-compose v2 format:
    mem_limit: 512m
    cpus: 0.5
```

---

### 6. Hardcoded Passwords/Secrets in Environment

- **Severity:** Critical
- **CWE:** CWE-798 (Use of Hard-coded Credentials)
- **OWASP:** A07:2025 (Identification and Authentication Failures)

**What to grep for:**
```
grep -iE "(PASSWORD|SECRET|API_KEY|TOKEN|PRIVATE).*=\s*.+" docker-compose.yml
grep -iE "environment:" -A 20 docker-compose.yml | grep -iE "(password|secret|key|token)"
```

**Vulnerable:**
```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: supersecret123
      API_KEY: sk-1234567890abcdef
```

**Secure:**
```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt  # Not committed to git

# Alternative: use .env file (must be in .gitignore)
# environment:
#   POSTGRES_PASSWORD: ${DB_PASSWORD}
```

---

### 7. Missing read_only: true

- **Severity:** Low
- **CWE:** CWE-284 (Improper Access Control)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep "read_only:" docker-compose.yml
# Flag services that don't have it and don't need filesystem writes
```

**Secure:**
```yaml
services:
  app:
    image: myapp:latest
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
    volumes:
      - app-data:/app/data    # Only writable mount needed
```

---

### 8. Missing security_opt: no-new-privileges

- **Severity:** Medium
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep "no-new-privileges" docker-compose.yml
```

**Secure:**
```yaml
services:
  app:
    image: myapp:latest
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
```

---

### 9. Missing User Specification

- **Severity:** High
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep "user:" docker-compose.yml
```

**Vulnerable:**
```yaml
services:
  app:
    image: myapp:latest
    # Runs as root inside container
```

**Secure:**
```yaml
services:
  app:
    image: myapp:latest
    user: "1000:1000"    # Non-root UID:GID
```

---

### 10. Exposed Ports on 0.0.0.0

- **Severity:** Medium
- **CWE:** CWE-668 (Exposure of Resource to Wrong Sphere)
- **OWASP:** A02:2025 (Security Misconfiguration)

**What to grep for:**
```
grep -E '^\s*-\s+"?\d+:\d+"?' docker-compose.yml    # Ports without IP binding
# Safe pattern: "127.0.0.1:PORT:PORT"
```

**Vulnerable:**
```yaml
services:
  db:
    image: postgres:15
    ports:
      - "5432:5432"        # Exposed on all interfaces (0.0.0.0)
      - "6379:6379"        # Redis exposed to the world
```

**Secure:**
```yaml
services:
  db:
    image: postgres:15
    ports:
      - "127.0.0.1:5432:5432"    # Only accessible from localhost
  redis:
    image: redis:7-alpine
    # No ports exposed — only accessible within Docker network
    networks:
      - backend
```

---

## Docker Image Security

### 1. Known Vulnerable Base Images

- **Severity:** High
- **CWE:** CWE-1104 (Use of Unmaintained Third-Party Components)
- **OWASP:** A03:2025 (Software Supply Chain Failures)

**Detection:**
```bash
# Using Trivy
trivy image myapp:latest

# Using Docker Scout
docker scout cves myapp:latest

# Using Grype
grype myapp:latest
```

---

### 2. Missing Image Scanning

- **Severity:** Medium
- **CWE:** CWE-1104 (Use of Unmaintained Third-Party Components)
- **OWASP:** A03:2025 (Software Supply Chain Failures)

**What to grep for in CI/CD:**
```
grep -rE "(trivy|grype|docker scout|snyk container)" .github/ .gitlab-ci.yml Jenkinsfile
```

**Secure CI example (.github/workflows/scan.yml):**
```yaml
- name: Scan image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:latest
    exit-code: 1
    severity: CRITICAL,HIGH
```

---

### 3. Missing Content Trust (DOCKER_CONTENT_TRUST)

- **Severity:** Medium
- **CWE:** CWE-494 (Download of Code Without Integrity Check)
- **OWASP:** A08:2025 (Software and Data Integrity Failures)

**What to grep for:**
```
grep "DOCKER_CONTENT_TRUST" Dockerfile Makefile .env .github/ -r
```

**Secure:**
```bash
export DOCKER_CONTENT_TRUST=1
docker pull myimage:latest    # Will verify image signatures
```

---

## Hardened Dockerfile Template

```dockerfile
# Build stage
FROM node:18.19.0-alpine3.19 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM node:18.19.0-alpine3.19

LABEL maintainer="security@example.com"
LABEL org.opencontainers.image.source="https://github.com/org/repo"

WORKDIR /app

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy only production artifacts
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

## Hardened Docker Compose Template

```yaml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: myapp:1.0.0
    user: "1000:1000"
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    tmpfs:
      - /tmp
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      NODE_ENV: production
      DB_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  db:
    image: postgres:15.4-alpine
    user: "999:999"
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    tmpfs:
      - /tmp
      - /run/postgresql
    volumes:
      - db-data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 1G
    networks:
      - app-network
    # No ports exposed — only accessible within Docker network

secrets:
  db_password:
    file: ./secrets/db_password.txt

volumes:
  db-data:

networks:
  app-network:
    driver: bridge
```
