/**
 * Shared enum strings for the Franchise OS core.
 *
 * Single source of truth for union values used both by `types.ts` (plain TS
 * unions) and `schemas.ts` (zod enums). Never reference Peskids-specific
 * values here.
 */

export const FRANCHISE_UNIT_TYPES = ['flagship', 'owned', 'franchise', 'mobile'] as const;
export type FranchiseUnitType = (typeof FRANCHISE_UNIT_TYPES)[number];

export const FRANCHISE_UNIT_STATUSES = [
  'prospect',
  'approved',
  'opening',
  'active',
  'suspended',
  'archived',
] as const;
export type FranchiseUnitStatus = (typeof FRANCHISE_UNIT_STATUSES)[number];

export const OPENING_STATUSES = [
  'not_started',
  'in_progress',
  'on_hold',
  'completed',
  'blocked',
] as const;
export type OpeningStatus = (typeof OPENING_STATUSES)[number];

export const FRANCHISEE_STATUSES = ['prospect', 'active', 'suspended', 'terminated'] as const;
export type FranchiseeStatus = (typeof FRANCHISEE_STATUSES)[number];

export const FRANCHISE_ROLES = [
  'platform_owner', 'tenant_owner', 'franchise_network_admin', 'franchise_admin',
  'franchise_staff', 'support', 'auditor', 'teacher',
] as const;
export type FranchiseRole = (typeof FRANCHISE_ROLES)[number];

export const TERRITORY_TYPES = ['radius', 'polygon', 'municipality', 'service_area'] as const;
export type TerritoryType = (typeof TERRITORY_TYPES)[number];

export const TERRITORY_STATUSES = ['active', 'inactive', 'archived'] as const;
export type TerritoryStatus = (typeof TERRITORY_STATUSES)[number];

export const TERRITORY_EXCLUSIVE_FORS = ['fixed_location', 'home_service', 'both'] as const;
export type TerritoryExclusiveFor = (typeof TERRITORY_EXCLUSIVE_FORS)[number];

export const GEO_REFERENCE_TYPES = ['point', 'radius', 'polygon', 'municipality'] as const;
export type GeoReferenceType = (typeof GEO_REFERENCE_TYPES)[number];

export const FRANCHISE_LOCATION_KINDS = [
  'pool',
  'home_zone',
  'office',
  'service_area',
  'storefront',
  'warehouse',
  'other',
] as const;
export type FranchiseLocationKind = (typeof FRANCHISE_LOCATION_KINDS)[number];

export const AGREEMENT_STATUSES = [
  'draft',
  'pending_signature',
  'active',
  'expiring',
  'expired',
  'terminated',
  'suspended',
] as const;
export type AgreementStatus = (typeof AGREEMENT_STATUSES)[number];

export const ROYALTY_BASES = ['gross_sales', 'net_sales'] as const;
export type RoyaltyBasis = (typeof ROYALTY_BASES)[number];

export const ROYALTY_FREQUENCIES = ['monthly', 'quarterly', 'yearly'] as const;
export type RoyaltyFrequency = (typeof ROYALTY_FREQUENCIES)[number];

export const TAX_TREATMENTS = ['gross', 'net_of_tax', 'exclusive'] as const;
export type TaxTreatment = (typeof TAX_TREATMENTS)[number];

export const SALES_REPORT_SOURCES = [
  'platform',
  'stripe',
  'wompi',
  'pos',
  'manual',
  'external',
] as const;
export type SalesReportSource = (typeof SALES_REPORT_SOURCES)[number];

export const SALES_REPORT_STATUSES = [
  'draft',
  'submitted',
  'verified',
  'disputed',
  'rejected',
] as const;
export type SalesReportStatus = (typeof SALES_REPORT_STATUSES)[number];

export const AUDIT_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'overdue',
] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export const FINDING_SEVERITIES = ['critical', 'major', 'minor', 'info'] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export const CORRECTIVE_ACTION_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'verified',
  'overdue',
] as const;
export type CorrectiveActionStatus = (typeof CORRECTIVE_ACTION_STATUSES)[number];

export const ROYALTY_CALCULATION_STATUSES = [
  'pending',
  'approved',
  'invoiced',
  'paid',
  'waived',
  'disputed',
] as const;
export type RoyaltyCalculationStatus = (typeof ROYALTY_CALCULATION_STATUSES)[number];

export const ROYALTY_PAYMENT_STATUSES = [
  'pending',
  'scheduled',
  'paid',
  'failed',
  'waived',
  'disputed',
] as const;
export type RoyaltyPaymentStatus = (typeof ROYALTY_PAYMENT_STATUSES)[number];
