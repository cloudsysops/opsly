# Peskids WhatsApp Meta Cloud API - Human Setup Steps

**Owner:** Cristian Boteros (cboteros1@gmail.com), Santiago (Santi)  
**Last Updated:** 2026-07-19  
**Status:** Pre-Integration Ready  

---

## Overview

This document outlines the **manual, non-technical steps** that must be completed in Meta's Business Suite to enable WhatsApp Cloud API integration with Peskids. All code is ready; this guide bridges the gap between infrastructure and live service.

---

## Prerequisites

- **Meta Business Account:** Existing or new account in your organization
- **Business Portfolio:** Access to Meta Business Suite (https://business.facebook.com)
- **Email:** Cristian's work email or primary account email for logins
- **Phone Number:** Verified WhatsApp Business Phone Number (E164 format, e.g., +55 11 9 8765-4321)
- **Access Level:** Admin on Meta Business Account

---

## Phase 1: Create/Verify Business Portfolio

### Step 1.1: Access Meta Business Suite

1. Go to https://business.facebook.com
2. Log in with your Meta/Facebook account (or create one if needed)
3. Click **"Create Account"** if you don't have a Business Account yet
4. Fill in:
   - **Business Name:** `Peskids` (or your business name)
   - **Business Email:** Cristian's email (cboteros1@gmail.com)
   - **Business Address:** Peskids office address
   - **Phone Number:** Peskids main phone
5. Accept terms and proceed

### Step 1.2: Verify Business Portfolio

1. In Business Suite, click **Settings** (bottom left)
2. Navigate to **Business Information**
3. Verify:
   - Business name, email, address are correct
   - Primary contact email
   - Business website (if applicable)
4. **Note:** Save the **Business ID** from the URL bar (format: `act_XXXXXXXXXXX`)
   - ⚠️ **Save this ID** — you'll need it in Step 3.1

---

## Phase 2: Create WhatsApp Business App

### Step 2.1: Create Meta App

1. Go to https://developers.facebook.com (logged in as same Meta account)
2. Click **My Apps** (top right)
3. Click **Create App** (blue button, top right)
4. In the dialog:
   - **App Name:** `Peskids WhatsApp Integration` (or similar)
   - **App Purpose:** Select **"Business"**
   - **App Type:** Keep default
5. Fill in contact info and accept terms
6. Click **Create App**

### Step 2.2: Verify App Created

1. You should see your new app in **My Apps** dashboard
2. Click on the app name to open its Settings
3. **Note and save:**
   - **App ID** (displayed at top of page, format: `123456789`)
   - **App Secret** (in Settings → Basic, hidden by default — click "Show")
   - ⚠️ **Do not share App Secret with anyone**

---

## Phase 3: Set Up WhatsApp Product

### Step 3.1: Add WhatsApp Product

1. In your app's dashboard, click **Add Products**
2. Find **WhatsApp** in the product list
3. Click **Set Up** button for WhatsApp
4. You'll be redirected to the **WhatsApp Business Platform Setup**

### Step 3.2: Accept Terms and Select Business

1. Accept WhatsApp Business Platform terms
2. Select your **Business Portfolio** (from Phase 1)
3. Click **Continue**

### Step 3.3: Create WhatsApp Business Account (WABA)

1. You should see an option to create a **WhatsApp Business Account (WABA)**
2. Click **Create New Account**
3. Fill in:
   - **Account Name:** `Peskids Main` (or another name)
   - **Industry:** Select appropriate industry (e.g., "Other")
   - **Business Description:** Brief description of Peskids service
4. Click **Create Account**

### Step 3.4: Verify WABA Created

1. After creation, you should see your WABA listed
2. **Note and save the WABA ID** (format: `123456789123456789`)
3. Click into the WABA to view details

---

## Phase 4: Add and Verify Phone Number

### Step 4.1: Add Phone Number to WABA

1. In your WABA settings, find **Phone Numbers** section
2. Click **Add Phone Number**
3. Enter your WhatsApp Business Phone Number:
   - **Format:** E164 with country code (e.g., `+551198765432`)
   - **Type:** Business account phone
4. Click **Next**

### Step 4.2: Verify Phone Number

1. Meta will send a **verification code** via:
   - SMS to the phone number, OR
   - Automated call to the phone number
2. Choose your preferred method
3. Retrieve the code and enter it in Meta's form
4. Click **Verify**

### Step 4.3: Confirm Phone Number Verified

1. The phone should now show status: **"Verified"** or **"Active"**
2. **Note and save the Phone Number ID** (format: `123456789123456789`)
3. This is your `PHONE_NUMBER_ID` for the integration

---

## Phase 5: Configure Webhook URL

### Step 5.1: Prepare Webhook Configuration

Before entering the webhook in Meta, ensure your Opsly infrastructure is running:

```bash
# From your local/VPS environment
docker-compose up -d peskids

# Verify health endpoint is accessible
curl https://localhost:3000/api/public/integrations/whatsapp/meta/health
# Should return status 200 (or disabled if flag not set)
```

### Step 5.2: Generate Verify Token

Generate a **Verify Token** (a secret string that Meta will use to verify requests):

```bash
# Generate 32-character random token
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**Save this token** — you'll need it for both Meta and Opsly environment variables.

### Step 5.3: Set Webhook URL in Meta

1. In your app's WhatsApp product settings, find **Webhooks** or **Configuration**
2. Look for **Webhook URL** field
3. Enter your webhook endpoint:
   ```
   https://<your-opsly-domain>/api/public/integrations/whatsapp/meta/webhook
   ```
   Example: `https://peskids.op-sly.com/api/public/integrations/whatsapp/meta/webhook`

4. Enter your **Verify Token** (from Step 5.2)
5. Click **Verify and Save**

### Step 5.4: Verify Webhook Connection

1. Meta will send a **challenge request** to your webhook URL
2. Your Opsly server will respond with the challenge string
3. If successful, you'll see: **"Webhook verified"** or similar message
4. If failed, check:
   - Domain/URL is reachable from the internet
   - Firewall/security groups allow HTTPS on port 443
   - `/api/public/integrations/whatsapp/meta/webhook` endpoint exists
   - Verify token matches exactly

---

## Phase 6: Subscribe to Webhook Events

### Step 6.1: Select Webhook Fields

1. In Meta dashboard, find **Webhook Fields** or **Subscribe to events**
2. Enable these fields:
   - `messages` (inbound messages)
   - `statuses` (message delivery/read status)
   - `template_status_update` (template approvals)
3. Click **Save** or **Subscribe**

### Step 6.2: Verify Subscriptions

1. Ensure the fields show status **"Subscribed"** or **"Active"**
2. Test by sending a WhatsApp message to your phone number
3. Check your Opsly logs for webhook receipt:
   ```bash
   # On VPS or local environment
   docker logs -f peskids | grep "Meta Webhook"
   ```

---

## Phase 7: Generate Access Token

### Step 7.1: Create App Access Token

1. In your app's Settings, go to **Basic**
2. Look for **App Roles** or **Access Tokens** section
3. Click **Generate Token** or **Create Access Token**
4. Select scope:
   - `whatsapp_business_messaging` (send messages)
   - `whatsapp_business_account_management` (account management)
5. Click **Generate**

### Step 7.2: Save Access Token

1. Copy the **Access Token** (long string starting with `EAAXXXXX...`)
2. ⚠️ **Store securely** — you'll only see it once
3. If lost, regenerate via same process

### Step 7.3: Set Access Token Expiry (Optional)

1. By default, tokens may expire
2. For production, consider:
   - Generating a **long-lived token** (60 days) instead of default (1 hour)
   - Setting up automated token refresh in your integration
3. Note the expiry date

---

## Phase 8: Configure Opsly Environment Variables

### Step 8.1: Prepare Credentials

Gather all credentials from Phases 1-7:

| Variable | Value | Source |
|----------|-------|--------|
| `META_APP_ID` | e.g., `123456789` | Phase 2.2 |
| `META_APP_SECRET` | e.g., `abc123def456...` | Phase 2.2 |
| `META_VERIFY_TOKEN` | e.g., `randomly-generated-string` | Phase 5.2 |
| `META_ACCESS_TOKEN` | e.g., `EAAXXXXX...` | Phase 7.2 |
| `META_WABA_ID` | e.g., `123456789123456789` | Phase 3.4 |
| `META_PHONE_NUMBER_ID` | e.g., `123456789123456789` | Phase 4.3 |
| `META_API_VERSION` | `v21.0` | Use latest (hardcoded in env) |

### Step 8.2: Upload to Doppler

1. Access Doppler (https://doppler.com or via CLI):
   ```bash
   doppler run --project ops-intcloudsysops --config prd -- bash
   ```

2. Create/update the following secrets in Doppler `prd` config:
   ```bash
   doppler secrets set META_APP_ID "123456789"
   doppler secrets set META_APP_SECRET "abc123def456..."
   doppler secrets set META_VERIFY_TOKEN "randomly-generated-string"
   doppler secrets set META_ACCESS_TOKEN "EAAXXXXX..."
   doppler secrets set META_WABA_ID "123456789123456789"
   doppler secrets set META_PHONE_NUMBER_ID "123456789123456789"
   ```

### Step 8.3: Enable WhatsApp Features

1. Set feature flags in Doppler:
   ```bash
   doppler secrets set META_WEBHOOK_ENABLED "true"
   doppler secrets set PESKIDS_WHATSAPP_ENABLED "true"
   doppler secrets set PESKIDS_WHATSAPP_PROVIDER "meta"  # or "wacrm"
   ```

2. Optional flags:
   ```bash
   doppler secrets set PESKIDS_WHATSAPP_SANDBOX "false"     # Use production
   doppler secrets set PESKIDS_WHATSAPP_APPROVAL_REQUIRED "true"  # Require approval
   ```

---

## Phase 9: Test Webhook Connection

### Step 9.1: Send Test Message

1. From the Meta dashboard or your WhatsApp phone, send a test message to your Peskids number
2. Verify in Opsly logs:
   ```bash
   docker logs -f peskids | grep "Meta Webhook"
   ```
   Should see: `✓ Message received from 55512345678`

### Step 9.2: Check Database

1. Connect to your Supabase instance:
   ```bash
   npm run db:codegen --workspace=@intcloudsysops/migrations
   ```

2. Query the `whatsapp_messages` table:
   ```sql
   SELECT * FROM whatsapp_messages
   WHERE tenant_id = 'tenant-peskids'
   ORDER BY created_at DESC LIMIT 5;
   ```
   Should see your test message persisted

### Step 9.3: Verify Twenty CRM Sync

1. Check `peskids_leads` table:
   ```sql
   SELECT * FROM peskids_leads
   WHERE whatsapp_contact_id IS NOT NULL
   ORDER BY created_at DESC LIMIT 1;
   ```

2. Verify Twenty GraphQL sync:
   - Check for corresponding `Person` record in Twenty CRM
   - Check sync status: `whatsapp_sync_status = 'synced'`

---

## Phase 10: Approve Message Templates (Optional)

### Step 10.1: Create Template in Meta

1. In Meta Business Suite, go to **WhatsApp → Templates**
2. Click **Create Template**
3. Template name: e.g., `order_confirmation`
4. Language: Your primary language
5. Category: Select appropriate (e.g., "Marketing")
6. Template content:
   ```
   Hello {{customer_name}},

   Your order #{{order_id}} is confirmed.
   Amount: {{amount}}

   Thank you!
   ```
7. Click **Submit for Review**

### Step 10.2: Wait for Meta Approval

1. Meta reviews templates (usually within 24 hours)
2. You'll receive notification when approved
3. Once approved, template is ready for sending

### Step 10.3: Store Template in Database

1. Insert approved template into `whatsapp_templates`:
   ```sql
   INSERT INTO whatsapp_templates (
     tenant_id, external_template_id, name, language, status,
     approved_at, created_at
   ) VALUES (
     'tenant-peskids',
     'template_123', 
     'order_confirmation',
     'pt_BR',
     'APPROVED',
     NOW(),
     NOW()
   );
   ```

---

## Phase 11: Go-Live Checklist

Before enabling Peskids WhatsApp for production:

- [ ] **All Phase 1-10 steps completed**
- [ ] **Webhook connection verified** (test message received and logged)
- [ ] **Message persisted in Supabase** (`whatsapp_messages` table)
- [ ] **Contact synced to Twenty CRM** (Person created)
- [ ] **Approval workflow tested** (draft → pending → approved → sent)
- [ ] **Provider health check passing** (`/api/health/integrations` returns healthy)
- [ ] **n8n workflows running** (inbound message flow tested)
- [ ] **Doppler secrets verified** (no missing values)
- [ ] **Feature flags enabled** (`META_WEBHOOK_ENABLED=true`, `PESKIDS_WHATSAPP_ENABLED=true`)
- [ ] **WACRM fallback configured** (if using as backup provider)
- [ ] **Monitoring/alerting set up** (Slack notifications for failures)

---

## Phase 12: Troubleshooting

### Webhook Not Receiving Messages

**Problem:** Messages sent to Peskids number but no webhook events received

**Diagnosis:**
```bash
# Check Meta app is connected to WABA
# Check phone number is active in WABA
# Verify webhook URL from Meta dashboard matches Opsly domain
```

**Fix:**
1. Re-verify webhook URL in Meta dashboard (Phase 5.3)
2. Check domain DNS resolution:
   ```bash
   nslookup peskids.op-sly.com
   ```
3. Check firewall allows inbound HTTPS from Meta IPs:
   - Meta IP ranges: 169.45.80.0/23, 169.45.82.0/24, etc.
   - Allow port 443 from anywhere initially, then restrict to Meta IPs

### Messages Not Persisting

**Problem:** Webhook received but message not in database

**Diagnosis:**
```bash
docker logs peskids | grep "Error"
docker logs peskids | grep "database"
```

**Fix:**
1. Verify Supabase connection string in Doppler
2. Run migrations:
   ```bash
   npm run db:migrate --workspace=@intcloudsysops/migrations
   ```
3. Check RLS policies on `whatsapp_messages` table allow inserts

### Approval Queue Not Showing

**Problem:** Created draft message but not appearing in pending approvals

**Diagnosis:**
```sql
SELECT * FROM whatsapp_outbox
WHERE tenant_id = 'tenant-peskids'
ORDER BY created_at DESC LIMIT 1;
```

**Fix:**
1. Check message is in correct tenant
2. Verify `approval_required` flag is set in tenant settings
3. Check admin API endpoint is returning correct response:
   ```bash
   curl https://localhost:3000/api/admin/peskids/peskids/whatsapp/pending-approvals
   ```

### Access Token Expired

**Problem:** Messages fail to send with "Invalid Access Token" error

**Diagnosis:**
```bash
# Access tokens expire (usually 1 hour or 60 days depending on type)
# Check token expiry date
```

**Fix:**
1. Generate new token (Phase 7.1-7.2)
2. Update Doppler:
   ```bash
   doppler secrets set META_ACCESS_TOKEN "new_token_here"
   ```
3. Restart services for token change to take effect:
   ```bash
   docker-compose restart peskids
   ```

---

## Support and Documentation

- **Meta WhatsApp Cloud API Docs:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **Opsly Integration Docs:** See `docs/integrations/PESKIDS-WHATSAPP-INTEGRATION.md`
- **WACRM Setup Guide:** See `docs/integrations/PESKIDS-WACRM-OPERATIONS.md`
- **Contact:** Claude (dev) or Cristian (cboteros1@gmail.com) for issues

---

## Completion Checklist

After completing all steps:

1. **Confirm with Cristian/Santi:** All steps completed ✓
2. **Enable feature flag:** Set `PESKIDS_WHATSAPP_ENABLED=true` in Doppler
3. **Deploy:** Push to main branch and deploy to VPS
4. **Monitor:** Watch logs and Slack alerts for first 24 hours
5. **Document:** Update this file with any real-world changes needed

**Expected Timeline:** 30-45 minutes for experienced user, 1-2 hours including research and verification

---

*Last Updated: 2026-07-19 by Claude*
*Status: Ready for Cristian & Santi manual execution*
