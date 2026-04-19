# E2E: escritura híbrida (`/api/tools/execute`) en el VPS

**Prerrequisito:** el servicio `app` monta el monorepo **lectura/escritura** (`infra/docker-compose.platform.yml`, volumen `../:/opt/opsly`).

## 1. Desplegar cambio en el VPS

Desde `opsly-admin` (con SSH configurado, ver `docs/SSH-USERS-FOR-AGENTS.md`):

```bash
ssh vps-dragon "cd /opt/opsly && git pull --ff-only && cd infra && docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml up -d app"
```

## 2. Prueba manual rápida (API)

Sustituir `API_BASE`, `TOKEN` y `TENANT` (slug real):

```bash
curl -sS -X POST "https://api.${PLATFORM_DOMAIN}/api/tools/execute" \
  -H "Authorization: Bearer ${PLATFORM_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"tenant_slug":"smiletripcare","action":"fs_write","args":{"path":"e2e-proof.txt","content":"opsly e2e write"}}'
```

Luego en el VPS:

```bash
ssh vps-dragon "test -f /opt/opsly/e2e-proof.txt && head -1 /opt/opsly/e2e-proof.txt"
```

## 3. Escaneo post-cambio

Preferir **Trivy** o **Docker Scout** (no depender de `docker scan` deprecado):

```bash
trivy image ghcr.io/cloudsysops/intcloudsysops-api:latest
```

## 4. Seguridad

- Ruta protegida por `PLATFORM_ADMIN_TOKEN` en `apps/api/app/api/tools/execute/route.ts`.
- Paths restringidos por `safeResolvedPath` en `apps/api/lib/tools-execute.ts`.
