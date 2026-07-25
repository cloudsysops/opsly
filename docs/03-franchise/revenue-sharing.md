# Franchise Revenue Sharing System

## Overview

The Peskids franchise system implements automatic revenue sharing between the parent company (Peskids) and franchises through a unified payment gateway supporting both **Stripe Connected Accounts** and **Wompi**.

### Key Features

- **Multi-provider support**: Stripe and Wompi payment processing
- **Automatic revenue split**: Configurable percentage per franchise tier
- **Guaranteed payment capture**: Webhook-based verification ensures payment confirmation
- **Audit trail**: Complete transaction tracking with status visibility
- **Dashboard reporting**: Consolidated revenue metrics and trends
- **Colombian market optimized**: Wompi integration addresses local payment preferences

---

## Architecture

### Payment Flow

```
Customer Payment
    ↓
[Franchise Payment Account]
    ├─ Stripe Connected Account (franchise_stripe_account)
    └─ Wompi Account (franchise_wompi_account)
    ↓
[Revenue Share Calculation]
    ├─ Gross Amount (100%)
    ├─ Peskids Share (20%-10% by tier)
    └─ Franchise Net (80%-90% by tier)
    ↓
[Automatic Transfer]
    ├─ Stripe: Create transfer to Peskids account
    └─ Wompi: Automatic split (if supported) or manual payout
    ↓
[Webhook Confirmation]
    ├─ Payment confirmed
    └─ Transaction marked as PAID
    ↓
[Dashboard & Reporting]
```

### Revenue Share Tiers

| Tier | Description | Revenue Share % | Franchise Net % |
|------|-------------|-----------------|-----------------|
| Startup | Up to 50 students | 20% | 80% |
| Business | 50-200 students | 15% | 85% |
| Enterprise | 200+ students | 10% | 90% |

---

## Implementation Guide

### 1. Database Setup

Apply migrations to create franchise payment tables:

```bash
npx supabase migration up --project-id jkwykpldnitavhmtuzmo
# Applies: 20260725_create_franchise_payment_system.sql
```

Tables created:
- `platform.franchise_payment_config` - Payment provider configuration
- `platform.franchise_revenue_tracking` - Transaction ledger
- `platform.franchise_revenue_summary` - Aggregated metrics

### 2. Stripe Setup

#### For Each Franchise

1. **Create Connected Account**:
   ```typescript
   // In provisioning script
   const account = await stripe.accounts.create({
     type: 'express',
     country: 'CO',
     email: 'franchise_admin@example.com',
     capabilities: {
       card_payments: { requested: true },
       transfers: { requested: true },
     },
   });
   ```

2. **Store Account ID**:
   ```typescript
   await setupFranchisePaymentProvider({
     franchiseTenantId: franchise.id,
     provider: 'stripe',
     stripeAccountId: account.id,
     revenuSharePercentage: 20, // Based on tier
   });
   ```

3. **Generate Onboarding Link** (optional, for franchise setup):
   ```typescript
   const link = await stripe.accountLinks.create({
     account: account.id,
     type: 'account_onboarding',
     refresh_url: 'https://franquicia1.op-sly.com/setup?refresh=true',
     return_url: 'https://franquicia1.op-sly.com/setup?complete=true',
   });
   // Send link to franchise admin
   ```

#### Webhook Configuration

Register webhook in Stripe Dashboard:

```
Endpoint: https://peskids.op-sly.com/api/webhooks/stripe-franchise-payment
Events:
  - transfer.created (payment confirmed)
  - transfer.failed (payment failed)
```

Environment variables:
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Wompi Setup

#### For Each Franchise

1. **Get API Credentials**:
   - Contact Wompi for business account
   - Obtain: `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`

2. **Store Configuration**:
   ```typescript
   await setupFranchisePaymentProvider({
     franchiseTenantId: franchise.id,
     provider: 'wompi',
     revenuSharePercentage: 20, // Based on tier
   });
   ```

3. **Store API Keys** (Doppler):
   ```bash
   doppler secrets set WOMPI_PRIVATE_KEY "priv_key_..."
   doppler secrets set WOMPI_EVENTS_SECRET "events_secret_..."
   ```

#### Webhook Configuration

Register in Wompi Dashboard:

```
Endpoint: https://peskids.op-sly.com/api/webhooks/wompi-franchise-payment
Events:
  - transaction.approved
  - transaction.declined
```

Environment variables:
```bash
WOMPI_PUBLIC_KEY=pub_...
WOMPI_PRIVATE_KEY=priv_...
WOMPI_EVENTS_SECRET=events_...
```

---

## Payment Processing

### Processing a Franchise Payment

```typescript
import { processPaymentWithRevenueShare } from '@/lib/services/franchise-payment.service';

const result = await processPaymentWithRevenueShare({
  franchiseTenantId: 'franchise-1-id',
  amountCents: 1000000, // 10,000 COP
  description: 'Pago de clase individual',
  currency: 'COP',
  orderId: 'order-123',
  studentId: 'student-456',
});

// Result:
// {
//   success: true,
//   transactionId: '550e8400-e29b-41d4-a716-446655440000',
//   franchiseNetCents: 800000,    // 80% for franchise
//   peskidsShareCents: 200000,    // 20% for Peskids
// }
```

### Automatic Transfers

#### Stripe Flow
1. Payment Intent created on franchise's Connected Account
2. Customer charged on franchise's account
3. After payment confirmed, automatic transfer created to Peskids account
4. Webhook event `transfer.created` triggers transaction update

#### Wompi Flow
1. Payment Link created for franchise account
2. Customer pays through Wompi
3. Wompi confirms payment via webhook `transaction.approved`
4. System records transaction with revenue split
5. Manual transfer from franchise account to Peskids (if Wompi doesn't auto-split)

---

## Webhook Handling

### Stripe Webhook Events

**transfer.created**
```json
{
  "type": "transfer.created",
  "data": {
    "object": {
      "id": "tr_123...",
      "amount": 200000,
      "destination_payment": "ch_456...",
      "created": 1626825600
    }
  }
}
```

**transfer.failed**
```json
{
  "type": "transfer.failed",
  "data": {
    "object": {
      "id": "tr_123...",
      "status": "failed"
    }
  }
}
```

### Wompi Webhook Events

**transaction.approved**
```json
{
  "event": "transaction.approved",
  "data": {
    "id": "txn_123...",
    "status": "APPROVED",
    "amount_in_cents": 1000000,
    "reference": "order-123",
    "updated_at": "2026-07-25T10:00:00Z"
  }
}
```

**transaction.declined**
```json
{
  "event": "transaction.declined",
  "data": {
    "id": "txn_123...",
    "status": "DECLINED"
  }
}
```

---

## Reporting & Dashboard

### Admin Revenue Dashboard

```bash
GET /api/admin/franchises/revenue?period=month&franchise_id=...
```

Response:
```json
{
  "ok": true,
  "data": {
    "summary": {
      "totalTransactions": 45,
      "totalGrossRevenue": 45000000,  // 450,000 COP
      "totalPeskidsShare": 9000000,   // 90,000 COP (20% avg)
      "totalFranchiseNet": 36000000,  // 360,000 COP
      "period": "month"
    },
    "byFranchise": [
      {
        "franchiseTenantId": "franchise-1",
        "transactionCount": 20,
        "grossRevenue": 20000000,
        "peskidsShare": 4000000,
        "franchiseNet": 16000000
      }
    ],
    "byProvider": [
      {
        "provider": "stripe",
        "transactionCount": 30,
        "grossRevenue": 30000000,
        "peskidsShare": 6000000
      },
      {
        "provider": "wompi",
        "transactionCount": 15,
        "grossRevenue": 15000000,
        "peskidsShare": 3000000
      }
    ],
    "recentTransactions": [...]
  }
}
```

### Franchise Revenue Portal

```bash
GET /api/franchise/revenue?period=month
```

Franchises can only see their own data (enforced by tenant_id).

---

## Configuration

### Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Wompi
WOMPI_PUBLIC_KEY=pub_...
WOMPI_PRIVATE_KEY=priv_...
WOMPI_EVENTS_SECRET=events_secret_...

# Peskids Stripe Account (for receiving payouts)
PESKIDS_STRIPE_ACCOUNT_ID=acct_...
```

### Database Config

Revenue share percentages are configured per franchise in `franchise_payment_config`:

```sql
INSERT INTO platform.franchise_payment_config (
  franchise_tenant_id,
  payment_provider,
  revenue_share_percentage,
  is_active
) VALUES
  (franchise-1-id, 'stripe', 20, true),  -- Startup: 20%
  (franchise-2-id, 'stripe', 15, true),  -- Business: 15%
  (franchise-3-id, 'wompi', 10, true);   -- Enterprise: 10%
```

---

## Testing

### Stripe Test Mode

```bash
# Use Stripe test keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Test transfer webhook
curl -X POST https://localhost:3004/api/webhooks/stripe-franchise-payment \
  -H "Stripe-Signature: t=123...,v1=..." \
  -d @webhook-payload.json
```

### Wompi Sandbox

```bash
# Use Wompi sandbox credentials
WOMPI_PRIVATE_KEY=priv_key_staging_...
WOMPI_EVENTS_SECRET=events_secret_staging_...

# Test with sandbox merchant
```

---

## Troubleshooting

### Transaction Not Marking as Paid

1. Verify webhook signature verification passes
2. Check `franchise_revenue_tracking.transaction_id` matches payment gateway ID
3. Ensure payment_provider field matches webhook source
4. Check application logs for webhook processing errors

### Revenue Share Calculation Incorrect

1. Verify `revenue_share_percentage` in `franchise_payment_config`
2. Ensure amounts include cents (e.g., 1000000 = 10,000 COP)
3. Check constraint: `gross_amount_cents = franchise_net_cents + peskids_share_cents`

### Missing Payouts

1. For Stripe: Verify franchise Connected Account has payout method configured
2. For Wompi: Check if automatic split is supported or manual transfer needed
3. Review transfer failures in Stripe Dashboard or Wompi logs

---

## Future Enhancements

1. **Automated Payout Scheduling**: Weekly/monthly automatic transfers to franchises
2. **Payment Method Preferences**: Allow franchises to choose Stripe or Wompi per tier
3. **Dynamic Revenue Sharing**: Adjust percentages based on KPIs (churn, student count)
4. **Currency Support**: Add support for USD, EUR alongside COP
5. **Reconciliation**: Automated daily reconciliation between payment gateway and database
6. **Advance Payouts**: Offer line-of-credit option for franchises

---

## Support

For questions or issues:
- Admin dashboard: `/admin/franchises/revenue`
- Franchise portal: `/franchise/revenue`
- API docs: `/api-docs`
- Contact: support@peskids.op-sly.com
