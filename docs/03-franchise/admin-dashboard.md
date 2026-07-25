# Franchise Admin Dashboard

Complete management system for Peskids to administer, onboard, and monitor franchises.

## Overview

The Franchise Admin Dashboard allows Peskids admin team to:
- List and search franchises by status, tier, location
- Approve/activate/suspend franchises
- View franchise KPIs and metrics
- Assign features and capabilities
- Track onboarding progress
- Manage franchise settings

## Dashboard Screens

### 1. Franchise List & Management

**URL**: `/admin/franchises`

**Features**:
- Table view with franchises
- Filters: status (provisioning, under_review, approved, active, suspended), tier (startup, business, enterprise)
- Sortable columns: name, city, status, revenue, created_at
- Bulk actions: approve, activate, suspend
- Search by name/email/city

**Columns**:
```
Name | City | Tier | Status | Revenue (MoM) | Students | Created | Actions
---
LlanoGrande | Bogotá | enterprise | active | $45,230 | 156 | Jul 20 | [View] [Edit] [Menu]
FranquiciaX | Medellín | business | under_review | $8,900 | 45 | Jul 18 | [Approve] [Suspend]
```

**API Endpoint**:
```bash
GET /api/admin/franchises?status=active&tier=business&offset=0&limit=50
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "franchises": [
      {
        "id": "uuid",
        "tenantSlug": "franquicia-1",
        "name": "Franquicia 1",
        "city": "Bogotá",
        "country": "CO",
        "tier": "business",
        "status": "active",
        "studentCount": 125,
        "monthlyRevenue": 25000,
        "createdAt": "2026-07-20T..."
      }
    ],
    "total": 24,
    "offset": 0,
    "limit": 50
  }
}
```

### 2. Franchise Detail View

**URL**: `/admin/franchises/:franchiseId`

Shows complete franchise profile:

**Overview Section**:
- Franchise name, contact info, location (map)
- Current tier and status
- Approval date, activation date
- Admin notes

**Metrics Section**:
- Students enrolled
- Monthly revenue
- Churn rate
- NPS score
- Forms sent/completed

**Settings Section**:
- Change tier
- Update contact info
- Change status (with confirmation)
- Assign features
- View assigned forms

**API Endpoint**:
```bash
GET /api/admin/franchises/:franchiseId
```

### 3. Onboarding Workflow

**Status Flow**:
```
Provisioning → Under Review → Approved → Active
                                ↓
                            Suspended (optional)
```

**Admin Actions**:

1. **Review Status**
   - View franchise details
   - Check KYC documents (future)
   - Review business plan

2. **Approve**
   ```bash
   PATCH /api/admin/franchises
   {
     "franchiseTenantId": "uuid",
     "status": "approved",
     "notes": "KYC verified, ready for activation"
   }
   ```

3. **Activate**
   ```bash
   PATCH /api/admin/franchises
   {
     "franchiseTenantId": "uuid",
     "status": "active"
   }
   ```
   This provisions:
   - Creates admin user for franchise
   - Sends credentials email
   - Enables dashboards
   - Activates payment processing

4. **Suspend** (if needed)
   ```bash
   PATCH /api/admin/franchises
   {
     "franchiseTenantId": "uuid",
     "status": "suspended",
     "notes": "Payment overdue - suspended 2026-07-25"
   }
   ```

### 4. Analytics & Reports

**KPI Dashboard**:
- Total franchises (by status)
- Revenue consolidation (Peskids share)
- Student metrics (total, by franchise, by tier)
- Form submissions
- Support tickets
- Training completions

**Trends**:
- Monthly revenue growth
- New franchises onboarded
- Churn trends by franchise

## Features by Tier

### Startup ($99/month)
- Max 50 students
- Email support only (Tier 1)
- No API access
- No custom domain
- Basic reports

### Business ($499/month)
- Max 200 students
- Priority support (Tier 2)
- API access enabled
- Custom domain support
- Advanced reports

### Enterprise ($1,999/month)
- Unlimited students
- Dedicated support (Tier 3)
- Full API access
- Custom domain + white-label
- All reports + custom analytics

## User Selection Flow

### Public Franchise Selector

**URL**: `/franchises/nearby` or `/franchises/select`

**Features**:
1. **Location Permission**
   - Ask user for geolocation
   - Or manual location input (city/address)

2. **Map View**
   - Show all active franchises on map
   - Color by tier (startup=blue, business=green, enterprise=gold)
   - Cluster nearby franchises

3. **List View**
   - Show franchises sorted by distance
   - Display: Name, City, Distance (km), Tier
   - "Distance to Franquicia 1: 3.5 km away"

4. **Selection**
   - Click franchise → Visit dashboard
   - Creates temporary session
   - Can switch franchises anytime

**API Endpoint**:
```bash
GET /api/public/franchises/nearby?latitude=4.7110&longitude=-74.0721&radiusKm=50
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "franchises": [
      {
        "id": "uuid",
        "name": "Franquicia Bogotá Centro",
        "city": "Bogotá",
        "country": "CO",
        "phone": "+573001234567",
        "tier": "business",
        "distanceKm": 2.3,
        "latitude": 4.7110,
        "longitude": -74.0721
      },
      {
        "id": "uuid",
        "name": "Franquicia Bogotá Norte",
        "city": "Bogotá",
        "country": "CO",
        "phone": "+573009876543",
        "tier": "startup",
        "distanceKm": 8.5,
        "latitude": 4.7432,
        "longitude": -74.0604
      }
    ],
    "searchRadius": 50,
    "userLocation": {
      "latitude": 4.7110,
      "longitude": -74.0721
    }
  }
}
```

### Franchise Session Management

When user selects a franchise:
1. Store `selectedFranchiseTenantId` in session/localStorage
2. Route all subsequent requests to that franchise
3. Show "Currently viewing: Franquicia Bogotá" in header
4. Provide "Change Franchise" button

**Header Example**:
```
🏢 Peskids
  Currently viewing: Franquicia Bogotá Centro (2.3 km away)
  [Change Franchise] [My Franchises] [Menu]
```

## Database Schema

### Franchise Table Extensions

```sql
-- platform.tenants extended fields
ALTER TABLE platform.tenants ADD COLUMN IF NOT EXISTS (
  latitude DECIMAL(10,8),           -- Geolocation
  longitude DECIMAL(11,8),
  admin_notes TEXT,                 -- For internal notes
  approval_date TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  tier VARCHAR(20),                 -- startup, business, enterprise
  franchise_type VARCHAR(20),       -- parent, child, independent
  approval_status VARCHAR(20),      -- provisioning, under_review, approved, active, suspended
  contact_phone VARCHAR(20)
);

CREATE INDEX idx_tenants_franchise_type ON platform.tenants(franchise_type);
CREATE INDEX idx_tenants_status ON platform.tenants(approval_status);
CREATE INDEX idx_tenants_location ON platform.tenants(latitude, longitude);
```

### KPI Tracking

```sql
-- platform.franchise_kpis
CREATE TABLE IF NOT EXISTS platform.franchise_kpis (
  id UUID PRIMARY KEY,
  franchise_tenant_id UUID NOT NULL,
  reporting_date DATE,
  
  -- Metrics
  student_count INTEGER,
  monthly_revenue_cents INTEGER,
  churn_rate DECIMAL(5,2),
  nps_score DECIMAL(3,1),
  forms_sent INTEGER,
  forms_completed INTEGER,
  support_tickets INTEGER,
  
  created_at TIMESTAMPTZ
);

CREATE INDEX idx_franchise_kpis_date ON platform.franchise_kpis(franchise_tenant_id, reporting_date DESC);
```

## UI Components Needed

1. **FranchiseSelector**
   - Geolocation + map view
   - List with distances
   - Selection flow

2. **FranchiseAdminTable**
   - Sortable, filterable
   - Status badges
   - Bulk actions
   - Search

3. **FranchiseDetailPanel**
   - Overview, metrics, settings
   - Status change buttons
   - Notes editor

4. **OnboardingChecklist**
   - Step-by-step guide
   - Progress indicator
   - Action buttons

5. **FranchiseMetrics**
   - KPI cards
   - Charts (revenue, students, churn)
   - Trend indicators

## API Summary

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/admin/franchises` | GET | List franchises | Admin |
| `/api/admin/franchises` | PATCH | Update franchise status | Admin |
| `/api/admin/franchises/:id` | GET | Franchise details | Admin |
| `/api/public/franchises/nearby` | GET | Find nearby franchises | Public |

## Next Steps

1. Create React components for admin dashboard
2. Implement map visualization (Mapbox/Google Maps)
3. Add KPI tracking and reporting
4. Create onboarding email sequences
5. Add document upload (KYC)
6. Implement franchise analytics
