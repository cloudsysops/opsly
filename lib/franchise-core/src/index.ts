/**
 * @intcloudsysops/franchise-core — reusable Franchise OS core.
 *
 * Tenant-agnostic domain: networks, franchisees, units, locations, territories,
 * agreements, versioned royalty engine, audits and corrective actions. Peskids
 * is the first adapter; the core never hardcodes vertical business rules.
 */

export * from './constants.js';
export * from './types.js';
export * from './schemas.js';
export * from './territory.js';
export * from './agreement.js';
export * from './royalty.js';
export * from './audit.js';
