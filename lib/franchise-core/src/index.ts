// franchise-core barrel — re-exports from existing modules only.

// ─── types.ts ──────────────────────────────────────────────
export {
  FRANCHISE_UNIT_TYPES,
  AGREEMENT_STATUSES,
  type TenantId,
  type FranchiseUnitId,
  type FranchiseeId,
  type NetworkId,
  type CurrencyCode,
  type MoneyAmount,
  type Franchisee,
  type FranchiseUnit,
  type GeoReference,
  type FranchiseLocation,
  type Territory,
  type RenewalType,
  type FranchiseAgreement,
  type RoyaltyRule,
  type SalesReport,
  type RoyaltyCalculation,
  type RoyaltyPayment,
  type BrandStandard,
} from './types.js';

// ─── royalty.ts ────────────────────────────────────────────
export {
  roundMoney,
  RoyaltyRuleNotEffectiveError,
  RoyaltyRuleExpiredError,
  RoyaltyCurrencyMismatchError,
  type SalesReportLike,
  type RoyaltyRuleSnapshot,
  type RoyaltyBreakdown,
  ruleEffectiveOn,
  assertRuleEffectiveForPeriod,
  snapshotRule,
  selectRuleForPeriod,
  computeRoyalty,
  royaltyCalculationKey,
  type BuildRoyaltyCalculationInput,
  buildRoyaltyCalculation,
  computeRoyaltyForReport,
  type RoyaltyRulePatch,
  type NextRuleVersionResult,
  createNextRuleVersion,
} from './royalty.js';

// ─── territory.ts ──────────────────────────────────────────
export {
  type OverlapOutcome,
  type TerritoryConflict,
  haversineMeters,
  territoriesOverlap,
  findExclusiveTerritoryConflicts,
  type TerritoryValidation,
  validateTerritory,
  territoryTypeFromGeo,
} from './territory.js';

// ─── agreement.ts ──────────────────────────────────────────
export {
  AGREEMENT_STATUS_FLOW,
  isAgreementStatus,
  canTransitionAgreement,
  type DerivedAgreementStatusInput,
  type AgreementStatus,
  deriveAgreementStatus,
  type ExpiryAlertLevel,
  type ExpiryAlert,
  expiryAlertLevel,
  agreementExpiryAlerts,
  noticeCompliant,
  expirationDateFromTerm,
  agreementOperationalStatus,
} from './agreement.js';

// ─── audit.ts ──────────────────────────────────────────────
export {
  AUDIT_STATUS_FLOW,
  canTransitionAudit,
  CORRECTIVE_ACTION_STATUS_FLOW,
  canTransitionCorrectiveAction,
  effectiveCorrectiveActionStatus,
  effectiveAuditStatus,
  type AuditScore,
  scoreFromFindings,
  correctiveActionOperationalStatus,
  correctiveActionCounts,
} from './audit.js';

// ─── access.ts ─────────────────────────────────────────────
export {
  type AccessDecision,
  canReadNetwork,
  canReadRoyalties,
  canReadAudits,
  canReadAgreements,
  canWriteFinancial,
  canAccessUnit,
  mapTenantStaffRole,
} from './access.js';

// ─── events.ts ─────────────────────────────────────────────
export {
  FRANCHISE_EVENTS,
  type FranchiseEventName,
  type FranchiseEvent,
  franchiseEvent,
} from './events.js';

// ─── constants.ts (re-exported via types.ts) ───────────────
export {
  FINDING_SEVERITIES,
} from './constants.js';
