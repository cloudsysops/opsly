import { z } from 'zod';

const isoDate = z.string().trim().min(8).max(32);

export const franchiseTerritoryPostSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    unitId: z.string().uuid().nullable().optional(),
    exclusive: z.boolean().optional(),
    exclusiveFor: z.enum(['fixed_location', 'home_service', 'both']).optional(),
    validFrom: isoDate,
    validTo: isoDate.nullable().optional(),
    geometry: z
      .object({
        kind: z.literal('municipality'),
        countryCode: z.string().trim().min(2).max(8),
        adminName: z.string().trim().min(2).max(120),
      })
      .strict(),
  })
  .strict();

export const franchiseAgreementPostSchema = z
  .object({
    legalName: z.string().trim().min(2).max(160),
    unitIds: z.array(z.string().uuid()).min(1),
    effectiveDate: isoDate,
    expirationDate: isoDate,
    royaltyRuleId: z.string().uuid().nullable().optional(),
    territoryId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const franchiseSalesReportPostSchema = z
  .object({
    unitId: z.string().uuid(),
    periodStart: isoDate,
    periodEnd: isoDate,
    grossSalesMinor: z.number().int(),
    excludedSalesMinor: z.number().int().optional(),
    netSalesMinor: z.number().int().optional(),
    source: z.string().trim().min(1).max(32).optional(),
    sourceReference: z.string().trim().max(160).nullable().optional(),
  })
  .strict();

export const franchiseRoyaltyCalculatePostSchema = z
  .object({
    reportId: z.string().uuid(),
    ruleId: z.string().uuid().optional(),
    ruleVersion: z.number().int().positive().optional(),
    rule: z
      .object({
        name: z.string().trim().min(1).max(120).optional(),
        basis: z.enum(['gross_sales', 'net_sales']).optional(),
        percentageBps: z.number().int().nonnegative().optional(),
        minimumAmountMinor: z.number().int().nullable().optional(),
        fixedFeeMinor: z.number().int().optional(),
        excludedCategories: z.array(z.string()).optional(),
        effectiveFrom: isoDate.optional(),
        effectiveTo: isoDate.nullable().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const franchiseAuditPostSchema = z
  .object({
    unitId: z.string().uuid(),
    auditor: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

export const franchiseFindingPostSchema = z
  .object({
    auditId: z.string().uuid(),
    unitId: z.string().uuid(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    notes: z.string().trim().min(1).max(2000),
    standardRef: z.string().trim().max(160).nullable().optional(),
  })
  .strict();

export const franchiseCorrectiveActionPostSchema = z
  .object({
    findingId: z.string().uuid(),
    unitId: z.string().uuid(),
    owner: z.string().trim().min(1).max(160),
    dueDate: isoDate,
  })
  .strict();
