/**
 * Franchise OS domain types.
 * Tenant-agnostic. Amounts are integer minor units (cents). Dates are ISO-8601.
 */

export type IsoDateTime = string;
export type IsoDate = string;
export type CurrencyCode = string;
export type TenantId = string;

export const UNIT_TYPES = ['flagship', 'owned', 'franchise', 'mobile'] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const UNIT_STATUSES = ['draft', 'prospect', 'approved', 'opening', 'active', 'paused', 'suspended', 'archived'] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const OPENING_PHASES = [
  'contract',
  'territory',
  'location',
  'design',
  'permits',
  'equipment',
  'staff',
  'training',
  'soft_launch',
  'opening',
] as const;
export type OpeningPhase = (typeof OPENING_PHASES)[number];

export const FRANCHISEE_STATUSES = ['prospect', 'approved', 'active', 'suspended', 'terminated'] as const;
export type FranchiseeStatus = (typeof FRANCHISEE_STATUSES)[number];

export type GeoPoint = { lat: number; lng: number };

export type TerritoryGeometry =
  | { kind: 'radius'; center: GeoPoint; radiusKm: number }
  | { kind: 'polygon'; rings: GeoPoint[][] }
  | { kind: 'municipality'; countryCode: string; adminName: string }
  | { kind: 'service_area'; areaCode: string };

export const TERRITORY_EXCLUSIVE_FOR = ['fixed_location', 'home_service', 'both'] as const;
export type TerritoryExclusiveFor = (typeof TERRITORY_EXCLUSIVE_FOR)[number];

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

export const RENEWAL_TYPES = ['none', 'automatic', 'mutual_consent', 'franchisor_discretion'] as const;
export type RenewalType = (typeof RENEWAL_TYPES)[number];

export const ROYALTY_BASES = ['gross_sales', 'net_sales'] as const;
export type RoyaltyBasis = (typeof ROYALTY_BASES)[number];

export const SALES_SOURCES = ['platform', 'stripe', 'wompi', 'pos', 'manual', 'external'] as const;
export type SalesSource = (typeof SALES_SOURCES)[number];

export const SALES_REPORT_STATUSES = ['draft', 'submitted', 'accepted', 'disputed'] as const;
export type SalesReportStatus = (typeof SALES_REPORT_STATUSES)[number];

export const ROYALTY_PAYMENT_STATUSES = [
  'pending',
  'scheduled',
  'paid',
  'failed',
  'waived',
  'disputed',
] as const;
export type RoyaltyPaymentStatus = (typeof ROYALTY_PAYMENT_STATUSES)[number];

export const AUDIT_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export const FINDING_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export const CORRECTIVE_ACTION_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'verified',
  'overdue',
] as const;
export type CorrectiveActionStatus = (typeof CORRECTIVE_ACTION_STATUSES)[number];

export const TASK_STATUSES = ['not_started', 'in_progress', 'blocked', 'completed', 'skipped'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const SUPPLIER_STATUSES = ['approved', 'conditional', 'suspended', 'expired'] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const SUPPLIER_POLICIES = ['mandatory', 'approved_only', 'recommended'] as const;
export type SupplierPolicy = (typeof SUPPLIER_POLICIES)[number];

export const TRAINING_STATUSES = ['not_started', 'in_progress', 'completed', 'expired'] as const;
export type TrainingStatus = (typeof TRAINING_STATUSES)[number];

export const FRANCHISE_ROLES = [
  'platform_owner',
  'tenant_owner',
  'franchise_network_admin',
  'franchise_admin',
  'franchise_staff',
  'support',
  'auditor',
  'teacher',
] as const;
export type FranchiseRole = (typeof FRANCHISE_ROLES)[number];

export type DocumentReference = {
  id: string;
  tenantId: TenantId;
  kind:
    | 'agreement'
    | 'manual'
    | 'brand_guide'
    | 'audit_evidence'
    | 'opening_evidence'
    | 'certificate'
    | 'supplier_contract'
    | 'other';
  uri: string;
  visibility: 'network' | 'unit' | 'franchisee' | 'internal';
  ownerScope: 'network' | 'unit' | 'franchisee';
  version: string;
  expiresAt: IsoDateTime | null;
};

export type FranchiseNetwork = {
  id: string;
  tenantId: TenantId;
  slug: string;
  name: string;
  status: 'active' | 'paused';
  createdAt: IsoDateTime;
};

export type Franchisee = {
  id: string;
  tenantId: TenantId;
  legalName: string;
  taxId: string | null;
  status: FranchiseeStatus;
  primaryContact: { name: string; email: string; phone: string | null };
  createdAt: IsoDateTime;
};

export type FranchiseUnit = {
  id: string;
  tenantId: TenantId;
  networkId: string;
  franchiseeId: string | null;
  code: string;
  name: string;
  type: UnitType;
  status: UnitStatus;
  openingStatus: OpeningPhase | null;
  primaryLocationId: string | null;
  territoryId: string | null;
  agreementId: string | null;
  /** Maps a pre-existing operating-unit row (e.g. peskids_franchises.id). Never a tenant id. */
  legacyOperatingId: string | null;
  createdAt: IsoDateTime;
};

export type FranchiseLocation = {
  id: string;
  tenantId: TenantId;
  unitId: string;
  code: string;
  name: string;
  kind: 'pool' | 'home_zone' | 'office' | 'service_area' | 'store' | 'other';
  address: string | null;
  city: string | null;
  geo: GeoPoint | null;
  active: boolean;
};

export type Territory = {
  id: string;
  tenantId: TenantId;
  name: string;
  status: 'draft' | 'active' | 'expired' | 'revoked';
  geometry: TerritoryGeometry;
  exclusive: boolean;
  exclusiveFor: TerritoryExclusiveFor;
  validFrom: IsoDate;
  validTo: IsoDate | null;
  unitId: string | null;
};

export type FranchiseAgreement = {
  id: string;
  tenantId: TenantId;
  franchiseeId: string;
  unitIds: string[];
  status: AgreementStatus;
  effectiveDate: IsoDate;
  expirationDate: IsoDate;
  renewalType: RenewalType;
  renewalTermMonths: number | null;
  noticeDays: number;
  canonicalFeeMinor: number;
  currency: CurrencyCode;
  royaltyRuleId: string | null;
  territoryId: string | null;
  documentRef: DocumentReference | null;
  createdAt: IsoDateTime;
};

export type RoyaltyRule = {
  id: string;
  tenantId: TenantId;
  name: string;
  basis: RoyaltyBasis;
  /** Basis points. 500 = 5.00%. Integer — never a float percentage. */
  percentageBps: number;
  minimumAmountMinor: number | null;
  fixedFeeMinor: number | null;
  currency: CurrencyCode;
  frequency: 'monthly' | 'quarterly' | 'annual';
  excludedCategories: string[];
  taxTreatment: 'inclusive' | 'exclusive' | 'unspecified';
  effectiveFrom: IsoDate;
  effectiveTo: IsoDate | null;
  version: number;
};

export type SalesReport = {
  id: string;
  tenantId: TenantId;
  unitId: string;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  grossSalesMinor: number;
  refundsMinor: number;
  taxesMinor: number;
  excludedSalesMinor: number;
  netSalesMinor: number;
  currency: CurrencyCode;
  source: SalesSource;
  sourceReference: string | null;
  status: SalesReportStatus;
};

export type RoyaltyCalculationInputs = {
  basis: RoyaltyBasis;
  reportedSalesMinor: number;
  excludedSalesMinor: number;
  royaltyBaseMinor: number;
  percentageBps: number;
  fixedFeeMinor: number;
  minimumAmountMinor: number | null;
  rounding: 'half_up';
};

export type RoyaltyCalculation = {
  id: string;
  tenantId: TenantId;
  unitId: string;
  salesReportId: string;
  royaltyRuleId: string;
  ruleVersion: number;
  currency: CurrencyCode;
  inputs: RoyaltyCalculationInputs;
  royaltyDueMinor: number;
  calculatedAt: IsoDateTime;
  /** Stable key: tenant + report + rule + version. Re-running yields the same snapshot. */
  idempotencyKey: string;
};

export type RoyaltyPayment = {
  id: string;
  tenantId: TenantId;
  calculationId: string;
  amountMinor: number;
  currency: CurrencyCode;
  status: RoyaltyPaymentStatus;
  method: 'manual' | 'stripe' | 'wompi' | 'bank' | 'other';
  externalReference: string | null;
  paidAt: IsoDateTime | null;
};

export type BrandStandard = {
  id: string;
  tenantId: TenantId;
  category: string;
  code: string;
  title: string;
  requirement: string;
  evidenceType: 'photo' | 'document' | 'observation' | 'metric' | 'other';
  severity: FindingSeverity;
  version: number;
};

export type AuditTemplateQuestion = {
  id: string;
  section: string;
  prompt: string;
  weight: number;
  criticalFailure: boolean;
  standardCode: string | null;
};

export type AuditTemplate = {
  id: string;
  tenantId: TenantId;
  name: string;
  version: number;
  questions: AuditTemplateQuestion[];
};

export type Audit = {
  id: string;
  tenantId: TenantId;
  unitId: string;
  templateId: string;
  templateVersion: number;
  auditor: string;
  scheduledAt: IsoDateTime;
  performedAt: IsoDateTime | null;
  score: number | null;
  status: AuditStatus;
};

export type AuditFinding = {
  id: string;
  tenantId: TenantId;
  auditId: string;
  unitId: string;
  severity: FindingSeverity;
  standardRef: string | null;
  evidence: DocumentReference | null;
  notes: string;
};

export type CorrectiveAction = {
  id: string;
  tenantId: TenantId;
  findingId: string;
  unitId: string;
  owner: string;
  dueDate: IsoDate;
  status: CorrectiveActionStatus;
  resolution: string | null;
  evidence: DocumentReference | null;
};

export type OpeningTask = {
  id: string;
  tenantId: TenantId;
  checklistId: string;
  phase: OpeningPhase;
  title: string;
  owner: string | null;
  dueDate: IsoDate | null;
  required: boolean;
  status: TaskStatus;
  evidence: DocumentReference | null;
};

export type OpeningChecklist = {
  id: string;
  tenantId: TenantId;
  unitId: string;
  tasks: OpeningTask[];
};

export type Supplier = {
  id: string;
  tenantId: TenantId;
  name: string;
  category: string;
  status: SupplierStatus;
  policy: SupplierPolicy;
};

export type TrainingRequirement = {
  id: string;
  tenantId: TenantId;
  externalRef: string;
  role: FranchiseRole;
  required: boolean;
  validForMonths: number | null;
  certificationRequired: boolean;
};

export type SupportCase = {
  id: string;
  tenantId: TenantId;
  unitId: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  slaHours: number | null;
  assignedTo: string | null;
  resolution: string | null;
};

export type ChangeAuditEntry = {
  id: string;
  tenantId: TenantId;
  actorId: string;
  at: IsoDateTime;
  entity: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'status_change';
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
};
