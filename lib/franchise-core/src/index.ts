export {
  AGREEMENT_STATUSES,
  AUDIT_STATUSES,
  CORRECTIVE_ACTION_STATUSES,
  FINDING_SEVERITIES,
  FRANCHISE_ROLES,
  FRANCHISEE_STATUSES,
  OPENING_PHASES,
  RENEWAL_TYPES,
  ROYALTY_BASES,
  ROYALTY_PAYMENT_STATUSES,
  SALES_SOURCES,
  SUPPLIER_POLICIES,
  SUPPLIER_STATUSES,
  TERRITORY_EXCLUSIVE_FOR,
  TRAINING_STATUSES,
  UNIT_STATUSES,
  UNIT_TYPES,
  type AgreementStatus,
  type Audit,
  type AuditFinding,
  type AuditTemplate,
  type BrandStandard,
  type ChangeAuditEntry,
  type CorrectiveAction,
  type CurrencyCode,
  type DocumentReference,
  type FranchiseAgreement,
  type FranchiseLocation,
  type FranchiseNetwork,
  type FranchiseRole,
  type FranchiseUnit,
  type Franchisee,
  type GeoPoint,
  type OpeningChecklist,
  type OpeningPhase,
  type RoyaltyCalculation,
  type RoyaltyPayment,
  type RoyaltyRule,
  type SalesReport,
  type SalesSource,
  type SupportCase,
  type Supplier,
  type Territory,
  type TerritoryExclusiveFor,
  type TerritoryGeometry,
  type TrainingRequirement,
  type UnitStatus,
  type UnitType,
} from './types.js';

export { applyBpsHalfUp, assertBps, assertMinor, MoneyError } from './money.js';
export {
  assertCalculationImmutable,
  buildRoyaltyInputs,
  calculateRoyalty,
  nextRoyaltyRuleVersion,
  reportedSalesMinor,
  royaltyDueFromInputs,
  royaltyIdempotencyKey,
  RoyaltyError,
} from './royalty.js';
export { findTerritoryConflicts, haversineKm, territoriesConflict, type TerritoryConflict } from './territory.js';
export {
  DEFAULT_EXPIRY_WINDOWS_DAYS,
  agreementExpiryAlerts,
  assertAgreementUnitsBelongToTenant,
  daysUntilExpiration,
  deriveAgreementStatus,
  type ExpiryAlert,
} from './agreement.js';
export { auditIsComplete, deriveCorrectiveActionStatus, findingsForUnit, hasCriticalFailure, scoreAudit } from './audit.js';
export {
  canAccessUnit,
  canReadAudits,
  canReadNetwork,
  canReadRoyalties,
  mapTenantStaffRole,
  type AccessDecision,
} from './access.js';
export { FRANCHISE_EVENTS, franchiseEvent, type FranchiseEvent, type FranchiseEventName } from './events.js';
export {
  missingMapProvider,
  type GeocodeQuery,
  type MapProvider,
  type RoyaltyPaymentProvider,
  type SignatureProvider,
  type UnavailableProvider,
} from './adapters.js';
export {
  assertFranchiseeDistinctFromUnit,
  assertOwnedUnitHasNoRequiredFranchisee,
  assertValidUnitType,
  ownedUnitDefaults,
  UnitModelError,
} from './units.js';
export { canActivateUnit, defaultOpeningTasks, openingBlockers } from './opening.js';
export { summarizeNetwork, type NetworkDashboard } from './network.js';
