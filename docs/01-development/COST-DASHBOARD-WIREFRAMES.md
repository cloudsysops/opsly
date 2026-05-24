---
status: wireframes
owner: design + frontend
date: 2026-05-08T15:30:00Z
version: 1.0
---

# Cost Monitoring Dashboard — Wireframes & Design Specifications

**Visual specifications and component breakdown for cost monitoring UI**

---

## Dashboard Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  OPSLY ADMIN                              [User] [Notifications]   │
│  ═════════════════════════════════════════════════════════════════ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 📊 COST DASHBOARD                    [Filters] [Export] [?] │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Date Range ─────────────────────────────────────────────────┐  │
│  │  [Last 7 Days ▼] [Last 30 Days] [Custom Range...]           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ KPI Cards ───────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │  │ Today's Cost │  │ This Month   │  │ Avg/Day      │       │  │
│  │  │   $48.32     │  │   $1,052.18  │  │   $35.07     │       │  │
│  │  │  ↑ 5% vs yd  │  │  ↓ 2% vs prev│  │  Forecast:   │       │  │
│  │  │              │  │              │  │   $1,050     │       │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Cost Trend (30-Day) ─────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  $50 │                        ╱╲        ╱╲                   │  │
│  │      │      ╱╲     ╱╲   ╱╲ ╱   ╲╱  ╱╲╱   ╲╱╲╱              │  │
│  │  $40 │ ╱╲╱   ╲╱╲   │ ╲╱    ╲╱        │                       │  │
│  │      │ │ │    │ │   │                 │                       │  │
│  │  $30 │─┼─┼────┼─┼───┼─────────────────┼──────────────────── │  │
│  │      │ │ │    │ │   │                 │                       │  │
│  │      │ May 1  May 8  May 15    May 22  May 29               │  │
│  │      │ ✓ Today: $48.32                                        │  │
│  │      │ → Trend: Stable (0% change)                            │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Cost Breakdown (by Operation) ───────────────────────────────┐  │
│  │                                                               │  │
│  │  Operation            Cost      % of Total   Requests        │  │
│  │  ─────────────────────────────────────────────────────────   │  │
│  │  🤖 LLM Inference     $852.00      81%        2,450          │  │
│  │     ├─ Claude         $520.00      49%        1,200          │  │
│  │     └─ GPT-4          $332.00      32%        1,250          │  │
│  │                                                               │  │
│  │  🔍 Search/Embeddings $120.00      11%        850            │  │
│  │  💾 Storage           $45.00        4%        -               │  │
│  │  📊 API Calls         $35.18        4%        12,400         │  │
│  │                                                               │  │
│  │  TOTAL                $1,052.18    100%       15,700         │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Per-Tenant Cost Distribution ────────────────────────────────┐  │
│  │                                                               │  │
│  │  Tenant                     Cost This Month  Status  Forecast│  │
│  │  ──────────────────────────────────────────────────────────  │  │
│  │  1. smiletripcare           $285.50          ✅      $320     │  │
│  │     ├─ Agents: 3, API calls: 4,200, LLM: 120 requests       │  │
│  │                                                               │  │
│  │  2. localrank               $256.00          ✅      $280     │  │
│  │     ├─ Agents: 2, API calls: 3,100, LLM: 85 requests        │  │
│  │                                                               │  │
│  │  3. peskids                 $198.30          ✅      $210     │  │
│  │     ├─ Agents: 2, API calls: 2,800, LLM: 75 requests        │  │
│  │                                                               │  │
│  │  4. jkboterolabs            $156.00          ⚠️      $180     │  │
│  │     ├─ Agents: 1, API calls: 2,100, LLM: 40 requests        │  │
│  │     ├─ Alert: LLM cost trending up 8%                        │  │
│  │                                                               │  │
│  │  5. intcloudsysops          $156.38          ✅      $160     │  │
│  │     ├─ Agents: 5, API calls: 3,500, LLM: 35 requests        │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Alerts & Recommendations ────────────────────────────────────┐  │
│  │                                                               │  │
│  │  ⚠️  jkboterolabs: LLM cost trend up 8%                      │  │
│  │      Recommendation: Enable token limits, review queries      │  │
│  │                                                               │  │
│  │  ℹ️  All costs within forecast ✓                            │  │
│  │                                                               │  │
│  │  💡 Opportunity: Cache 200+ identical searches → -$50/month   │  │
│  │      (Implementation: Enable Redis caching, TTL: 24h)         │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. KPI Cards

**Purpose:** Quick glance at cost metrics

```
┌─────────────────────────┐
│  Label (gray, small)    │
│  ────────────────────── │
│  $1,234.56 (large bold) │
│                         │
│  ↑ 5% vs yesterday       │ ← Trend indicator (color: red/green)
│  Forecast: $1,200 →      │ ← AI forecast
└─────────────────────────┘
```

**Design specs:**
- Width: 25% of container (responsive)
- Background: Light gray or white
- Border: 1px light border
- Corner: Rounded (8px)
- Font sizes: Label 12px, Amount 28px, Trend 11px
- Color codes:
  - Green ↑: Cost down vs period
  - Red ↓: Cost up vs period
  - Gray: Neutral/forecast

### 2. Cost Trend Chart

**Type:** Line chart (Chart.js or Recharts)

```
Y-axis: Cost (USD)
X-axis: Date (7/14/30-day options)
Lines:
  ├─ Actual spending (solid blue)
  ├─ Forecast (dashed green)
  └─ Budget limit (dashed red, if applicable)

Interaction:
  • Hover point: Show {date, amount, operators}
  • Click legend: Toggle line visibility
```

**Responsive:**
- Desktop: 100% width
- Mobile: Scrollable

### 3. Breakdown Table

**Purpose:** Detailed per-operation cost breakdown

| Column | Width | Content |
|--------|-------|---------|
| Operation | 40% | Icon + name |
| Cost | 15% | USD amount |
| % of Total | 15% | Percentage |
| Requests | 15% | Count |
| Trend | 15% | ↑/↓ indicator |

**Features:**
- Sortable by column
- Expandable rows (drilldown)
- Color coding: High cost = Red warning
- Inline charts (bar or spark line)

### 4. Per-Tenant Table

**Purpose:** Cost tracking by tenant (SaaS billing view)

| Column | Width | Content |
|--------|-------|---------|
| Tenant | 20% | Name + logo |
| This Month | 15% | Current amount |
| Status | 10% | ✅/⚠️/🔴 |
| Forecast | 15% | Projected EOD |
| Details | 40% | Agent count, top operation |

**Interaction:**
- Click row: Expand tenant details
- Click tenant name: Go to tenant settings
- Actions column: [Edit limits] [View logs]

### 5. Alerts & Recommendations

**Purpose:** Actionable insights

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Alert: High cost growth (jkboterolabs)        │
│      Cost up 15% week-over-week                     │
│      [View details] [Dismiss]                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  💡 Opportunity: Enable caching (would save $50/mo)  │
│      Estimated implementation: 1 hour               │
│      [Enable now] [Learn more]                      │
└─────────────────────────────────────────────────────┘
```

**Alert types:**
- 🔴 Critical (exceeds budget / threshold)
- ⚠️ Warning (trending bad)
- ℹ️ Info (forecast / normal)
- 💡 Opportunity (cost savings)

---

## Implementation Plan

### Phase 1: MVP (Week 1)
- [x] KPI Cards (hard-coded data)
- [x] 30-day trend chart
- [x] Breakdown table

### Phase 2: Enhanced (Week 2)
- [ ] Per-tenant table
- [ ] Alerts & recommendations
- [ ] Export to CSV

### Phase 3: Advanced (Week 3)
- [ ] Real-time updates (WebSocket)
- [ ] Configurable budgets
- [ ] Cost prediction (ML)
- [ ] Custom date ranges

---

## Technology Stack

**Frontend:**
- Framework: React (existing)
- Charts: Recharts or Chart.js
- Styling: Tailwind CSS or CSS modules
- State: React Context or Zustand

**Backend:**
- API endpoint: `GET /api/admin/costs`
- Query: `SELECT date, operation, SUM(cost_usd) FROM usage_events GROUP BY date, operation`
- Caching: Redis (24h TTL)

**Database:**
- Table: `usage_events`
- Indexes: `(tenant_id, created_at)`, `(operation, created_at)`
- Aggregations: Pre-calculated hourly/daily summaries

---

## Color Palette

```
Primary:
  ├─ Blue: #0070F3 (primary action)
  └─ Green: #00D084 (positive)

Secondary:
  ├─ Red: #FF4444 (warning/error)
  ├─ Orange: #FFA500 (info)
  └─ Gray: #E5E5E5 (borders)

Text:
  ├─ Primary: #1a1a1a
  ├─ Secondary: #666666
  └─ Tertiary: #999999
```

---

## Accessibility

- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Screen reader friendly (ARIA labels)
- [ ] Color not only indicator (icons + labels)
- [ ] Sufficient contrast ratio (4.5:1 minimum)

---

## Performance Targets

- Dashboard loads: < 2 seconds
- Chart renders: < 500ms
- Data refresh: < 1 second
- Export generation: < 5 seconds

---

## Future Enhancements

1. **ML-based forecasting:** Predict next month's cost
2. **Budget alerts:** Email/Slack notifications
3. **Comparative analysis:** vs. historical periods
4. **Cost attribution:** By user, by feature, by project
5. **Optimization suggestions:** Automated cost reduction tips

---

**Status:** ✅ Wireframes complete, implementation ready  
**Owner:** @frontend + @design  
**Effort:** 20-30 hours (MVP phase)  
**Priority:** MEDIUM (nice to have, improves insights)

---

## Enlaces relacionados

- [[01-development/README|01-development]]
- [[brain/README|Brain Central]]
