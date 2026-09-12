# @intcloudsysops/revenue-core

Generic revenue primitives for Opsly.

## Data path

```text
Partner
  -> Offer
  -> Attribution
  -> Referral
  -> Commission Event
  -> Payout state
```

The database schema is defined by:

`supabase/migrations/20260912_revenue_core.sql`

## Example

```ts
quoteCommission({
  model: 'percentage',
  grossValue: 6400,
  commissionValue: 8
})
// { amount: 512, reason: 'percentage commission' }
```

Manual and tiered commission structures deliberately return `amount: null` until explicit terms/events are supplied.
