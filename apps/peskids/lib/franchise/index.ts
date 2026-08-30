/**
 * Peskids Franchise OS adapter barrel.
 *
 * Thin, pure mapping between the legacy Peskids operating model and the generic
 * @intcloudsysops/franchise-core types. Business logic (royalties, territories,
 * agreements, audit scoring) lives in the core package, never here.
 */

export * from './units.adapter';
export * from './sales-report.adapter';
