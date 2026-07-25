# Franchise Forms System

## Overview

Multi-tenant forms system that allows each franchise to:
- Manage their own form templates (assigned from Peskids templates)
- Send forms to their families
- Track and view family responses
- Control form access via RLS policies

## Architecture

```
┌─────────────────────────────────────────┐
│     Peskids Admin (is_superuser=true)   │
│  - Manages global form templates        │
│  - Assigns templates to franchises      │
│  - Views all responses across franchises│
└─────────────────┬───────────────────────┘
                  │
                  ├─→ POST /api/admin/franchises/forms
                  │   Assign template to franchise
                  │
                  ↓
┌─────────────────────────────────────────┐
│   Franchise Admin (franchise_admin role)│
│  - Views assigned forms                 │
│  - Sends forms to families              │
│  - Views family responses               │
└─────────────────┬───────────────────────┘
                  │
                  ├─→ GET /api/franchise/forms
                  │   List franchise's forms
                  │
                  ├─→ POST /api/franchise/forms/send
                  │   Send form to family
                  │
                  ├─→ GET /api/franchise/forms?responses=true
                  │   View form responses
                  │
                  ↓
┌─────────────────────────────────────────┐
│        Families (Public)                │
│  - Access form via unique link          │
│  - Submit responses                     │
└─────────────────────────────────────────┘
                  │
                  └─→ POST /api/public/forms/submit
                      Submit form response
```

## Database Schema

### Core Tables

**`form_templates`** (Global - managed by Peskids)
- `id`: UUID
- `tenant_slug`: 'peskids' (shared)
- `name`: "Family Information", "Trial Class Interest", etc.
- `form_type`: enrolled_family | prospective_family | trial_class
- `fields`: JSONB array of form field definitions

**`franchise_form_templates`** (Franchise assignments - NEW)
- `id`: UUID
- `franchise_tenant_id`: UUID (which franchise owns this)
- `template_id`: UUID (references form_templates)
- `custom_name`: Override template name (e.g., "Formulario de Registro")
- `custom_description`: Override description
- `is_primary`: true/false (one form per franchise)
- `is_enabled`: true/false

**`form_deliveries`** (Extended)
- `franchise_tenant_id`: NEW - which franchise sent this
- `recipient_email`, `recipient_name`, `recipient_phone`
- `delivery_method`: email | sms | whatsapp
- `form_link`: Unique link for this family
- `expires_at`: Expiration time
- `delivery_status`: pending | sent | failed | bounced

**`form_responses`** (Extended)
- `franchise_tenant_id`: NEW - which franchise received this
- `delivery_id`: Which delivery this response came from
- `response_data`: JSONB of form answers
- `crm_sync_status`: pending | synced | failed

### RLS Policies

```sql
-- Franchises see only their own forms
SELECT * FROM form_deliveries
WHERE franchise_tenant_id = current_franchise_id
  OR (franchise_tenant_id IS NULL AND is_superuser)

-- Franchises see only their responses
SELECT * FROM form_responses
WHERE franchise_tenant_id = current_franchise_id
  OR (franchise_tenant_id IS NULL AND is_superuser)
```

## API Reference

### Admin Endpoints

#### Assign Form to Franchise
```bash
POST /api/admin/franchises/forms
Authorization: Peskids Admin

{
  "franchiseTenantId": "uuid",
  "templateId": "uuid",
  "customName": "Mi Formulario",
  "isPrimary": true
}

Response:
{
  "ok": true,
  "data": {
    "assignmentId": "uuid"
  }
}
```

### Franchise Endpoints

#### List Franchise Forms
```bash
GET /api/franchise/forms
Authorization: Franchise Admin
Query:
  - ?primary=true - Get only primary form
  - ?responses=true - Include form responses

Response:
{
  "ok": true,
  "data": {
    "forms": [
      {
        "id": "assignment-id",
        "templateId": "template-id",
        "name": "Mi Formulario",
        "description": "...",
        "formType": "prospective_family",
        "fields": [...],
        "isPrimary": true,
        "isEnabled": true
      }
    ],
    "responses": [  // if ?responses=true
      {
        "id": "response-id",
        "recipientEmail": "familia@example.com",
        "responseData": { "nombre": "Juan", "hijos": [...] },
        "submittedAt": "2026-07-25T10:00:00Z",
        "crmSyncStatus": "pending"
      }
    ]
  }
}
```

#### Send Form to Families
```bash
POST /api/franchise/forms/send
Authorization: Franchise Admin

{
  "formAssignmentId": "uuid",
  "templateId": "uuid",
  "recipients": [
    {
      "email": "familia@example.com",
      "name": "Familia García",
      "phone": "+573001234567"  // optional
    }
  ],
  "deliveryMethod": "email",  // or "sms", "whatsapp"
  "expiresInDays": 30
}

Response:
{
  "ok": true,
  "data": {
    "sentCount": 1,
    "failureCount": 0,
    "results": [
      {
        "success": true,
        "deliveryId": "uuid",
        "error": null
      }
    ]
  }
}
```

### Public Endpoints

#### Submit Form Response
```bash
POST /api/public/forms/submit
No authentication required

{
  "deliveryId": "uuid",  // from email link
  "templateId": "uuid",
  "responseData": {
    "full_name": "Juan García",
    "email": "juan@example.com",
    "children_names": "María, Pedro",
    "message": "Queremos clase de prueba"
  }
}

Response:
{
  "ok": true,
  "data": {
    "responseId": "uuid",
    "message": "Form submitted successfully"
  }
}
```

## Usage Flow

### Setup (Peskids Admin)

```bash
# 1. Create form template (already exists)
POST /api/admin/forms/templates
{
  "name": "Family Information",
  "form_type": "prospective_family",
  "fields": [...]
}

# 2. Assign template to franchise
POST /api/admin/franchises/forms
{
  "franchiseTenantId": "franchise-1-id",
  "templateId": "template-id",
  "customName": "Formulario de Registro",
  "isPrimary": true
}
```

### Use (Franchise Admin)

```bash
# 1. Get available forms
GET /api/franchise/forms

# 2. Send form to family
POST /api/franchise/forms/send
{
  "formAssignmentId": "assignment-id",
  "templateId": "template-id",
  "recipients": [
    {"email": "familia@example.com", "name": "García Family"}
  ],
  "deliveryMethod": "email"
}

# 3. Family receives email with link:
# https://franquicia-1.op-sly.com/forms/assignment-id?delivery=delivery-id

# 4. Family submits response
POST /api/public/forms/submit
{
  "deliveryId": "delivery-id",
  "templateId": "template-id",
  "responseData": {...}
}

# 5. View responses
GET /api/franchise/forms?responses=true
```

## Security

### Isolation
- Each franchise only sees forms they're assigned
- Each franchise only sees responses to their forms
- RLS policies enforce tenant isolation
- Public endpoints validate via delivery link (no auth needed)

### Validation
- Delivery links expire after configured days (default 30)
- Form submissions validated against template
- IP addresses logged for fraud detection

### Multi-tenant
- Queries filtered by `franchise_tenant_id`
- Form templates shared globally but assignments per-franchise
- Customization per-franchise without duplicating templates

## Future Enhancements

1. **Email/SMS/WhatsApp delivery** - Integrate SendGrid, Twilio, Whatsapp Business API
2. **GoHighLevel sync** - Sync responses to CRM for each franchise
3. **Conditional logic** - Show/hide fields based on responses
4. **Partial responses** - Save draft responses and resume later
5. **Analytics** - Response rate, completion time, drop-off points
6. **A/B testing** - Test different form variants
7. **Webhooks** - Notify franchise when response received

## Troubleshooting

### Franchise doesn't see form
1. Check `franchise_form_templates.is_enabled = true`
2. Verify `franchise_tenant_id` matches
3. Check RLS policy via: `SELECT * FROM franchise_form_templates WHERE franchise_tenant_id = X`

### Form submission fails
1. Verify `deliveryId` is valid in `form_deliveries`
2. Check delivery hasn't expired: `expires_at > now()`
3. Verify `templateId` matches

### Responses not showing
1. Check `franchise_tenant_id` in `form_responses`
2. Verify RLS policy allows read access
3. Check response was actually submitted
