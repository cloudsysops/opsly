---
status: active
owner: product
last_review: 2026-06-22
---

# Peskids Admin User Validation

> Validar y configurar usuario admin: peskids.admin@gmail.com

---

## 📋 Resumen

**Usuario Admin Peskids:**
```
Email:          peskids.admin@gmail.com
Tenant Slug:    peskids
Role:           admin
Status:         ⏳ PENDING VALIDATION
```

**Owner (Principal):**
```
Email:          sierrasantiago90@gmail.com
Role:           owner
Status:         ✅ VERIFIED
```

---

## ✅ Estado Actual

### El usuario existe?

```bash
# Check in Supabase Dashboard:
  https://supabase.com/dashboard
  → Project: jkwykpldnitavhmtuzmo
  → Authentication → Users
  → Search: peskids.admin@gmail.com

Expected: User found with email_confirmed_at ≠ NULL
```

### El usuario tiene permisos?

```bash
# Check user metadata:
  Supabase → Users → peskids.admin@gmail.com → Metadata (JSON)

Expected JSON:
{
  "tenant_slug": "peskids",
  "role": "admin"
}
```

### RLS Policies OK?

```bash
# Check database policies:
  Supabase → SQL Editor
  
  SELECT policy_name, qual, cmd
  FROM pg_policies
  WHERE tablename = 'leads';

Expected: Policies allow SELECT/INSERT/UPDATE/DELETE when:
  (auth.jwt() ->> 'user_metadata' ->> 'tenant_slug') = 'peskids'
```

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Create User in Supabase

**Option A: Dashboard (Easiest)**

1. Go: https://supabase.com/dashboard
2. Project: `jkwykpldnitavhmtuzmo` (ops-intcloudsysops)
3. Click: **Authentication → Users**
4. Click: **"Invite user"** (green button)
5. Email: `peskids.admin@gmail.com`
6. Check: **"Auto send invite link"** ✓
7. Click: **"Send invite"**
8. User receives email with verification link

**Option B: Admin API (Programmatic)**

```bash
# Requires SERVICE_ROLE_KEY (from Supabase Settings)
ADMIN_KEY="<your-service-role-key>"
ANON_KEY="<your-anon-key>"

curl -X POST 'https://jkwykpldnitavhmtuzmo.supabase.co/auth/v1/admin/users' \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "peskids.admin@gmail.com",
    "password": "TempPassword123!",
    "email_confirm": true,
    "user_metadata": {
      "tenant_slug": "peskids",
      "role": "admin"
    }
  }'
```

### Step 2: Set User Metadata

**In Supabase Dashboard:**

1. Go: **Authentication → Users**
2. Find: `peskids.admin@gmail.com`
3. Click on user row
4. Scroll to: **User metadata** (JSON editor)
5. Add:
```json
{
  "tenant_slug": "peskids",
  "role": "admin"
}
```
6. Click: **Save**

### Step 3: Verify Email

User should receive email:
```
From: noreply@mail.supabase.io
Subject: Confirm your signup
Body: [Link to verify email]
```

User must:
1. Check inbox (or spam folder)
2. Click verification link
3. Set password
4. Log in to https://peskids.op-sly.com/admin

---

## ✅ Validation Checklist

Run this to verify everything is configured:

```bash
bash scripts/peskids-admin-user-setup.sh validate
```

**Manual Checklist:**

- [ ] User exists in Supabase auth
- [ ] `email_confirmed_at` is NOT NULL (email verified)
- [ ] User metadata contains `tenant_slug: peskids`
- [ ] User metadata contains `role: admin`
- [ ] RLS policies active on `leads` table
- [ ] RLS policies active on `students` table
- [ ] User can log in to https://peskids.op-sly.com/admin
- [ ] Dashboard loads (no 403 Forbidden)
- [ ] Can view leads table (no permission errors)

---

## 🔑 User Roles & Permissions

### Admin Role (peskids.admin@gmail.com)
```
Access:
  ✅ View all leads
  ✅ Create/edit/delete leads
  ✅ View students
  ✅ View messages
  ✅ Send messages
  ✅ Dashboard & analytics
  ✅ Settings (admin only)

RLS Scopes:
  ✅ All records where tenant_slug = 'peskids'
```

### Other Roles
```
Staff:    Can manage leads + send messages
Teacher:  Can view classes + submit feedback
Parent:   Can view student progress
Owner:    Full access + user management
```

---

## 🔐 Security Checklist

- [ ] No hardcoded passwords in code
- [ ] User metadata uses lowercase `tenant_slug`
- [ ] RLS policies use JWT extraction: `auth.jwt() ->> 'user_metadata'`
- [ ] Email verified before granting access
- [ ] No static/long-lived API keys in user data
- [ ] Password reset available (password recovery via email)

---

## 🛠️ Troubleshooting

### Issue: User Not Found

```
Error: User peskids.admin@gmail.com does not exist
```

**Fix:**
1. Create user via Supabase Dashboard (Step 1 above)
2. Verify email address spelling: `peskids.admin@gmail.com`
3. Check correct Supabase project: `jkwykpldnitavhmtuzmo`

---

### Issue: Login Fails (403 Forbidden)

```
Error: You don't have permission to access this resource
```

**Fix:**
1. Check email is verified: `email_confirmed_at ≠ NULL`
2. Verify user metadata:
   ```json
   {
     "tenant_slug": "peskids",
     "role": "admin"
   }
   ```
3. Check RLS policies on tables (must allow tenant_slug filtering)
4. Verify JWT is being sent in Authorization header

**Debug:**
```bash
# Decode JWT to see user_metadata:
# 1. Log in to https://peskids.op-sly.com/admin
# 2. Open browser console (F12)
# 3. Run: localStorage.getItem('supabase.auth.token')
# 4. Copy token
# 5. Paste at: https://jwt.io
# 6. Check payload contains: user_metadata.tenant_slug = 'peskids'
```

---

### Issue: Email Verification Link Expired

```
Error: Link has expired or is invalid
```

**Fix:**
1. Go: Supabase Dashboard → Authentication → Users
2. Find: `peskids.admin@gmail.com`
3. Click menu (⋯) → Resend confirmation email
4. User checks email again + clicks new link

---

### Issue: Can't See Data (Empty Tables)

```
Landing page loads, but no leads/students visible
```

**Fix:**
1. Verify RLS policies are active
2. Check tenant_slug in JWT matches table tenant scope
3. Verify leads table has seed data (might be empty initially)

**Test Query (in Supabase SQL Editor):**
```sql
-- Check if leads exist for peskids tenant
SELECT COUNT(*) FROM leads WHERE tenant_slug = 'peskids';

-- Check RLS policy
SELECT policy_name, qual
FROM pg_policies
WHERE tablename = 'leads'
AND qual LIKE '%tenant_slug%';

-- Check user's JWT (once logged in)
-- Via browser console: localStorage.getItem('supabase.auth.token')
```

---

## 📊 User Comparison

| Property | Owner | Admin | Staff |
|----------|-------|-------|-------|
| **Email** | sierrasantiago90@gmail.com | peskids.admin@gmail.com | (varies) |
| **Role** | owner | admin | staff |
| **Can login** | ✅ | ✅ | ✅ |
| **View leads** | ✅ | ✅ | ✅ |
| **Edit leads** | ✅ | ✅ | ✅ |
| **Delete leads** | ✅ | ✅ | ❌ |
| **Settings** | ✅ | ✅ | ❌ |
| **User mgmt** | ✅ | ❌ | ❌ |

---

## 🔗 Related

- `scripts/peskids-admin-user-setup.sh` — Validation script
- `apps/peskids/lib/validation/` — Input validation (Zod)
- `docs/tenants/peskids/INCUBATION-CHECKLIST.md` — Onboarding checklist
- `apps/api/lib/peskids/` — API auth middleware

---

## ✅ Completion

Admin user is ready when:
1. ✅ User exists in Supabase
2. ✅ Email verified
3. ✅ Metadata set correctly
4. ✅ User can log in
5. ✅ Dashboard loads
6. ✅ Can access leads/data

---

*Last updated: 2026-06-22 by Claude (claude-haiku-4-5-20251001)*
