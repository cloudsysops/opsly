/**
 * Franchise OS core domain types.
 *
 * These types are intentionally tenant-agnostic: they model the operating brain
 * of a franchise network (units, franchisees, territories, agreements, royalties,
 * audits, opening lifecycle, standards, suppliers, training, support and
 * documents) without encoding any specific vertical (academy, restaurant,
 * home-services…).
 *
 * Every row in the persistence layer carries `tenantId`; every entity that can
 * be scoped to a single operating unit carries `franchiseUnitId` (the
 * `unitId` field). ACL/RLS enforcement lives at the storage boundary, not here.
 *
 * All enum unions live in `constants.ts` (single source of truth used by both
 * this file and `schemas.ts`) and are re-exported from here.
 */

import type {
  AgreementStatus,
  AuditStatus,
  CorrectiveActionStatus,
  FindingSeverity,
  FranchiseLocationKind,
  FranchiseeStatus,
  FranchiseUnitStatus,
  FranchiseUnitType,
  OpeningStatus,
  RoyaltyBasis,
  RoyaltyCalculationStatus,
  RoyaltyFrequency,
  RoyaltyPaymentStatus,
  SalesReportSource,
  SalesReportStatus,
  TaxTreatment,
  TerritoryExclusiveFor,
  TerritoryStatus,
  TerritoryType,
} from './constants.js';

export type {
  AgreementStatus,
  AuditStatus,
  CorrectiveActionStatus,
  FindingSeverity,
  FranchiseLocationKind,
  FranchiseeStatus,
  FranchiseUnitStatus,
  FranchiseUnitType,
  OpeningStatus,
  RoyaltyBasis,
  RoyaltyCalculationStatus,
  RoyaltyFrequency,
  RoyaltyPaymentStatus,
  SalesReportSource,
  SalesReportStatus,
  TaxTreatment,
  TerritoryExclusiveFor,
  TerritoryStatus,
  TerritoryType,
} from './constants.js';

export { FRANCHISE_UNIT_TYPES, AGREEMENT_STATUSES } from './constants.js';

/** Opsly tenant that owns this franchise network (e.g. `peskids`). */
export type TenantId = string;
export type FranchiseUnitId = string;
export type FranchiseeId = string;
export type NetworkId = string;

/** ISO-4217 currency code, e.g. `COP` or `USD`. */
export type CurrencyCode = string;

/** Money amount in decimal units (round to 2 decimals at the boundary). */
export type MoneyAmount = {
  amount: number;
  currency: CurrencyCode;
};

export type Franchisee = {
  id: FranchiseeId;
  tenantId: TenantId;
  /** Persona natural o jurídica responsable del contrato. */
  legalName: string;
  taxId?: string | null;
  status: FranchiseeStatus;
  primaryContact?: { name?: string; email?: string; phone?: string } | null;
  createdAt: string;
  updatedAt?: string | null;
};

/**
 * Operating unit (sede / unidad operativa). A franchisee can operate 1..N units.
 * Owned units (flagship/owned/mobile run by the network itself) have a null
 * franchiseeId — a franchisee is never required for owned units.
 */
export type FranchiseUnit = {
  id: FranchiseUnitId;
  tenantId: TenantId;
  franchiseeId?: FranchiseeId | null;
  /** Short unique code within the tenant, e.g. `llanogrande-principal`. */
  code: string;
  name: string;
  type: FranchiseUnitType;
  status: FranchiseUnitStatus;
  openingStatus: OpeningStatus;
  primaryLocationId?: string | null;
  /** Traceability back to legacy/Peskids storage (e.g. `platform.peskids_franchises` row). */
  externalSource?: string | null;
  externalRef?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type GeoReference =
  | { kind: 'point'; lat: number; lng: number; radiusMeters?: number | null }
  | { kind: 'radius'; center: { lat: number; lng: number }; radiusMeters: number }
  | { kind: 'polygon'; vertices: Array<{ lat: number; lng: number }> }
  | { kind: 'municipality'; code?: string | null; name?: string | null };

export type FranchiseLocation = {
  id: string;
  tenantId: TenantId;
  unitId: FranchiseUnitId;
  slug: string;
  name: string;
  kind: FranchiseLocationKind;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  geo?: GeoReference | null;
  active: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type Territory = {
  id: string;
  tenantId: TenantId;
  unitId?: FranchiseUnitId | null;
  name: string;
  type: TerritoryType;
  status: TerritoryStatus;
  exclusive: boolean;
  exclusiveFor?: TerritoryExclusiveFor | null;
  validFrom?: string | null;
  validTo?: string | null;
  serviceModel?: string | null;
  geo?: GeoReference | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type RenewalType = 'fixed' | 'auto' | 'manual';

export type FranchiseAgreement = {
  id: string;
  tenantId: TenantId;
  franchiseeId: FranchiseeId;
  /** 1..N units covered by this agreement. */
  unitIds: FranchiseUnitId[];
  state: AgreementStatus;
  effectiveDate: string;
  expirationDate: string;
  renewalType: RenewalType;
  renewalTermMonths?: number | null;
  noticeDays: number;
  canonicalFee?: MoneyAmount | null;
  royaltyRuleId?: string | null;
  territoryId?: string | null;
  documentRef?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type RoyaltyRule = {
  id: string;
  tenantId: TenantId;
  name: string;
  /** Monotonic version. New version = new effectiveFrom; history is never mutated. */
  version: number;
  basis: RoyaltyBasis;
  /** Percentage points, e.g. `5` means 5%. */
  percentage: number;
  minimumAmount?: MoneyAmount | null;
  fixedFee?: MoneyAmount | null;
  currency: CurrencyCode;
  frequency: RoyaltyFrequency;
  excludedCategories: string[];
  taxTreatment: TaxTreatment;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type SalesReport = {
  id: string;
  tenantId: TenantId;
  unitId: FranchiseUnitId;
  periodStart: string;
  periodEnd: string;
  grossSales: number;
  refunds: number;
  taxes: number;
  /** Sales excluded by the agreement (e.g. excluded categories). */
  excludedSales: number;
  netSales: number;
  currency: CurrencyCode;
  source: SalesReportSource;
  sourceReference?: string | null;
  status: SalesReportStatus;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

/**
 * Immutable, reproducible royalty calculation. `ruleVersion` pins the rule that
 * was in force for the report period; `inputs`, `calculation` and `result` are
 * persisted JSON so a past calculation can be explained without recomputation.
 */
export type RoyaltyCalculation = {
  id: string;
  tenantId: TenantId;
  unitId: FranchiseUnitId;
  salesReportId: string;
  ruleId: string;
  ruleVersion: number;
  basis: RoyaltyBasis;
  reportedSales: number;
  exclusions: number;
  royaltyBase: number;
  percentage: number;
  percentageAmount: number;
  fixedFee: number;
  minimumApplied: boolean;
  royaltyDue: number;
  currency: CurrencyCode;
  status: RoyaltyCalculationStatus;
  inputs: Record<string, unknown>;
  calculation: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
};

export type RoyaltyPayment = {
  id: string;
  tenantId: TenantId;
  calculationId: string;
  amount: number;
  currency: CurrencyCode;
  status: RoyaltyPaymentStatus;
  method?: string | null;
  externalReference?: string | null;
  scheduledAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type BrandStandard = {
  id: string;
  tenantId: TenantId;
  category: string;
  code: string;
  title: string;
  requirement: string;
  evidenceType: 'photo' | 'document' | 'declaration' | 'inspection' | 'none';
  severity: 'critical' | 'major' | 'minor';
  version: number;
  effectiveFrom: string;
  createdAt: string;
};

export type FranchiseAudit = {
  id: string;
  tenantId: TenantId;
  unitId: FranchiseUnitId;
  templateId?: string | null;
  auditor?: string | null;
  scheduledAt?: string | null;
  performedAt?: string | null;
  /** 0..100 composite score computed from template weights. */
  score?: number | null;
  status: AuditStatus;
  createdAt: string;
  updatedAt?: string | null;
};

export type AuditFinding = {
  id: string;
  tenantId: TenantId;
  auditId: string;
  unitId: FranchiseUnitId;
  severity: FindingSeverity;
  standardRef?: string | null;
  evidence?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type CorrectiveAction = {
  id: string;
  tenantId: TenantId;
  findingId: string;
  unitId: FranchiseUnitId;
  owner?: string | null;
  dueDate: string;
  status: CorrectiveActionStatus;
  resolution?: string | null;
  evidence?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type OpeningPhase =
  | 'contract'
  | 'territory'
  | 'location'
  | 'design'
  | 'permits'
  | 'equipment'
  | 'staff'
  | 'training'
  | 'soft_launch'
  | 'opening';
export type OpeningTaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export type OpeningChecklist = {
  id: string;
  tenantId: TenantId;
  unitId: FranchiseUnitId;
  phase: OpeningPhase;
  status: OpeningStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type OpeningTask = {
  id: string;
  tenantId: TenantId;
  checklistId: string;
  unitId: FranchiseUnitId;
  phase: OpeningPhase;
  name: string;
  owner?: string | null;
  dueDate?: string | null;
  required: boolean;
  status: OpeningTaskStatus;
  evidence?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type SupplierStatus = 'approved' | 'conditional' | 'suspended' | 'expired';

export type ApprovedSupplier = {
  id: string;
  tenantId: TenantId;
  category: string;
  legalName: string;
  status: SupplierStatus;
  requirementId?: string | null;
  rating?: number | null;
  contractRef?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type SupplierRequirement = {
  id: string;
  tenantId: TenantId;
  category: string;
  name: string;
  required: 'mandatory' | 'approved_only' | 'recommended';
  documentRef?: string | null;
  createdAt: string;
};

export type TrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'expired';

export type TrainingRequirement = {
  id: string;
  tenantId: TenantId;
  role: string;
  courseId?: string | null;
  externalRef?: string | null;
  name: string;
  required: boolean;
  validForMonths?: number | null;
  certificationRequired: boolean;
  status: TrainingStatus;
  completedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type SupportCase = {
  id: string;
  tenantId: TenantId;
  unitId?: FranchiseUnitId | null;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  sla?: string | null;
  assignedTo?: string | null;
  resolution?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type DocumentReference = {
  id: string;
  tenantId: TenantId;
  unitId?: FranchiseUnitId | null;
  kind:
    | 'agreement'
    | 'manual'
    | 'brand_guide'
    | 'audit_evidence'
    | 'certificate'
    | 'supplier_contract'
    | 'other';
  title: string;
  /** External storage reference — Franchise Core never owns blobs. */
  ref: string;
  visibility: 'network' | 'franchisee' | 'unit' | 'support';
  ownerScope?: 'tenant' | 'franchisee' | 'unit' | null;
  version?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};
