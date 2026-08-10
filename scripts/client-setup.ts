#!/usr/bin/env tsx
/**
 * Client Setup CLI - Interactive wizard to configure a new client tenant
 * Phase 3 of Opsly Agency Operating System
 *
 * Usage:
 *   npm run client:setup
 *   npm run client:setup -- --tenant-slug my-tenant --interactive=false
 *
 * Prompts:
 *   1. Client name (e.g., "Peskids")
 *   2. Tenant slug (e.g., "peskids")
 *   3. Primary email for owner
 *   4. GHL location ID (if using Twenty CRM CRM)
 *   5. n8n workflows count (optional)
 *   6. Initial plan / tier
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

interface ClientConfig {
  tenant_name: string;
  tenant_slug: string;
  schema_name: string;
  platform_domain: string;
  workflows_count: number;
  pricing_per_unit: number;
  currency: string;
  notes: string;
}

const DEFAULT_DOMAIN = 'op-sly.com';
const CONFIG_DIR = path.join(process.cwd(), 'config', 'tenants');

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const suffix = defaultValue ? ` [${defaultValue}]: ` : ': ';
    rl.question(question + suffix, (answer) => {
      rl.close();
      resolve(answer || defaultValue || '');
    });
  });
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function setupClient(interactive = true): Promise<ClientConfig> {
  console.log('\n📋 Opsly Client Setup Wizard');
  console.log('============================\n');

  let tenantName = '';
  let tenantSlug = '';
  let ownerEmail = '';
  let ghlLocationId = '';

  if (interactive) {
    // Prompt for client information
    tenantName = await prompt('Client name (e.g., "Peskids")');
    if (!tenantName) {
      throw new Error('Client name is required');
    }

    // Get slug or derive from name
    const suggestedSlug = tenantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    tenantSlug = await prompt('Tenant slug', suggestedSlug);

    if (!validateSlug(tenantSlug)) {
      throw new Error('Tenant slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Check if tenant already exists
    const configFile = path.join(CONFIG_DIR, `${tenantSlug}.json`);
    if (fs.existsSync(configFile)) {
      throw new Error(`Tenant "${tenantSlug}" already exists at ${configFile}`);
    }

    // Get owner email
    ownerEmail = await prompt('Owner email (for login and correspondence)');
    if (!validateEmail(ownerEmail)) {
      throw new Error('Invalid email format');
    }

    // GHL setup (optional)
    const useGhl = await prompt('Use Twenty CRM CRM integration? (y/N)');
    if (useGhl.toLowerCase() === 'y') {
      ghlLocationId = await prompt('GHL location ID');
      if (!ghlLocationId) {
        console.warn('⚠️  Warning: GHL integration will be disabled without location ID');
      }
    }
  } else {
    // Fallback to environment or defaults
    tenantName = process.env.CLIENT_NAME || 'New Client';
    tenantSlug = process.env.TENANT_SLUG || tenantName.toLowerCase().replace(/\s+/g, '-');
    ownerEmail = process.env.OWNER_EMAIL || 'owner@example.com';
  }

  // Build configuration
  const config: ClientConfig = {
    tenant_name: tenantName,
    tenant_slug: tenantSlug,
    schema_name: tenantSlug,
    platform_domain: DEFAULT_DOMAIN,
    workflows_count: 4,
    pricing_per_unit: 0,
    currency: 'USD',
    notes: `Direct tenant, ${tenantName} setup. Owner: ${ownerEmail}. CRM Starter Pack (4 workflows).${
      ghlLocationId ? ` GHL location: ${ghlLocationId}.` : ''
    } Phase 3 automation.`,
  };

  return config;
}

async function main() {
  try {
    // Ensure config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      console.log(`✓ Created config directory: ${CONFIG_DIR}`);
    }

    // Setup client
    const config = await setupClient(true);

    // Save configuration
    const configFile = path.join(CONFIG_DIR, `${config.tenant_slug}.json`);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    console.log(`\n✅ Client configuration created`);
    console.log(`📁 Location: ${configFile}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Review the configuration file`);
    console.log(`  2. Run: npm run client:plan -- --tenant-slug ${config.tenant_slug}`);
    console.log(`  3. Deploy using: npm run client:deploy -- --tenant-slug ${config.tenant_slug}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ Setup failed: ${error.message}`);
    } else {
      console.error(`\n❌ Setup failed: Unknown error`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
