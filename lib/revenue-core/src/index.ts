export type CommissionModel = 'manual' | 'flat' | 'percentage' | 'tiered';

export type CommissionQuoteInput = {
  model: CommissionModel;
  grossValue?: number | null;
  commissionValue?: number | null;
};

export type CommissionQuote = {
  amount: number | null;
  reason: string;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function quoteCommission(input: CommissionQuoteInput): CommissionQuote {
  const value = input.commissionValue;
  if (input.model === 'manual' || input.model === 'tiered') {
    return { amount: null, reason: `${input.model} commission requires explicit terms/event` };
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return { amount: null, reason: 'commission value is missing or invalid' };
  }
  if (input.model === 'flat') {
    return { amount: roundMoney(value), reason: 'flat commission' };
  }
  const gross = input.grossValue;
  if (typeof gross !== 'number' || !Number.isFinite(gross) || gross < 0) {
    return { amount: null, reason: 'gross value is required for percentage commission' };
  }
  return { amount: roundMoney(gross * (value / 100)), reason: 'percentage commission' };
}

export type CommissionEventLike = {
  event_type: 'estimated' | 'confirmed' | 'adjusted' | 'reversed' | 'paid';
  amount: number;
};

export function summarizeCommissionEvents(events: CommissionEventLike[]) {
  let expected = 0;
  let confirmed = 0;
  let paid = 0;

  for (const event of events) {
    if (!Number.isFinite(event.amount)) continue;
    switch (event.event_type) {
      case 'estimated':
        expected += event.amount;
        break;
      case 'confirmed':
        confirmed += event.amount;
        break;
      case 'adjusted':
        confirmed += event.amount;
        break;
      case 'reversed':
        confirmed -= event.amount;
        expected -= event.amount;
        break;
      case 'paid':
        paid += event.amount;
        break;
    }
  }

  return {
    expected: roundMoney(expected),
    confirmed: roundMoney(confirmed),
    paid: roundMoney(paid),
    receivable: roundMoney(Math.max(0, confirmed - paid)),
  };
}

export * from './health-travel';
