---
status: test-specifications
owner: qa
date: 2026-05-08T15:00:00Z
version: 1.0
---

# E2E Test Scenarios

**End-to-end test cases covering critical user workflows.**

Location: `tests/e2e/` (ready for Playwright/Cypress implementation)

---

## Overview

| Scenario | Duration | Priority | Status |
|----------|----------|----------|--------|
| User signup → tenant creation | 3-5 min | CRITICAL | Spec ready |
| Admin dashboard access | 2-3 min | CRITICAL | Spec ready |
| Payment processing (Stripe) | 5-10 min | CRITICAL | Spec ready |
| Agent deployment workflow | 5-8 min | HIGH | Spec ready |
| Cost monitoring dashboard | 2-3 min | MEDIUM | Spec ready |

---

## 1. USER SIGNUP → TENANT CREATION

**Objective:** Verify new user can sign up and create first tenant

### Prerequisites
- Fresh browser session
- Network latency < 500ms
- Stripe test API available
- Email service enabled

### Test Steps

```gherkin
Feature: User Signup Workflow

Scenario: Complete signup and tenant creation
  Given user navigates to signup page
  When user enters email "test@example.com"
  And clicks "Create Account"
  Then email verification sent
  
  When user clicks email verification link
  And enters password "SecurePass123!"
  And confirms password
  And clicks "Complete Signup"
  Then redirected to onboarding flow
  
  When user enters tenant name "Test Corp"
  And selects plan "Starter"
  And clicks "Create Tenant"
  Then tenant created successfully
  And user redirected to dashboard
  And tenant slug "test-corp" generated

Scenario: Duplicate email rejected
  Given "john@example.com" already exists
  When user tries signup with "john@example.com"
  Then error message: "Email already registered"
  
Scenario: Weak password rejected
  Given signup form displayed
  When user enters password "123"
  Then error: "Password must be 8+ characters"
  
Scenario: Verify rate limiting
  Given rate limit: 5 signup attempts/hour per IP
  When user attempts 6 signups from same IP
  Then 6th attempt rejected with "Too many attempts"
```

### Expected Outcomes
- ✅ User created in database
- ✅ Tenant created with slug
- ✅ Onboarding email sent
- ✅ User logged in + redirected
- ✅ Initial billing set to $0 (trial)

### Assertions
```javascript
// Database
expect(await db.users.findOne({ email: 'test@example.com' })).toBeTruthy();
expect(await db.tenants.findOne({ slug: 'test-corp' })).toBeTruthy();
expect(await db.tenants.findOne({ slug: 'test-corp' }).plan).toBe('Starter');

// UI
expect(page.url()).toContain('/dashboard');
expect(await page.textContent('h1')).toContain('Welcome');
```

---

## 2. ADMIN DASHBOARD ACCESS

**Objective:** Verify admin can access restricted dashboard and view metrics

### Prerequisites
- Admin user logged in
- Supabase credentials valid
- At least 1 tenant with data

### Test Steps

```gherkin
Feature: Admin Dashboard

Scenario: Admin login and dashboard access
  Given admin navigates to admin.op-sly.com
  When admin logs in with admin credentials
  Then dashboard loaded without errors
  And displays 5 tenant cards
  And displays cost metrics
  
Scenario: View tenant details
  Given admin dashboard open
  When admin clicks on "smiletripcare" tenant card
  Then tenant details page loads
  And shows: status, API usage, cost, last activity
  And displays "Agents" list
  
Scenario: Cost metrics display
  Given admin dashboard open
  When dashboard fully loaded
  Then shows "Today's Cost" (USD)
  And shows "This Month" total
  And shows cost trend (30-day chart)
  
Scenario: User management
  Given admin dashboard open
  When admin navigates to "Settings" → "Users"
  Then shows list of admin users
  And can add/remove users
```

### Expected Outcomes
- ✅ Dashboard loads in < 3 seconds
- ✅ All metrics display correct values
- ✅ Charts render without errors
- ✅ Tenant filtering works
- ✅ API calls return 200 OK

### Assertions
```javascript
// Performance
expect(page.navigation.performance.loadEventEnd - page.navigation.performance.navigationStart).toBeLessThan(3000);

// UI
expect(await page.locator('[data-testid="tenant-card"]').count()).toBe(5);
expect(await page.locator('[data-testid="cost-metric"]').isVisible()).toBeTruthy();

// Data
const costs = await page.locator('[data-testid="today-cost"]').textContent();
expect(costs).toMatch(/\$\d+\.\d{2}/);
```

---

## 3. PAYMENT PROCESSING

**Objective:** Verify Stripe payment flow and billing

### Prerequisites
- Stripe test mode enabled
- Test payment method: "4242 4242 4242 4242"
- Tenant with "Starter" plan

### Test Steps

```gherkin
Feature: Payment Processing

Scenario: Upgrade from Starter to Pro
  Given user on Settings → Billing
  And currently on "Starter" plan ($29/month)
  When user clicks "Upgrade to Pro"
  Then Stripe checkout modal opens
  
  When user enters test card "4242 4242 4242 4242"
  And enters expiry "12/25"
  And enters CVC "123"
  And clicks "Pay $99/month"
  Then payment processes successfully
  And user returns to dashboard
  And plan updated to "Pro"
  And next billing date set
  
Scenario: Failed payment handling
  Given Stripe checkout open
  When user enters declined card "4000 0000 0000 0002"
  And completes payment
  Then error: "Your card was declined"
  And user stays on checkout
  And plan NOT upgraded

Scenario: Webhook processing
  Given payment completed on Stripe
  When Stripe sends webhook_payment_intent.succeeded
  Then backend:
    - Updates tenant.plan to "Pro"
    - Creates invoice record
    - Sends confirmation email
    - Updates dashboard
```

### Expected Outcomes
- ✅ Stripe session created
- ✅ Payment processed
- ✅ Invoice generated
- ✅ Tenant plan updated
- ✅ Email sent
- ✅ Failed payments handled gracefully

### Assertions
```javascript
// Stripe
expect(await page.locator('[data-stripe-js]').count()).toBeGreaterThan(0);

// Post-payment
await waitForNavigation();
expect(page.url()).toContain('/dashboard');
expect(await db.tenants.findOne({ slug: 'test-corp' }).plan).toBe('Pro');

// Invoice
const invoice = await db.invoices.findOne({ tenant_id: 'test-corp', status: 'paid' });
expect(invoice).toBeTruthy();
expect(invoice.amount_usd).toBe(99);
```

---

## 4. AGENT DEPLOYMENT WORKFLOW

**Objective:** Verify user can create and deploy an agent

### Prerequisites
- User logged in + tenant created
- Agent templates available
- Orchestrator service running

### Test Steps

```gherkin
Feature: Agent Deployment

Scenario: Create new agent
  Given user on Agents page
  When user clicks "+ New Agent"
  Then agent creation modal opens
  
  When user:
    - Enters name "Support Bot"
    - Selects template "Customer Support"
    - Configures:
      - Model: GPT-4
      - Instructions: "Help customers..."
      - Tools: [Email, Slack, Zendesk]
  And clicks "Deploy"
  Then:
    - Agent created in database
    - Job queued in BullMQ
    - UI shows "Deploying..."
    - After 30s: Agent status → "Running"
    
Scenario: Agent testing
  Given agent deployed
  When user clicks "Test Agent"
  And enters test query "What's your name?"
  Then agent responds in < 5s
  And response appears in chat
  
Scenario: Agent monitoring
  Given agent running
  When user views "Metrics" tab
  Then shows:
    - Uptime: 100%
    - Requests: 0
    - Errors: 0
    - Last activity: Now
```

### Expected Outcomes
- ✅ Agent created in database
- ✅ Orchestrator job queued
- ✅ Agent transitions to "Running"
- ✅ Test query responds
- ✅ Metrics tracked

### Assertions
```javascript
// Database
const agent = await db.agents.findOne({ name: 'Support Bot' });
expect(agent).toBeTruthy();
expect(agent.status).toBe('running');

// Job queue
const job = await queue.getJob(agent.orchestration_job_id);
expect(job.progress()).toBeGreaterThan(0);

// API response
const response = await page.evaluate(() => {
  return fetch('/api/agents/test', {
    method: 'POST',
    body: JSON.stringify({ agent_id: 'xxx', query: 'test' })
  }).then(r => r.json());
});
expect(response.response).toBeTruthy();
expect(response.duration_ms).toBeLessThan(5000);
```

---

## 5. COST MONITORING DASHBOARD

**Objective:** Verify cost tracking dashboard displays correctly

### Prerequisites
- Data in usage_events table
- Admin access
- Last 30 days of events

### Test Steps

```gherkin
Feature: Cost Dashboard

Scenario: View cost metrics
  Given user on /dashboard
  When dashboard loads
  Then displays:
    - "Today's Cost" with current date
    - "This Month" cumulative
    - 30-day trend chart
    - Per-operation breakdown
    
Scenario: Filter by date range
  Given cost dashboard open
  When user selects date range "Last 7 days"
  And clicks "Apply"
  Then:
    - Chart updates
    - Metrics recalculate
    - Shows only 7-day data
    - Total <= month total
    
Scenario: Export cost report
  Given cost dashboard open
  When user clicks "Export as CSV"
  Then:
    - File downloaded
    - Contains headers: date, operation, cost, count
    - All rows present
    - Total matches dashboard
```

### Expected Outcomes
- ✅ Dashboard loads in < 2 seconds
- ✅ Metrics calculate correctly
- ✅ Charts render without errors
- ✅ Export works
- ✅ Data consistent

### Assertions
```javascript
// Performance
expect(page.performance.navigation.loadEventEnd).toBeLessThan(2000);

// Metrics
const todayCost = await page.locator('[data-testid="today-cost"]').textContent();
expect(todayCost).toMatch(/\$\d+\.\d{2}/);

// Chart
const canvas = await page.locator('canvas').isVisible();
expect(canvas).toBeTruthy();

// Export
const downloadPromise = page.waitForEvent('download');
await page.click('[data-testid="export-csv"]');
const download = await downloadPromise;
expect(download.suggestedFilename()).toMatch(/cost-report-\d{4}-\d{2}-\d{2}\.csv/);
```

---

## Test Implementation Guide

### Playwright Setup

```javascript
// tests/e2e/signup.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Signup Workflow', () => {
  test('complete signup and tenant creation', async ({ page }) => {
    // Navigate to signup
    await page.goto('/signup');
    
    // Fill form
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('[data-testid="signup-button"]');
    
    // Verify email sent
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // Get verification link from email
    const verificationLink = await getEmailLink('test@example.com');
    await page.goto(verificationLink);
    
    // Complete setup
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="tenant_name"]', 'Test Corp');
    await page.selectOption('[name="plan"]', 'starter');
    await page.click('[data-testid="create-tenant"]');
    
    // Assert
    await expect(page).toHaveURL(/.*dashboard/);
    expect(await db.tenants.findOne({ slug: 'test-corp' })).toBeTruthy();
  });
});
```

### Running Tests

```bash
# Install
npm install --save-dev @playwright/test

# Run all E2E tests
npx playwright test

# Run specific test
npx playwright test tests/e2e/signup.spec.ts

# Run with UI
npx playwright test --ui

# Generate HTML report
npx playwright show-report
```

### CI/CD Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Data Requirements

### Fixtures (Seeding)

```javascript
// tests/fixtures/seed.ts
export async function seedTestData() {
  // Create test users
  await db.users.create({
    email: 'test@example.com',
    password_hash: bcrypt('test123'),
    created_at: new Date(),
  });
  
  // Create test tenants
  await db.tenants.create({
    slug: 'test-corp',
    name: 'Test Corporation',
    plan: 'starter',
    created_at: new Date(),
  });
  
  // Create test usage events
  for (let i = 0; i < 10; i++) {
    await db.usage_events.create({
      tenant_id: 'test-corp',
      operation: 'llm_inference',
      cost_usd: Math.random() * 10,
      created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
    });
  }
}
```

---

## Metrics & Success Criteria

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Test coverage | 70%+ | N/A | To implement |
| Test execution | < 5 min | N/A | To optimize |
| Flakiness | < 1% | N/A | To monitor |
| Pass rate | 100% | N/A | To achieve |

---

## Timeline

- **Phase 3:** Implement tests 1-2 (signup, admin) — 2 hours
- **Phase 3+:** Complete tests 3-5 (payment, agent, cost) — 1-2 hours
- **Sprint 2:** Add additional scenarios + edge cases — 3-5 hours

---

**Status:** ✅ Specifications complete, ready for implementation  
**Owner:** @qa + @eng  
**Priority:** HIGH (critical workflows need coverage)  
**Effort:** 4-6 hours implementation  
**Tools:** Playwright or Cypress recommended
