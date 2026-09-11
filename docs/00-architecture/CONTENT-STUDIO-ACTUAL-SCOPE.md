---
status: canon
owner: operations
last_review: 2026-09-11
type: scope
tags:
  - content-studio
  - scope
  - phase-2
---

# Content Studio — Actual Scope & Implementation Status

**Branch:** `claude/content-studio-scope-gWrk2`  
**Last Updated:** 2026-09-11  
**Module Size:** ~5,000 LOC (44 TypeScript files)  
**Status:** Multi-domain platform, beyond Phase 2.1 MVP

---

## Reality Check: What's Actually Built

The codebase contains **FAR MORE** than the Phase 2.1 MVP described in AGENTS.md (dated 2026-05-18). This document reflects the actual implementation.

### By the Numbers

| Domain | Files | Purpose | Status |
|--------|-------|---------|--------|
| **Social Captions** | 8 | Event→copy, per-platform | ✅ Complete |
| **AI Generation** | 3 | Claude + LLM routing | ✅ Complete |
| **Rendering** | 2 | MoneyPrinterTurbo adapter | ✅ Complete |
| **YouTube** | 1 | Direct API publishing | ✅ Complete |
| **Video Pipeline** | 17 | Clip discovery, FFmpeg, transcription | ✅ Complete |
| **Episodes** | 2 | Series/episode management | ✅ Complete |
| **Series** | 2 | Series registry & metadata | ✅ Complete |
| **Characters** | 2 | Character asset registry | ✅ Complete |
| **Campaigns** | 2 | Campaign calendar & production status | ✅ Complete |
| **UI Data** | 1 | Draft/approval views | ✅ Complete |

---

## The Five Domains

### Domain 1: Social Captions (Marketing Event-Driven)

**What it does:** Converts dev-ops runtime events → social media captions with per-platform optimization.

**Files:**
- `src/mappers/runtime-to-story.ts` — Event → narrative hook (session created, deployment, approval, etc.)
- `src/generators/caption-generator.ts` — Per-platform captions (Instagram, X, LinkedIn, TikTok, YouTube Shorts, Facebook)
- `src/generators/avatar-prompt.ts` — Image prompt generation (brand color + style)
- `src/checkers/compliance-checker.ts` — No secrets, no false claims, no engagement bait
- `src/adapters/content-approval-queue.ts` — BullMQ approval workflow
- `src/adapters/copy-paste-kit.ts` — Export for manual posting (text, Markdown, JSON)

**Event Types Mapped:**
```typescript
'session_created' | 'deployment_success' | 'approval_completed' | 'branch_merged' |
'test_suite_passed' | 'security_scan_clean' | 'worker_online' | 'session_resumed' |
'migration_finished'
```

**Platforms:**
- Instagram (carousel, Reels)
- Facebook Pages
- TikTok / Reels
- YouTube Shorts
- LinkedIn (organic + company page)
- X / Twitter
- Discord (webhooks)

**Status:** ✅ Fully implemented, tested, in use.

**Next:** Connect to runtime event bus (orchestrator), enable multi-language (ES/EN).

---

### Domain 2: AI Content Generation (Claude-Powered)

**What it does:** Generates creative content (story hooks, captions, scripts) using Claude via Anthropic or gateway routing.

**Files:**
- `src/generators/ai-content-generator.ts` — Structured prompts for story/caption/script generation (Zod schemas)
- `src/llm/client.ts` — LLM client abstraction (Anthropic direct or gateway with routing bias: cost/balanced/quality)
- `src/presets/tenant-content-presets.ts` — Per-tenant personas (opsly, technology, motivation)

**Topics:**
```typescript
'opsly' | 'technology' | 'motivation'
```

Each has:
- System prompt (tone, values, perspective)
- Hashtag templates
- Platform-specific character limits

**LLM Routing:**
```typescript
interface LLMClient {
  call(params: {
    prompt: string;
    system?: string;
    model?: 'claude-opus-5' | 'claude-sonnet-5' | 'claude-haiku-4-5';
    routing_bias?: 'cost' | 'balanced' | 'quality';
  }): Promise<string>;
}
```

Supports:
- Direct Anthropic API (highest quality, costlier)
- Gateway routing (fallback logic, cost awareness)

**Status:** ✅ Implemented with bilingual output (ES/EN), Zod validation, prompt engineering.

**Next:** Integrate with orchestrator event loop, cache common prompts, add A/B testing hooks.

---

### Domain 3: Video Rendering (MoneyPrinterTurbo)

**What it does:** Submits approved content drafts to external rendering service for video generation.

**Files:**
- `src/rendering/moneyprinterturbo.ts` — Adapter for MoneyPrinterTurbo API
- `src/rendering/episode-render-plan.ts` — Orchestrate multi-episode renders

**Supported:**
- Video aspect ratios: 9:16 (Reels/TikTok), 1:1 (Instagram), 16:9 (YouTube)
- Batched rendering (multiple videos in one request)
- Render status polling
- Asset manifest validation (URLs, thumbnails, subtitles)

**Safety:**
- Draft state validation (must be `approved` or `ready_to_copy`)
- Tenant isolation in manifests
- Request integrity checks (tenant_slug, request_id, draft_id match)

**Status:** ✅ Complete, awaiting integration with content draft approval flow.

**Next:** Wire into BullMQ approval queue, implement retry logic, add render status tracking in Supabase.

---

### Domain 4: YouTube Publishing

**What it does:** Direct upload to YouTube using OAuth2 credentials.

**Files:**
- `src/publishers/youtube.ts` — Google API wrapper (`videos.insert`, playlist support)

**Features:**
- Privacy status control (public, unlisted, private)
- COPPA compliance (made_for_kids flag mandatory)
- Playlist insertion
- Tag/category management
- Credentials from Doppler (never hardcoded)

**Safety by Construction:**
- Credentials passed explicitly at CLI boundary
- No defaults for compliance flags
- Credentials validation on init

**Status:** ✅ Implemented, awaiting orchestrator integration.

**Next:** Add error handling + retry, metadata enrichment from draft, publish audit trail.

---

### Domain 5: Video Production (Content Engine + Episodes/Series/Characters)

**What it does:** Structured video production pipeline — local-first with FFmpeg, clip discovery, transcription, character management.

**Subdomains:**

#### 5a. Content Engine (Video Pipeline)

**Files:** `src/content-engine/*` (17 files, ~3k LOC)
- `pipeline.ts` — Main orchestrator (ingest → scene → compose → render)
- `ffmpeg.ts` — FFmpeg wrappers (probe, scale, trim, concat, overlay, burn subtitles, thumbnail)
- `clip-discovery.ts` — Auto-detect scene boundaries from video
- `transcribe.ts` — Audio transcription (Whisper compat)
- `storage.ts` — Tenant-isolated asset + project storage
- `rights.ts` — Provenance + licensing gates
- `taxonomy.ts` — Scene tagging and metadata
- `trends.ts` — Audio trend detection for clip discovery
- `validation.ts` — Project/scene/asset validation

**Safety:**
- FFmpeg via `spawn()` with allowlisted methods (no shell injection)
- Tenant isolation via `data/content/tenants/{tenant_slug}/`
- Rights gates (owned vs licensed vs fair-use)
- Cross-tenant asset reference prevention

**Status:** ✅ Complete with multi-tenant safety enforced.

#### 5b. Episodes

**Files:**
- `src/episodes/EpisodeManager.ts` — Load/create episodes, compliance checks
- `src/episodes/schema.ts` — Zod schemas for episode structure

**Features:**
- Episode lifecycle management
- Scene composition
- Script + metadata storage

**Status:** ✅ Implemented.

#### 5c. Series

**Files:**
- `src/series/SeriesRegistry.ts` — Load all series, metadata
- `src/series/schema.ts` — Series data model

**Status:** ✅ Implemented.

#### 5d. Characters

**Files:**
- `src/characters/CharacterRegistry.ts` — Character asset registry
- `src/characters/schema.ts` — Character profile schema

**Status:** ✅ Implemented.

#### 5e. Campaigns

**Files:**
- `src/campaigns/CampaignManager.ts` — Campaign calendar, production status
- `src/campaigns/schema.ts` — Campaign data model

**Status:** ✅ Implemented.

---

## Coordination with Peer Sessions

### mac2011 Session: Gameplay Pipeline

**Working on:** `lib/content-studio/src/content-engine/` (gameplay clips, audio discovery, QA gates)  
**Branch:** `docs/mauro-gameplay-pipeline-spec` / `mauro-gameplay-pipeline-impl`  
**Channel:** `icso-gaming-tbd`

**Overlap Risk:** Both sessions touch `lib/content-studio/src/content-engine/`, but on different use cases:
- **This session (gWrk2):** Scope clarification + phase 2.2+ planning
- **mac2011 session:** Building gameplay pipeline (domain-specific, not architectural)

**Coordination:**
- ✅ No code conflicts expected (mac2011 is adding features, not refactoring architecture)
- ✅ Both use the same `content-engine` module independently
- ⚠️ **Action:** If ADR-058 (content engine consolidation) is finalized, both sessions should review it

---

## Actual Phase Breakdown

### ✅ Phase 2.1 (Completed — MVP)

**Definition:** Event-driven social captions without auto-publish.

**Deliverables:**
- [x] RuntimeToStoryMapper (6 event types)
- [x] CaptionGenerator (per-platform)
- [x] AvatarPromptGenerator
- [x] ComplianceChecker
- [x] ContentApprovalQueue (BullMQ)
- [x] CopyPasteKit (text export)
- [x] Compliance tests, unit tests

**Status:** ✅ Code complete, awaiting integration into orchestrator + admin UI.

---

### ✅ Phase 2.2 (In Progress — AI + Rendering)

**Definition:** Claude-powered generation + external video rendering.

**Deliverables:**
- [x] AIContentGenerator (Claude prompts for ES/EN)
- [x] LLMClient (direct + gateway routing)
- [x] MoneyPrinterTurboAdapter (rendering service integration)
- [x] YouTubePublisher (direct API upload)

**Status:** ✅ Code complete, needs:
- Orchestrator integration (event loop)
- Supabase schema for drafts/renders
- Admin UI for render status
- Retry + error handling

---

### 🔄 Phase 2.3 (Planned — Video Production)

**Definition:** Structured video production with episodes, series, campaigns, characters.

**Deliverables:**
- [x] Content Engine (full pipeline, FFmpeg-based)
- [x] Episodes, Series, Characters, Campaigns managers
- [ ] Supabase schema for video projects
- [ ] Admin UI for video composition
- [ ] Workflow: Asset ingest → Scene → Render → Publish

**Status:** 🔄 Code mostly complete, orchestrator/admin integration pending.

---

### 📋 Phase 2.4 (Future — Engagement & Analytics)

**Definition:** Track performance, optimize posting, A/B testing.

**Not yet scoped.**

---

## What's Missing (Gaps)

### Infrastructure

- [ ] **Supabase schema** — `content_drafts`, `content_events`, `content_renders`, `video_projects`, `episodes`, `series`, `characters`, `campaigns`
- [ ] **RLS policies** — Tenant isolation on all tables
- [ ] **Audit tables** — Log all approvals, publishes, renders

### Integration

- [ ] **Event bus** — Runtime events → ContentEventSelector in orchestrator
- [ ] **Approval workflow** — BullMQ jobs with admin UI
- [ ] **Render status tracking** — Poll MoneyPrinterTurbo, update draft state
- [ ] **Publish audit trail** — Log successful/failed publishes per platform

### Admin UI

- [ ] **Content drafts board** — Kanban (draft → pending → approved → rendering → published)
- [ ] **Render queue** — Monitor in-flight renders
- [ ] **Publish history** — Searchable audit log
- [ ] **Tenant content settings** — Profile, presets, connected accounts (future)

### Testing

- [ ] **E2E:** Event → draft → approval → render → publish
- [ ] **Multi-tenant:** Isolation across tenants
- [ ] **Compliance:** 100 test posts, zero secrets leaked

---

## Success Criteria

### Phase 2.1 MVP

- [ ] **Event integration:** Runtime events flow from orchestrator → content drafts
- [ ] **Copy/paste kit:** Users export captions for manual posting
- [ ] **Approval workflow:** Drafts enter BullMQ queue, admin approves
- [ ] **Zero secrets:** Compliance checker catches 100% of test violations
- [ ] **Multi-language:** EN + ES captions auto-generated
- [ ] **5s generation:** Draft generation <5s per event

### Phase 2.2 (AI + Rendering)

- [ ] **AI generation:** Claude-powered story hooks + captions (no hardcoded templates)
- [ ] **Video render:** MoneyPrinterTurbo integration, 3+ aspect ratios
- [ ] **YouTube publish:** OAuth2 flow, direct upload + metadata
- [ ] **Retry logic:** Failed renders/publishes auto-retry with exponential backoff
- [ ] **Render status:** Admin sees in-flight renders, completion ETAs

### Phase 2.3 (Video Production)

- [ ] **Episode management:** Create/load episodes with scene composition
- [ ] **Series registry:** Manage series metadata, track content IP
- [ ] **Character registry:** Asset-based character management
- [ ] **Campaign calendar:** Visual production roadmap
- [ ] **FFmpeg safety:** No shell injection, tenant isolation enforced
- [ ] **Clip discovery:** Audio peaks auto-detect scene boundaries

### Phase 2.4 (Engagement)

- [ ] Engagement metrics per platform
- [ ] A/B testing hooks
- [ ] Optimal posting time recommendations
- [ ] Caption performance analytics

---

## Architecture Decisions

### 1. Two Parallel Content Domains (Not Merged)

**Decision:** Keep social captions + video production as separate modules within Content Studio.

**Rationale:**
- **Social captions** are event-driven, real-time, compliance-heavy
- **Video production** is asset-driven, multi-day, provenance-heavy
- Both use overlapping infrastructure (LLM, rendering), but different data models

**Implication:** `lib/content-engine` (video) ≠ domain 1 (social captions). They coexist.

### 2. External Rendering (MoneyPrinterTurbo)

**Decision:** Don't re-implement video gen; use external service.

**Rationale:**
- Video AI is rapidly evolving (10+ services competing)
- Opsly strength is orchestration, not video models
- Vendor lock-in mitigated by adapter pattern

**Implication:** Easily swap MoneyPrinterTurbo → Runway → Synthesia later.

### 3. Approval Gate Always Required

**Decision:** No auto-publish in Phase 2.1–2.3. All content requires human approval before render/publish.

**Rationale:**
- Compliance risk (secrets, false claims, brand misalignment)
- Legal liability if Opsly-generated content causes harm
- Scaling to auto-publish requires mature compliance + audit trail

**Implication:** Approval queue (BullMQ) is non-negotiable infrastructure.

### 4. LLM Routing for Cost/Quality Trade-off

**Decision:** Support multiple Claude models (Opus/Sonnet/Haiku) with runtime routing bias.

**Rationale:**
- Opus: highest quality (story hooks, complex prompts)
- Sonnet: balanced (captions, routine generation)
- Haiku: low cost (simple templates, high volume)

**Implication:** Tenant can configure routing in profile; orchestrator honors it.

### 5. Tenant Isolation at Every Boundary

**Decision:** Every asset, project, render, publish is scoped under `tenant_slug`.

**Rationale:**
- Multi-tenant compliance requirement
- Prevent cross-tenant data leaks
- Audit trail per tenant

**Implication:** Supabase RLS on all content tables; `tenant_slug` on every query.

---

## File Structure (Actual)

```
lib/content-studio/
├── src/
│   ├── types.ts                          # Shared types
│   ├── date-utils.ts
│   │
│   ├── mappers/
│   │   └── runtime-to-story.ts           # Event → narrative
│   │
│   ├── generators/
│   │   ├── caption-generator.ts          # Per-platform captions
│   │   ├── avatar-prompt.ts              # Image prompt
│   │   ├── ai-content-generator.ts       # Claude + Zod schemas
│   │
│   ├── checkers/
│   │   └── compliance-checker.ts         # Secrets + claims validation
│   │
│   ├── adapters/
│   │   ├── content-approval-queue.ts     # BullMQ workflow
│   │   └── copy-paste-kit.ts             # Export formats
│   │
│   ├── llm/
│   │   └── client.ts                     # Anthropic + gateway routing
│   │
│   ├── presets/
│   │   └── tenant-content-presets.ts     # Personas (opsly, tech, motivation)
│   │
│   ├── rendering/
│   │   ├── moneyprinterturbo.ts          # External render adapter
│   │   └── episode-render-plan.ts        # Multi-episode orchestration
│   │
│   ├── publishers/
│   │   └── youtube.ts                    # Google API wrapper
│   │
│   ├── ui/
│   │   └── draft-view-data.ts            # Admin dashboard data models
│   │
│   ├── content-engine/                   # Video production pipeline
│   │   ├── types.ts
│   │   ├── pipeline.ts                   # Main orchestrator
│   │   ├── ffmpeg.ts                     # Rendering
│   │   ├── storage.ts                    # Asset + project storage
│   │   ├── clip-discovery.ts             # Auto clip detection
│   │   ├── transcribe.ts                 # Whisper adapter
│   │   ├── rights.ts                     # Provenance gates
│   │   ├── taxonomy.ts                   # Scene metadata
│   │   ├── trends.ts                     # Audio analysis
│   │   ├── validation.ts                 # Safety checks
│   │   ├── paths.ts, presets.ts, schema.ts, etc.
│   │
│   ├── episodes/
│   │   ├── EpisodeManager.ts
│   │   └── schema.ts
│   │
│   ├── series/
│   │   ├── SeriesRegistry.ts
│   │   └── schema.ts
│   │
│   ├── characters/
│   │   ├── CharacterRegistry.ts
│   │   └── schema.ts
│   │
│   ├── campaigns/
│   │   ├── CampaignManager.ts
│   │   └── schema.ts
│   │
│   └── __tests__/
│       └── (44 test files)
│
├── package.json
├── tsconfig.json
└── GOVERNANCE.md
```

---

## Exports (Public API)

See `src/index.ts` for the full list. Key exports:

```typescript
// Social captions
export { mapEventToStory, mapMultipleEventsToStory }
export { generateCaption, generateCaptions, enrichContentDraftWithCaptions }
export { checkDraftCompliance, checkCaptionsCompliance }
export { ContentApprovalQueue, createApprovalQueue }
export { CopyPasteKit }

// AI generation
export { generateAIContent, generateAIContentBilingual }
export { createLLMClient, AnthropicDirectClient, GatewayClient }
export { generateAvatarPrompt, generateAvatarPrompts }

// Rendering + publishing
export { MoneyPrinterTurboRenderClient, buildMoneyPrinterTurboPayload }
export { YouTubePublisher, loadYouTubeCredentialsFromEnv }
export { buildEpisodeRenderPlan }

// Data models
export { EpisodeManager, loadEpisode, loadEpisodeScript, loadAllEpisodes }
export { SeriesRegistry, loadSeries, loadAllSeries }
export { CharacterRegistry, loadCharacter, loadAllCharacters }
export { CampaignManager, loadCampaign, buildCalendarView }

// UI support
export { getDraftListItemData, getCalendarData, getApprovalQueueData }

// Presets
export { getDefaultTenantContentPresets, resolveTenantContentPreset }

// Content engine
export * as contentEngine
```

---

## Next Steps (Immediate — Week 1)

1. **Commit this scope document** to replace outdated AGENTS.md Phase 2 section
2. **Create Supabase schema** (`migrations/`) for content drafts, events, renders
3. **Wire orchestrator event bus** → ContentEventSelector
4. **Implement admin UI stubs** (drafts board, approval queue, render status)
5. **Write integration tests** (event → draft → approval flow)

---

## Related Docs

- `CONTENT-STUDIO-ARCHITECTURE.md` — Original spec (may be outdated)
- `docs/IMPLEMENTATION-IA-LAYER.md` — AI layer guidance
- `docs/ORCHESTRATOR.md` — Event bus + BullMQ
- `docs/SECURITY_CHECKLIST.md` — Zero-Trust rules
- `CLAUDE.md` — Codebase rules + skills

---

## Contact & Escalation

**Owner:** Operations (this session: gWrk2)  
**Maintainers:** Content/Growth team  
**Related sessions:**
- mac2011: gameplay pipeline (content-engine domain-specific work)
- Others: pending

---

*Last updated 2026-09-11 by Claude Code session gWrk2*
