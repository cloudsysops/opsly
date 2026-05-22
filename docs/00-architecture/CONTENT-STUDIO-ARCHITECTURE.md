# Opsly Content Studio — Phase 2 Architecture

## Vision
Tenants + Opsly generate educational, brand-building content from real operational progress without manual work, without violating platform rules, without exposing secrets.

**Two publishing modes:**
- **MVP (Phase 2.1):** Copy/paste kit for human approval + manual posting
- **Pro (Phase 2.2+):** Official API publishing only

## Content Sources (Tenant Runtime Events)

```
Session Created → Story: "Shipped new task automation"
Worker Online → Story: "Local team is live"
Deployment Success → Story: "Version pushed to production"
Approval Completed → Story: "Security cleared"
Migration Finished → Story: "Infrastructure upgraded"
Session Resumed → Story: "Recovered from outage in 2min"
Branch Merged → Story: "Feature shipped"
Test Suite Passed → Story: "100% coverage achieved"
Security Scan Clean → Story: "Zero vulns detected"
```

## Data Model

### TenantContentProfile
```typescript
{
  tenant_slug: string
  brand_name: string
  brand_color: string
  tone_of_voice: 'technical' | 'friendly' | 'corporate' | 'casual'
  language: 'es' | 'en' | 'pt' | 'fr'
  avatar_style: 'minimal' | 'geometric' | 'illustrated' | 'photo'
  posting_schedule: { day_of_week: number; hour: number }[]
  platforms_connected: SocialConnection[]
  approval_policy: 'instant' | 'daily_digest' | 'per_post'
  content_privacy: {
    hide_team_names: boolean
    hide_metrics: boolean
    hide_infrastructure: boolean
    show_only_wins: boolean
  }
}
```

### ContentEvent (from runtime)
```typescript
{
  id: string
  tenant_slug: string
  event_type: 'session_created' | 'deployment' | 'approval' | 'merge' | 'milestone'
  timestamp: ISO8601
  context: {
    session_id?: string
    branch?: string
    metric?: { label: string; value: number | string }
    duration?: number
    workers_online?: number
  }
  confidentiality: 'public' | 'internal' | 'secret'
}
```

### ContentDraft
```typescript
{
  id: string
  tenant_slug: string
  event_id: string
  title: string
  story_hook: string
  captions: { platform: string; text: string; hashtags: string[] }[]
  image_prompt: string
  reel_script?: { scene: string; copy: string; duration_sec: number }[]
  call_to_action: string
  compliance_flags: string[]
  state: 'draft' | 'pending_approval' | 'approved' | 'ready_to_copy' | 'scheduled' | 'published'
  created_at: ISO8601
  approved_at?: ISO8601
  approved_by?: string
  copy_paste_kit: {
    instagram_caption: string
    facebook_caption: string
    linkedin_caption: string
    x_caption: string
    tiktok_script: string
    youtube_shorts_script: string
    image_url?: string
  }
}
```

## Modules

### 1. ContentEventSelector
- Listens to runtime events (BullMQ or webhook)
- Filters by confidentiality + tenant policy
- Enqueues for content generation

### 2. RuntimeToStoryMapper
- Converts event → narrative hook
- Example: `{ event_type: 'deployment', duration: 120 }` → "Shipped in 2 minutes flat"
- Per-tenant tone applied

### 3. AvatarPromptGenerator
- Creates Stable Diffusion / DALL-E prompt
- Uses tenant avatar_style + brand_color
- Returns prompt + art direction

### 4. CaptionGenerator
- Per-platform captions (Instagram ≠ LinkedIn ≠ X)
- Character limits respected
- Hashtag strategy per platform
- CTAs contextual

### 5. ComplianceChecker
- No secrets, logs, IPs, tokens
- No false claims (don't say "fastest" without proof)
- No engagement bait
- Unique per tenant (no cookie-cutter)
- Platform ToS compliance

### 6. ContentApprovalQueue
- Human review before publishing
- Async task queue (BullMQ)
- Approval workflow in Mission Control
- Audit trail

### 7. SocialConnectionRegistry
- Per-tenant platform connections
- OAuth tokens (encrypted in Supabase)
- Connection status health check
- Scope validation

### 8. ApiPublisherAdapters
- Meta: Instagram + Facebook Pages
- LinkedIn Pages
- X / Twitter
- Discord Webhooks
- Telegram Bot API
- YouTube Data API (if available)
- Pinterest API (if available)

### 9. CopyPasteKit Generator
- Export drafts as:
  - Plain text per platform
  - Markdown
  - JSON for scheduling tools
  - Google Calendar import
  - Notion/Airtable export

### 10. PublishAuditLog
- Every action logged
- User + timestamp + outcome
- Publish history searchable
- Failed publishes retryable

## State Machine

```
draft
  ↓ (human approves in Mission Control)
pending_approval
  ↓ (auto-approved if policy='instant', else waiting)
approved
  ↓ (user copies/pastes OR API publisher queues)
ready_to_copy / scheduled
  ↓ (manual copy/paste OR automatic API call)
published
  ↓ (monitor engagement, log analytics)
archived / failed
```

## API Endpoints (Phase 2.1 MVP)

```
POST /api/content/events          # Runtime events enqueue
GET  /api/content/drafts          # List tenant drafts
GET  /api/content/drafts/:id      # View draft + copy/paste kit
POST /api/content/drafts/:id/approve  # Human approval
GET  /api/content/calendar        # Content calendar
POST /api/content/regenerate      # Rerun generators for a draft
```

## Mission Control UI

**Content Studio Tab:**
- Drafts board (Kanban: draft → pending → approved → published)
- Today's draft preview
- Copy/paste kit (one-click copy per platform)
- Calendar (see scheduled posts)
- Compliance warnings
- Connected accounts status
- Publish history

## Phase 2.1 (MVP) Scope

- [x] Spec
- [ ] RuntimeToStoryMapper (hardcoded stories for 6 event types)
- [ ] CaptionGenerator (basic, per-platform)
- [ ] AvatarPromptGenerator (1 style, brand_color swap)
- [ ] ComplianceChecker (basic: no secrets regex)
- [ ] ContentApprovalQueue (BullMQ task)
- [ ] CopyPasteKit (text export)
- [ ] Mission Control UI (drafts + calendar)
- [ ] Docs + runbook

**NOT in MVP:**
- API publishing
- Image generation
- OAuth connections
- Engagement analytics
- Auto-scheduling

## Phase 2.2 (Pro) Scope

- API publishing adapters
- Image generation (Stable Diffusion or DALL-E)
- OAuth connections for each platform
- Publishing schedule automation
- Engagement analytics

## Threat Model

- ✅ No secrets in prompts
- ✅ No IP addresses in posts
- ✅ No token leaks
- ✅ No customer data exposure
- ✅ Tenant isolation
- ✅ Audit every action
- ✅ Approval gate
- ✅ Platform ToS compliance

## Success Metrics (Phase 2.1)

- [ ] Tenant can auto-generate daily draft in <5s
- [ ] Copy/paste kit reduces manual effort by 80%
- [ ] Zero secrets leaked in 100 test posts
- [ ] Compliance checker catches 90% of violations
- [ ] Mission Control shows all drafts + status
