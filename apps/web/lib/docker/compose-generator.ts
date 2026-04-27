import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function yamlDoubleQuoted(value: string): string {
  const escaped = value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  return `"${escaped}"`;
}

export function generateCompose(slug: string, ports: Record<string, number>): string {
  const baseDomain = requireEnv('PLATFORM_BASE_DOMAIN');
  const n8nPort = ports.n8n;
  const uptimePort = ports.uptime_kuma;

  if (typeof n8nPort !== 'number' || typeof uptimePort !== 'number') {
    throw new Error('compose requires ports.n8n and ports.uptime_kuma');
  }

  const n8nService = `n8n_${slug.replace(/-/g, '_')}`;
  const uptimeService = `uptime_${slug.replace(/-/g, '_')}`;
  const n8nHost = `n8n.${slug}.${baseDomain}`;
  const statusHost = `status.${slug}.${baseDomain}`;

  const n8nRule = yamlDoubleQuoted(`Host(\`${n8nHost}\`)`);
  const uptimeRule = yamlDoubleQuoted(`Host(\`${statusHost}\`)`);

  return `services:
  ${n8nService}:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "${n8nPort}:5678"
    environment:
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - WEBHOOK_URL=https://${n8nHost}/
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${n8nService}.rule=${n8nRule}"
      - "traefik.http.routers.${n8nService}.entrypoints=websecure"
      - "traefik.http.routers.${n8nService}.tls=true"
      - "traefik.http.services.${n8nService}.loadbalancer.server.port=5678"

  ${uptimeService}:
    image: louislam/uptime-kuma:1
    restart: unless-stopped
    ports:
      - "${uptimePort}:3001"
    volumes:
      - ./uptime-kuma-data:/app/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${uptimeService}.rule=${uptimeRule}"
      - "traefik.http.routers.${uptimeService}.entrypoints=websecure"
      - "traefik.http.routers.${uptimeService}.tls=true"
      - "traefik.http.services.${uptimeService}.loadbalancer.server.port=3001"
`;
}

export async function writeComposeFile(slug: string, content: string): Promise<string> {
  const dir = join('/opt/opsly/runtime/tenants/', slug);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, 'docker-compose.yml');
  await writeFile(filePath, content, 'utf8');
  return filePath;
}
