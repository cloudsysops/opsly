---
status: draft
owner: operations
last_review: 2026-05-24
type: tenant
tags:
  - opsly/tenant
---

# Phase 2: WhatsApp + Instagram Live Testing

**Status:** Ready to Begin  
**Owner Approval:** Pending  
**Timeline:** 1-2 days (local testing only)

---

## ✅ Phase 1 Complete (Days 1-6)

- ✅ Dashboard "Inbound Messages" card created
- ✅ n8n workflow definitions ready (`.n8n/1-workflows/peskids/`)
- ✅ Messages database table with RLS
- ✅ Approval-first reply endpoint
- ✅ Setup documentation (N8N-SETUP.md)
- ✅ All code committed to `feat/jelou-integration` branch

---

## Phase 2 Checklist

### Step 1: Prepare n8n on VPS

- [ ] SSH to VPS: `ssh vps-dragon@100.120.151.91`
- [ ] Verify n8n is running: `docker ps | grep n8n`
- [ ] Open n8n dashboard: `http://n8n-peskids.{PLATFORM_DOMAIN}`
- [ ] Login to n8n

### Step 2: Configure WhatsApp (Baileys)

- [ ] In n8n: **New → Blank Workflow**
- [ ] Copy content from `.n8n/1-workflows/peskids/whatsapp-receiver.json`
- [ ] Paste into n8n JSON editor
- [ ] Click **Activate**
- [ ] Wait for Baileys QR code to appear
- [ ] **On your phone:** Open WhatsApp → Camera → Scan QR
- [ ] Confirm WhatsApp login on phone
- [ ] Verify n8n shows "Connected"

### Step 3: Test WhatsApp (First Message)

- [ ] From another phone: Send test message to your WhatsApp number
- [ ] Check Peskids dashboard: `http://peskids.{PLATFORM_DOMAIN}/admin`
- [ ] Verify message appears in "New Inbound Messages" card within 2 seconds
- [ ] ✅ **WhatsApp working** if message visible

### Step 4: Configure Instagram (Make.com)

- [ ] Create free Make.com account: https://make.com
- [ ] **Create new scenario** in Make.com
- [ ] Search trigger: **"Instagram"**
- [ ] Select: **Instagram Graph API → Watch Direct Messages**
- [ ] Click **"Sign in with Instagram"**
- [ ] Authorize Make.com (give DM permissions)
- [ ] Select your Instagram account

### Step 5: Setup Make.com → n8n Webhook

Doppler (`prd`) debe tener Make ya configurado — ver [`MAKE-SETUP.md`](../../01-development/MAKE-SETUP.md). No uses `MAKE_API_KEY` (no existe); el token canónico es **`MAKE_API_TOKEN`**.

```bash
# Mac local — solo si faltan vars Make en Doppler
./scripts/doppler-configure-make-prd.sh --dry-run
./scripts/doppler-configure-make-prd.sh
```

- [ ] In Make.com scenario: **Add module → HTTP → Make a request**
- [ ] **URL** (público, no hostname Docker interno):
  - n8n: `https://n8n-peskids.op-sly.com/webhook/peskids-instagram`  
    (o valor de `N8N_WEBHOOK_BASE_URL` en Doppler + `/peskids-instagram`)
  - Opcional ingress Make: `TENANT_PESKIDS_MAKE_WEBHOOK_URL` en Doppler (`opsly-peskids-ingress`)
- [ ] Method: **POST**
- [ ] Body (JSON):
  ```json
  {
    "from_id": "{{instagram.user_id}}",
    "sender_handle": "{{instagram.username}}",
    "sender_name": "{{instagram.sender_name}}",
    "message": "{{instagram.message_text}}",
    "messageId": "{{instagram.message_id}}",
    "timestamp": "{{now}}"
  }
  ```
- [ ] Click **Save**
- [ ] Click **Turn on** (enable scenario)

### Step 6: Test Instagram (First Message)

- [ ] From another Instagram account: Send test DM to your account
- [ ] Check Peskids dashboard
- [ ] Verify DM appears in "New Inbound Messages" card within 2 seconds
- [ ] ✅ **Instagram working** if DM visible

### Step 7: Test Approval-First Reply

- [ ] In dashboard: Click on a WhatsApp message
- [ ] Modal opens: Verify original message is read-only
- [ ] Type test reply: "Hola, recibí tu mensaje"
- [ ] Click **Send** (or **Preview** first)
- [ ] Verify reply logged to "New Inbound Messages" with your name as sender
- [ ] Check original sender received the reply (on their WhatsApp)
- [ ] ✅ **Reply flow working** if message sent back

### Step 8: Verify Event Bus

- [ ] Check Opsly event bus logs for events:
  ```
  - message.received (WhatsApp + Instagram)
  - message.replied (your replies)
  ```
- [ ] Verify tenant_id = "peskids" on all events
- [ ] ✅ **Event bus working** if events present

---

## Troubleshooting

### "No message appears in dashboard"

1. Check n8n workflow is **Activated** (green checkmark)
2. View n8n logs: **Dashboard → Workflows → whatsapp-receiver → Execution history**
3. Check Supabase: Query `messages` table for recent inserts
4. Verify Peskids API is returning data: `curl http://peskids.{DOMAIN}/api/dashboard`

### "WhatsApp login failed"

1. In n8n: Click workflow → **Credentials → Baileys**
2. Click **"Re-authenticate"**
3. Scan QR code again with phone
4. Wait 5 seconds for session to initialize

### "Instagram messages not appearing"

1. Verify Make.com scenario is **ON** (blue switch)
2. In Make.com: Use **"Test"** to simulate a DM
3. Check n8n logs for webhook hits: `docker logs n8n-peskids | grep instagram`
4. Verify webhook URL in Make.com matches: `http://n8n-peskids:5678/webhook/peskids-instagram`

---

## Phase 2 Success Criteria ✅

- [ ] WhatsApp message appears in dashboard within 2s
- [ ] Instagram DM appears in dashboard within 2s
- [ ] Reply can be sent and received back
- [ ] Events emitted to Opsly event bus
- [ ] No errors in n8n logs
- [ ] Owner confirms "looks good"

---

## Phase 3 (Future)

Once Phase 2 validated:
1. Add **actual send functionality** to reply endpoint (call n8n to send via Baileys/Make.com)
2. Add **reply modal** with preview before send
3. Add **message search** and **filters**
4. Consider **automated replies** (approval-first AI suggestions)
5. Migrate to **Meta Official API** when approval arrives

---

## Related Files

- `docs/tenants/peskids/N8N-SETUP.md` — Detailed setup guide
- `docs/tenants/peskids/AUDIT-EXEMPTIONS.md` — Pre-existing vulnerabilities
- `.n8n/1-workflows/peskids/whatsapp-receiver.json` — WhatsApp workflow
- `.n8n/1-workflows/peskids/instagram-webhook-receiver.json` — Instagram webhook (future)
- `apps/peskids/app/api/messages/[messageId]/reply/route.ts` — Reply endpoint
- `apps/peskids/app/admin/page.tsx` — Dashboard component

---

**Ready to begin Phase 2?**  
Confirm, and we'll start with WhatsApp QR scan setup.

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
