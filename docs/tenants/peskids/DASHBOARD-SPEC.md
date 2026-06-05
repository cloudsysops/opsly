---
status: draft
owner: operations
last_review: 2026-05-24
type: tenant
tags:
  - opsly/tenant
---

# Peskids Admin Dashboard Specification

**Purpose:** Single-screen view of all active leads, students, and feedback. Admin can quickly see what needs attention and take action (follow up, respond, etc.).

**Executive KPI strip:** Leads, clases prueba, inscripciones, alumnos activos, conversión y fuente de captación.

**Target User:** Admin staff, owner  
**Access:** Authenticated admin only (RLS on Supabase)  
**Load time:** <3 seconds  
**Refresh:** Real-time (WebSocket) or 5-second poll  
**Device:** Desktop primary, mobile secondary (responsive)

---

## Dashboard Layout

**Header:**
- "Peskids Admin" title
- "Last updated: 2 min ago" timestamp
- Settings icon (future: notifications, preferences)
- Logout button

**Filter Bar:**
- Date range: "This Week" | "This Month" | "Custom"
- Status filter: "All" | "New" | "Follow-up Needed" | "Completed"
- Search box (search by name across all leads/students)

**Card Grid (5 cards minimum, 2 columns on desktop, 1 on mobile):**

### Card 1: New Leads This Week

**Purpose:** How many fresh opportunities came in this week?

**Data Source:** 
```sql
SELECT COUNT(*) as count, name, email, phone, grade_interested, created_at 
FROM leads 
WHERE created_at >= DATE_TRUNC('week', NOW())
ORDER BY created_at DESC
LIMIT 20
```

**Display:**
- Big number (count) centered, 24pt font
- "New Leads This Week"
- Small list below (5 items):
  - Row: Name | Email | Phone | Grade | [Action: View/Follow-up]
- "Load more" link if > 5 items

**Empty State:**
- "No new leads this week" (gray text)
- "Promote landing page to get leads" (hint)

**Actions:**
- Click name → open lead detail view
- "Follow-up" button → create followup task
- Right-click → open context menu (email, add to list, etc.)

**Future Automation:**
- Auto-fetch from integrated CRM
- Duplicate detection (if same email appears twice)
- Score leads by quality (future)

**Data Freshness:** Real-time (webhook on form submit)

---

### Card 2: Active Students

**Purpose:** How many children are currently enrolled?

**Data Source:**
```sql
SELECT COUNT(*) as count, grade, COUNT(*) as grade_count
FROM students 
WHERE status = 'active'
GROUP BY grade
ORDER BY grade ASC
```

**Display:**
- Big number (total count) centered, 24pt font
- "Active Students"
- Breakdown by grade below:
  - "K–5: 8 students"
  - "6–8: 5 students"
  - "9–12: 3 students"
- Pie chart (optional, future)

**Empty State:**
- "No active students"
- "Add students from the Students page"

**Actions:**
- Click grade → filter leads/feedback by that grade
- "Manage students" link → open student management page

**Future Automation:**
- Sync from payment system (enrollment)
- Auto-archive after 1 month of no activity
- Show retention rate trend

---

### Card 3: Parent Feedback (Recent)

**Purpose:** What are parents saying? Any issues to address?

**Data Source:**
```sql
SELECT child_name, satisfaction, suggestion, created_at, id
FROM feedback 
ORDER BY created_at DESC 
LIMIT 10
```

**Display:**
- "Parent Feedback"
- 5 recent feedback items (scrollable):
  - Row: Child Name | ★★★☆☆ (1-5 stars) | Suggestion snippet | [View Full]
  - Color code: ★★★★★ = green, ★★★ = yellow, ★★☆☆☆ = red
- "View all feedback" link

**Empty State:**
- "No feedback yet"
- "Send feedback form to parents to get started"

**Actions:**
- Hover on row → show full suggestion
- Click row → open feedback detail (with reply option)
- Red items (satisfaction < 3) → alert badge

**Future Automation:**
- Sentiment detection (auto-tag as "positive," "neutral," "negative")
- Keyword extraction ("math," "social," "behavior")
- Trend analysis (average satisfaction over time)

---

### Card 4: Pending Follow-ups

**Purpose:** What follow-ups are waiting? What's overdue?

**Data Source:**
```sql
SELECT id, contact_name, contact_type, due_date, status, created_at
FROM followups 
WHERE status = 'pending'
ORDER BY due_date ASC
```

**Display:**
- "Pending Follow-ups"
- Count (big number) + red badge if overdue
- List (5 items):
  - Row: Name | Type (Lead/Student/Parent) | Due Date | [Complete/Reschedule]
  - Overdue items: red background
- "View all" link

**Empty State:**
- "All caught up!"
- No follow-ups pending

**Actions:**
- Click row → open follow-up detail
- "Complete" button → mark as done, show next steps
- "Reschedule" → change due date
- Bulk actions: "Complete all," "Reschedule by 1 week"

**Future Automation:**
- Smart reminders ("You have 3 follow-ups due today")
- Suggested next follow-up (e.g., "Follow-up with Maria in 2 weeks")
- Auto-archive completed items

---

### Card 5: This Week's Trend

**Purpose:** Are we growing? What's the velocity?

**Data Source:**
```sql
SELECT DATE(created_at) as date, COUNT(*) as count
FROM leads 
WHERE created_at >= DATE_TRUNC('week', NOW())
GROUP BY DATE(created_at)
ORDER BY date ASC
```

**Display:**
- "This Week's Trend"
- Line chart (simple, 7-day view):
  - X-axis: Mon, Tue, Wed, Thu, Fri, Sat, Sun
  - Y-axis: Number of enrollments
  - Line color: blue
- Small stats below:
  - "Total: 12 leads"
  - "Avg per day: 1.7"
  - "Trend: +20% vs last week" (if applicable)

**Empty State:**
- "No data yet. Check back later."

**Actions:**
- Hover on point → show exact count
- Click chart → zoom/filter by date range
- "Download data" → CSV export

**Future Automation:**
- Predictive trend ("At this rate, you'll have X leads by month end")
- Anomaly detection ("Unusual spike on Thursday")
- Comparison to historical avg

---

## Additional Features

### Settings/Preferences (Future)
- Dashboard color theme
- Card order (customizable drag-and-drop)
- Card visibility (show/hide cards)
- Notification preferences
- Export schedule (weekly report)

### Export/Reporting (MVP)
- "Export as CSV" button on each card
- "Download dashboard as PDF" (screenshot)
- Manual weekly summary email template

### Mobile Layout
- Single column (no side-by-side cards)
- Stacked layout, full width
- Collapsible sections
- Touch-friendly buttons (larger tap targets)
- Bottom nav with: Home, Feedback, Follow-ups, Settings

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation (Tab through cards)
- Color not sole indicator (use text + color)
- Labels on all inputs
- Alt text on charts

---

## Data Freshness & Performance

**Real-time Updates:**
- New leads: instant (webhook from form)
- Feedback: instant (webhook from form)
- Follow-ups: on-click refresh (or 5s poll)
- Trend chart: 5-minute refresh (or manual click)

**Query Performance:**
- All queries indexed on `created_at` and `status`
- Aggregations limited to 1-month window
- Charts limited to 7-day view
- Pagination: load 5 items, "load more" lazy-load

**Database Indexes:**
```sql
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX idx_followups_status_due ON followups(status, due_date);
```

---

## Security & Permissions

**Access Control:**
- Dashboard only visible to authenticated admin
- RLS on Supabase:
  - Leads: own tenant only
  - Feedback: own tenant only
  - Follow-ups: own tenant only
- No PII in URLs or query params

**Data Privacy:**
- Phone numbers masked in list view (show last 4 digits only)
- Feedback suggestions: full text only in detail view (snippets truncated in card)
- No data exported to third-party analytics

---

## Testing Checklist

- [ ] All cards load in <3s
- [ ] Real-time updates work (add a lead, see it appear instantly)
- [ ] Filters work (date range, status)
- [ ] Search works (type a name, see matching leads)
- [ ] Mobile responsive (test on iPhone SE, iPad)
- [ ] Export CSV works (data matches dashboard)
- [ ] Permission/RLS enforced (can't see other tenant's data)
- [ ] Empty states display correctly
- [ ] Actions (complete, reschedule, etc.) work
- [ ] Accessibility: Tab through all elements
- [ ] Performance: Queries run in <200ms

---

## Iteration Plan

**MVP (Sprint 02):** 5 cards above  
**Sprint 03:** Add settings/preferences, custom card order  
**Sprint 04:** Add predictive trends, anomaly detection  
**Later:** Advanced filters, custom metrics, integration with external dashboards

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
