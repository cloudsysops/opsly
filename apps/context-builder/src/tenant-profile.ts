/**
 * Resolución de identidad técnica para Context Pack (ADR-026).
 * Prioridad: columnas `platform.tenants` → `metadata` JSONB.
 */

export interface TenantIdentityResolved {
  tech_stack?: Record<string, string>;
  coding_standards?: string;
  vector_namespace?: string;
  domain?: string;
  business_domain?: string;
}

function recordFromJsonb(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const entries = Object.entries(raw as Record<string, unknown>).filter(
    ([, v]) => typeof v === 'string'
  ) as [string, string][];
  if (entries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(entries);
}

/**
 * Combina columnas nuevas (`tech_stack`, `coding_standards`, `vector_namespace`)
 * con campos históricos en `metadata`.
 */
export function resolveTenantIdentity(
  row: {
    tech_stack?: unknown;
    coding_standards?: string | null;
    vector_namespace?: string | null;
  },
  metadata: Record<string, unknown>
): TenantIdentityResolved {
  const fromColumnStack = recordFromJsonb(row.tech_stack);
  const fromMetaStack = recordFromJsonb(metadata.tech_stack);
  const tech_stack =
    fromColumnStack && Object.keys(fromColumnStack).length > 0 ? fromColumnStack : fromMetaStack;

  const csCol = row.coding_standards?.trim();
  const csMeta =
    typeof metadata.coding_standards === 'string' ? metadata.coding_standards.trim() : '';
  const coding_standards =
    csCol && csCol.length > 0 ? csCol : csMeta.length > 0 ? csMeta : undefined;

  const vn = row.vector_namespace?.trim();
  const vector_namespace = vn && vn.length > 0 ? vn : undefined;

  const business_domain =
    typeof metadata.business_domain === 'string' ? metadata.business_domain : undefined;
  const domain =
    typeof metadata.domain === 'string'
      ? metadata.domain
      : typeof metadata.public_domain === 'string'
        ? metadata.public_domain
        : undefined;

  return {
    tech_stack,
    coding_standards,
    vector_namespace,
    domain,
    business_domain,
  };
}

/** Bloque de texto para anexar al system prompt (opcional). */
export function buildIdentityPromptBlock(name: string, identity: TenantIdentityResolved): string {
  const lines: string[] = [
    '=== TENANT IDENTITY (Opsly) ===',
    `Name: ${name}`,
    `Domain: ${identity.domain ?? identity.business_domain ?? 'N/A'}`,
  ];
  if (identity.vector_namespace) {
    lines.push(`Vector namespace: ${identity.vector_namespace}`);
  }
  if (identity.tech_stack && Object.keys(identity.tech_stack).length > 0) {
    lines.push('', '=== TECH STACK ===');
    for (const [k, v] of Object.entries(identity.tech_stack)) {
      lines.push(`- ${k}: ${v}`);
    }
  }
  if (identity.coding_standards) {
    lines.push('', '=== CODING STANDARDS ===', identity.coding_standards);
  }
  return lines.join('\n');
}
