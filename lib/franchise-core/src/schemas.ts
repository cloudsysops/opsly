/**
 * Zod schemas for the Franchise OS MVP capabilities.
 *
 * These are input contracts for the persistence/API boundary. They validate
 * tenant-neutral shapes only — no vertical (Peskids/academy) assumptions live
 * here. Enums are shared with `types.ts`; keep the two files in sync.
 */

import { z } from 'zod';
import {
  AGREEMENT_STATUSES,
  AUDIT_STATUSES,
  CORRECTIVE_ACTION_STATUSES,
  FINDING_SEVERITIES,
  FRANCHISEE_STATUSES,
  FRANCHISE_LOCATION_KINDS,
  FRANCHISE_UNIT_STATUSES,
  FRANCHISE_UNIT_TYPES,
  GEO_REFERENCE_TYPES,
  OPENING_STATUSES,
  ROYALTY_BASES,
  ROYALTY_FREQUENCIES,
  SALES_REPORT_SOURCES,
  SALES_REPORT_STATUSES,
  TERRITORY_EXCLUSIVE_FORS,
  TERRITORY_STATUSES,
  TERRITORY_TYPES,
  TAX_TREATMENTS,
} from './constants.js';

const isoDate = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), {
  message: 'Invalid ISO date/time',
});

const moneyAmount = z.object({
  amount: z.number().finite().min(0),
  currency: z.string().length(3).toUpperCase(),
});

const contact = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().trim().min(1).optional(),
  })
  .optional()
  .nullable();

export const franchiseeSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  legalName: z.string().trim().min(2).max(200),
  taxId: z.string().trim().min(1).max(64).optional().nullable(),
  status: z.enum(FRANCHISEE_STATUSES),
  primaryContact: contact,
  createdAt: isoDate,
  updatedAt: isoDate.optional().nullable(),
});
export type FranchiseeInput = z.infer<typeof franchiseeSchema>;

export const franchiseUnitSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  franchiseeId: z.string().uuid().optional().nullable(),
  code: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(200),
  type: z.enum(FRANCHISE_UNIT_TYPES),
  status: z.enum(FRANCHISE_UNIT_STATUSES),
  openingStatus: z.enum(OPENING_STATUSES),
  primaryLocationId: z.string().uuid().optional().nullable(),
  externalSource: z.string().trim().min(1).max(120).optional().nullable(),
  externalRef: z.string().trim().min(1).max(120).optional().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate.optional().nullable(),
});
export type FranchiseUnitInput = z.infer<typeof franchiseUnitSchema>;

const geoReference = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('point'),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusMeters: z.number().nonnegative().optional().nullable(),
  }),
  z.object({
    kind: z.literal('radius'),
    center: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
    radiusMeters: z.number().nonnegative(),
  }),
  z.object({
    kind: z.literal('polygon'),
    vertices: z
      .array(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }))
      .min(3),
  }),
  z.object({
    kind: z.literal('municipality'),
    code: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
  }),
]);

export const territorySchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().min(1),
    unitId: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(2).max(200),
    type: z.enum(TERRITORY_TYPES),
    status: z.enum(TERRITORY_STATUSES),
    exclusive: z.boolean(),
    exclusiveFor: z.enum(TERRITORY_EXCLUSIVE_FORS).optional().nullable(),
    validFrom: isoDate.optional().nullable(),
    validTo: isoDate.optional().nullable(),
    serviceModel: z.string().trim().min(1).max(120).optional().nullable(),
    geo: geoReference.optional().nullable(),
    createdAt: isoDate,
    updatedAt: isoDate.optional().nullable(),
  })
  .refine((t) => !(t.exclusive && !t.exclusiveFor), {
    message: 'Exclusive territories must declare exclusiveFor',
    path: ['exclusiveFor'],
  })
  .refine(
    (t) =>
      t.validFrom && t.validTo
        ? new Date(t.validFrom).getTime() <= new Date(t.validTo).getTime()
        : true,
    {
      message: 'validFrom must be <= validTo',
      path: ['validFrom'],
    }
  );
export type TerritoryInput = z.infer<typeof territorySchema>;

export const agreementSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().min(1),
    franchiseeId: z.string().uuid(),
    unitIds: z.array(z.string().uuid()).min(1),
    state: z.enum(AGREEMENT_STATUSES),
    effectiveDate: isoDate,
    expirationDate: isoDate,
    renewalType: z.enum(['fixed', 'auto', 'manual']),
    renewalTermMonths: z.number().int().positive().optional().nullable(),
    noticeDays: z.number().int().nonnegative(),
    canonicalFee: moneyAmount.optional().nullable(),
    royaltyRuleId: z.string().uuid().optional().nullable(),
    territoryId: z.string().uuid().optional().nullable(),
    documentRef: z.string().trim().min(1).max(300).optional().nullable(),
    createdAt: isoDate,
    updatedAt: isoDate.optional().nullable(),
  })
  .refine((a) => new Date(a.effectiveDate).getTime() <= new Date(a.expirationDate).getTime(), {
    message: 'effectiveDate must be <= expirationDate',
    path: ['expirationDate'],
  });
export type AgreementInput = z.infer<typeof agreementSchema>;

export const royaltyRuleSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().min(1),
    name: z.string().trim().min(2).max(200),
    version: z.number().int().positive(),
    basis: z.enum(ROYALTY_BASES),
    percentage: z.number().finite().min(0).max(100),
    minimumAmount: moneyAmount.optional().nullable(),
    fixedFee: moneyAmount.optional().nullable(),
    currency: z.string().length(3).toUpperCase(),
    frequency: z.enum(ROYALTY_FREQUENCIES),
    excludedCategories: z.array(z.string().trim().min(1)).default([]),
    taxTreatment: z.enum(TAX_TREATMENTS),
    effectiveFrom: isoDate,
    effectiveTo: isoDate.optional().nullable(),
    createdAt: isoDate,
    updatedAt: isoDate.optional().nullable(),
  })
  .refine(
    (r) =>
      r.effectiveFrom && r.effectiveTo
        ? new Date(r.effectiveFrom).getTime() <= new Date(r.effectiveTo).getTime()
        : true,
    {
      message: 'effectiveFrom must be <= effectiveTo',
      path: ['effectiveFrom'],
    }
  );
export type RoyaltyRuleInput = z.infer<typeof royaltyRuleSchema>;

export const salesReportSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().min(1),
    unitId: z.string().uuid(),
    periodStart: isoDate,
    periodEnd: isoDate,
    grossSales: z.number().finite().min(0),
    refunds: z.number().finite().min(0),
    taxes: z.number().finite().min(0),
    excludedSales: z.number().finite().min(0),
    netSales: z.number().finite().min(0),
    currency: z.string().length(3).toUpperCase(),
    source: z.enum(SALES_REPORT_SOURCES),
    sourceReference: z.string().trim().min(1).max(200).optional().nullable(),
    status: z.enum(SALES_REPORT_STATUSES),
    submittedAt: isoDate.optional().nullable(),
    createdAt: isoDate,
    updatedAt: isoDate.optional().nullable(),
  })
  .refine((s) => new Date(s.periodStart).getTime() <= new Date(s.periodEnd).getTime(), {
    message: 'periodStart must be <= periodEnd',
    path: ['periodEnd'],
  });
export type SalesReportInput = z.infer<typeof salesReportSchema>;

export const franchiseAuditSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  unitId: z.string().uuid(),
  templateId: z.string().uuid().optional().nullable(),
  auditor: z.string().trim().min(1).max(200).optional().nullable(),
  scheduledAt: isoDate.optional().nullable(),
  performedAt: isoDate.optional().nullable(),
  score: z.number().finite().min(0).max(100).optional().nullable(),
  status: z.enum(AUDIT_STATUSES),
  createdAt: isoDate,
  updatedAt: isoDate.optional().nullable(),
});
export type FranchiseAuditInput = z.infer<typeof franchiseAuditSchema>;

export const auditFindingSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  auditId: z.string().uuid(),
  unitId: z.string().uuid(),
  severity: z.enum(FINDING_SEVERITIES),
  standardRef: z.string().trim().min(1).max(120).optional().nullable(),
  evidence: z.string().trim().min(1).max(1000).optional().nullable(),
  notes: z.string().trim().min(1).max(2000).optional().nullable(),
  createdAt: isoDate,
});
export type AuditFindingInput = z.infer<typeof auditFindingSchema>;

export const correctiveActionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  findingId: z.string().uuid(),
  unitId: z.string().uuid(),
  owner: z.string().trim().min(1).max(200).optional().nullable(),
  dueDate: isoDate,
  status: z.enum(CORRECTIVE_ACTION_STATUSES),
  resolution: z.string().trim().min(1).max(2000).optional().nullable(),
  evidence: z.string().trim().min(1).max(1000).optional().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate.optional().nullable(),
});
export type CorrectiveActionInput = z.infer<typeof correctiveActionSchema>;

export const salesReportShapeSchema = z.object({
  grossSales: z.number().finite().min(0),
  refunds: z.number().finite().min(0),
  taxes: z.number().finite().min(0),
  excludedSales: z.number().finite().min(0),
  netSales: z.number().finite().min(0),
  currency: z.string().length(3).toUpperCase(),
});

export const locationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  unitId: z.string().uuid(),
  slug: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(200),
  kind: z.enum(FRANCHISE_LOCATION_KINDS),
  address: z.string().trim().min(1).max(300).optional().nullable(),
  city: z.string().trim().min(1).max(120).optional().nullable(),
  region: z.string().trim().min(1).max(120).optional().nullable(),
  country: z.string().trim().min(1).max(120).optional().nullable(),
  geo: geoReference.optional().nullable(),
  active: z.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate.optional().nullable(),
});

export const geoReferenceTypes = GEO_REFERENCE_TYPES as readonly string[];

export { moneyAmount, geoReference, isoDate };
