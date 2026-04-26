import { describe, expect, it } from 'vitest';
import { resolveTenantIdentity } from '../src/tenant-profile.js';

describe('resolveTenantIdentity', () => {
  it('prioriza tech_stack en columna sobre metadata', () => {
    const r = resolveTenantIdentity(
      {
        tech_stack: { frontend: 'React' },
        coding_standards: null,
        vector_namespace: null,
      },
      { tech_stack: { frontend: 'Vue' } }
    );
    expect(r.tech_stack?.frontend).toBe('React');
  });

  it('usa metadata si la columna tech_stack está vacía', () => {
    const r = resolveTenantIdentity(
      {
        tech_stack: {},
        coding_standards: null,
        vector_namespace: null,
      },
      { tech_stack: { db: 'Postgres' } }
    );
    expect(r.tech_stack?.db).toBe('Postgres');
  });

  it('expone vector_namespace cuando viene en columna', () => {
    const r = resolveTenantIdentity(
      {
        tech_stack: {},
        coding_standards: null,
        vector_namespace: 'tenant_acme_prod',
      },
      {}
    );
    expect(r.vector_namespace).toBe('tenant_acme_prod');
  });
});
