---
status: test-guide
type: invitation-verification
date: 2026-05-29
---

# Peskids Invitation Flow Verification

**Goal:** Verify that Santiago Sierra (sierrasantiago90@gmail.com) can be invited as admin and teacher in Peskids

---

## System Overview

**Endpoint:** `POST /api/admin/team` (peskids app)

**Roles supported:**
- `admin` — Full team management access
- `support` — Support staff access
- `teacher` — Teacher/instructor access

**Authentication:** Staff session (requires valid session token)

---

## How It Works

### 1. Authentication
The system validates a **staff session** which requires:
- Valid Supabase auth token (from login)
- User must have `owner` or `admin` role to invite others
- Current user: `sierrasantiago90@gmail.com` (owner of peskids tenant)

### 2. Invitation Payload
```json
{
  "email": "santiago.sierra@example.com",
  "name": "Santiago Sierra",
  "role": "admin"  // Can be: admin, support, teacher
}
```

### 3. Response
Returns invitation details with:
- Invitation token
- Activation URL
- Expiration time
- Role assigned

---

## Test Plan

### Step 1: Get Santiago's Current Team Status
```bash
curl -X GET https://peskids.op-sly.com/api/admin/team \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "ok": true,
  "team_members": [...],
  "owner": "sierrasantiago90@gmail.com"
}
```

### Step 2: Invite Santiago as Admin
```bash
curl -X POST https://peskids.op-sly.com/api/admin/team \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sierrasantiago90@gmail.com",
    "name": "Santiago Sierra",
    "role": "admin"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "invitation": {
    "id": "uuid",
    "email": "sierrasantiago90@gmail.com",
    "role": "admin",
    "token": "invitation_token",
    "activation_url": "https://peskids.op-sly.com/invite/activation_token",
    "expires_at": "2026-06-05T..."
  }
}
```

### Step 3: Invite Santiago as Teacher (Separate Invitation)
```bash
curl -X POST https://peskids.op-sly.com/api/admin/team \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sierrasantiago90@gmail.com",
    "name": "Santiago Sierra",
    "role": "teacher"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "invitation": {
    "id": "uuid",
    "email": "sierrasantiago90@gmail.com",
    "role": "teacher",
    "token": "invitation_token_2",
    "activation_url": "https://peskids.op-sly.com/invite/activation_token_2",
    "expires_at": "2026-06-05T..."
  }
}
```

---

## Activation Flow (For Santiago)

Once invitations are sent, Santiago will:

1. **Receive email** with "Activar mi cuenta" (Activate my account) link
2. **Click activation link** → redirected to `/invite/[token]`
3. **Set password** → creates account
4. **Access dashboard** → sees portal with both roles (admin + teacher)

---

## Verification Checklist

- [ ] Santiago can receive invitation emails (check spam folder)
- [ ] Invitation links work and don't expire prematurely
- [ ] Password setup page loads correctly
- [ ] Account activation completes successfully
- [ ] Dashboard shows both admin and teacher roles
- [ ] Admin role: can manage team, invite others, settings
- [ ] Teacher role: can see classes, feedback, student submissions
- [ ] Dual-role functionality works (no conflicts)

---

## Error Handling

**If invitation fails:**

| Error | Cause | Solution |
|-------|-------|----------|
| 403 Forbidden | Not owner/admin | Must be logged in as owner/admin |
| 400 Invalid payload | Bad email/role | Check email format, role in [admin, support, teacher] |
| 500 Unable to create invite | Database error | Check server logs, retry |

---

## Code Location

**Implementation:**
- Endpoint: `apps/peskids/app/api/admin/team/route.ts`
- Service: `apps/peskids/lib/team-management.ts` (`invitePeskidsTeamMember()`)
- Auth: `apps/peskids/lib/staff-auth.ts` (`validateStaffSession()`)

**Flow:**
```
POST /api/admin/team
  ↓
validateStaffSession()
  ↓
invitePeskidsTeamMember()
  ↓
Generate token + send email
  ↓
Return invitation details
```

---

## Next Steps

1. **Invite Santiago** as `admin` + `teacher` (two invitations)
2. **Verify email delivery** (check inbox + spam)
3. **Test activation** (click link, set password)
4. **Confirm roles** (dashboard shows both permissions)
5. **Test admin actions** (invite another user)
6. **Test teacher actions** (view classes/feedback)

---

**Status:** ✅ System ready for Santiago invitation  
**Owner:** sierrasantiago90@gmail.com  
**Tenant:** peskids  
**App:** https://peskids.op-sly.com/
