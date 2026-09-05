import { z } from 'zod';

/**
 * Validation for the franchise admin write surface.
 *
 * These routes previously cast `await req.json()` straight to a TypeScript type,
 * which validates nothing at runtime: a client could send negative money, a
 * float where minor units are required, `NaN`, an oversized string, or extra
 * keys that flow into the persistence layer.
 *
 * Every schema here is `.strict()` so unknown keys are rejected outright rather
 * than silently stripped — for money-shaped writes an unexpected field is a bug
 * or an attack, never something to ignore.
 */

/** Colombian pesos are stored in minor units; ~10 billion COP is the ceiling. */
const MAX_MINOR_UNITS = 1_000_000_000_000;

export const minorUnitsSchema = z
  .number()
  .int('Los montos deben expresarse en unidades menores enteras')
  .nonnegative('Los montos no pueden ser negativos')
  .max(MAX_MINOR_UNITS, 'Monto fuera de rango')
  .finite();

/** Basis points: 0..10000 (0%..100%). */
export const basisPointsSchema = z.number().int().min(0).max(10_000).finite();

export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Fecha inválida');

/** Mirrors SALES_REPORT_SOURCES in @intcloudsysops/franchise-core. */
export const salesSourceSchema = z.enum([
  'platform',
  'stripe',
  'wompi',
  'pos',
  'manual',
  'external',
]);

export const createSalesReportSchema = z
  .object({
    unitId: z.string().uuid('unitId debe ser un UUID'),
    periodStart: isoDateSchema,
    periodEnd: isoDateSchema,
    grossSalesMinor: minorUnitsSchema,
    excludedSalesMinor: minorUnitsSchema.optional(),
    netSalesMinor: minorUnitsSchema.optional(),
    source: salesSourceSchema.optional(),
    sourceReference: z.string().trim().max(200).nullish(),
  })
  .strict()
  .refine((data) => Date.parse(data.periodEnd) >= Date.parse(data.periodStart), {
    message: 'periodEnd debe ser posterior o igual a periodStart',
    path: ['periodEnd'],
  })
  .refine(
    (data) => (data.excludedSalesMinor ?? 0) <= data.grossSalesMinor,
    { message: 'excludedSalesMinor no puede superar grossSalesMinor', path: ['excludedSalesMinor'] }
  )
  .refine(
    (data) => data.netSalesMinor === undefined || data.netSalesMinor <= data.grossSalesMinor,
    { message: 'netSalesMinor no puede superar grossSalesMinor', path: ['netSalesMinor'] }
  );

export type CreateSalesReportInput = z.infer<typeof createSalesReportSchema>;

export const royaltyRuleInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    basis: z.enum(['gross_sales', 'net_sales']).optional(),
    percentageBps: basisPointsSchema.optional(),
    minimumAmountMinor: minorUnitsSchema.nullish(),
    fixedFeeMinor: minorUnitsSchema.optional(),
    excludedCategories: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
    effectiveFrom: isoDateSchema.optional(),
    effectiveTo: isoDateSchema.nullish(),
  })
  .strict();

export const calculateRoyaltySchema = z
  .object({
    reportId: z.string().uuid('reportId debe ser un UUID').optional(),
    ruleId: z.string().uuid('ruleId debe ser un UUID').optional(),
    ruleVersion: z.number().int().min(1).max(10_000).optional(),
    rule: royaltyRuleInputSchema.optional(),
  })
  .strict()
  .refine((data) => Boolean(data.ruleId) || Boolean(data.rule), {
    message: 'Debes enviar ruleId o rule',
    path: ['ruleId'],
  })
  .refine((data) => Boolean(data.reportId), {
    message: 'reportId es obligatorio',
    path: ['reportId'],
  });

export type CalculateRoyaltyInput = z.infer<typeof calculateRoyaltySchema>;

export const createAgreementSchema = z
  .object({
    legalName: z.string().trim().min(2).max(200),
    unitIds: z.array(z.string().uuid()).min(1).max(100),
    effectiveDate: isoDateSchema,
    expirationDate: isoDateSchema,
    royaltyRuleId: z.string().uuid().nullish(),
    territoryId: z.string().uuid().nullish(),
  })
  .strict()
  .refine((data) => Date.parse(data.expirationDate) > Date.parse(data.effectiveDate), {
    message: 'expirationDate debe ser posterior a effectiveDate',
    path: ['expirationDate'],
  });

export type CreateAgreementInput = z.infer<typeof createAgreementSchema>;
