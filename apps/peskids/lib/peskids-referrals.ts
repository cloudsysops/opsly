export const PESKIDS_REFERRAL_DISCOUNT_CENTS = 20000

export function buildPeskidsReferralCode(input: {
  tenantId: string
  leadId: string
  email: string
}): string {
  const crypto = require('node:crypto') as typeof import('node:crypto')
  const seed = `${input.tenantId}:${input.leadId}:${input.email.trim().toLowerCase()}`
  const digest = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 10).toUpperCase()
  return `PK-${digest}`
}
