import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { COMPOSE_CRYPTO } from '../constants';
import { getTenantsBaseDir } from './paths';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

function resolveTenantBaseDomain(): string {
  const tenantDomain = process.env.TENANT_BASE_DOMAIN;
  if (tenantDomain && tenantDomain.length > 0) {
    return tenantDomain;
  }
  return requireEnv('PLATFORM_DOMAIN');
}

/**
 * Renders infra/templates/docker-compose.tenant.yml.tpl using the same
 * {{PLACEHOLDER}} set as scripts/onboard-tenant.sh (CHECK 6).
 */
export type RenderedTenantCompose = {
  yaml: string;
  n8nBasicAuthUser: string;
  n8nBasicAuthPassword: string;
};

export async function renderTenantComposeFromTemplate(
  slug: string,
  ports: Record<string, number>
): Promise<RenderedTenantCompose> {
  const templatePath = requireEnv('TEMPLATE_PATH');
  const n8nPort = ports.n8n;
  const uptimePort = ports.uptime_kuma;
  const contextBuilderPort = ports.context_builder;
  const mcpPort = ports.mcp;
  if (typeof n8nPort !== 'number' || typeof uptimePort !== 'number') {
    throw new Error('compose template requires ports.n8n and ports.uptime_kuma');
  }
  if (typeof contextBuilderPort !== 'number' || typeof mcpPort !== 'number') {
    throw new Error('compose template requires ports.context_builder and ports.mcp');
  }

  // Tenants can run on a dedicated customer-facing base domain while
  // control-plane services (api/admin/portal) use PLATFORM_DOMAIN.
  const domain = resolveTenantBaseDomain();
  const traefikNetwork = optionalEnv('TRAEFIK_NETWORK', 'traefik-public');
  const n8nUser = optionalEnv('N8N_BASIC_AUTH_USER', 'admin');
  const n8nPassword = randomBytes(COMPOSE_CRYPTO.N8N_PASSWORD_RANDOM_BYTES).toString('hex');
  const n8nEncryptionKey = randomBytes(COMPOSE_CRYPTO.N8N_ENCRYPTION_KEY_RANDOM_BYTES).toString(
    'hex'
  );
  const mcpJwtSecret = randomBytes(32).toString('hex');

  let yaml = await readFile(templatePath, 'utf8');
  yaml = yaml.replaceAll('{{SLUG}}', slug);
  yaml = yaml.replaceAll('{{PORT_N8N}}', String(n8nPort));
  yaml = yaml.replaceAll('{{PORT_UPTIME}}', String(uptimePort));
  yaml = yaml.replaceAll('{{PORT_CONTEXT_BUILDER}}', String(contextBuilderPort));
  yaml = yaml.replaceAll('{{PORT_MCP}}', String(mcpPort));
  yaml = yaml.replaceAll('{{N8N_BASIC_AUTH_USER}}', n8nUser);
  yaml = yaml.replaceAll('{{N8N_BASIC_AUTH_PASSWORD}}', n8nPassword);
  yaml = yaml.replaceAll('{{N8N_ENCRYPTION_KEY}}', n8nEncryptionKey);
  yaml = yaml.replaceAll('{{MCP_JWT_SECRET}}', mcpJwtSecret);
  yaml = yaml.replaceAll('{{DOMAIN}}', domain);
  yaml = yaml.replaceAll('{{TRAEFIK_NETWORK}}', traefikNetwork);
  return {
    yaml,
    n8nBasicAuthUser: n8nUser,
    n8nBasicAuthPassword: n8nPassword,
  };
}

export async function writeComposeFile(slug: string, content: string): Promise<string> {
  const dir = join(getTenantsBaseDir(), slug);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, 'docker-compose.yml');
  await writeFile(filePath, content, 'utf8');
  return filePath;
}
