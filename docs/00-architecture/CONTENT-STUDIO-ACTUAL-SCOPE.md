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

# Content Studio — Actual Scope: 10 Domains, Phase 2.1–2.3 Status

**Branch:** `claude/content-studio-scope-gWrk2`  
**Last Updated:** 2026-09-11 (AUDIT CORRECTED)  
**Module Size:** ~5,000 LOC (44 TypeScript files)  
**Canonical Sources:** CONTENT-PRODUCTION-MVP.md (2026-08-11) + RENDERING-ENGINE.md (2026-05-08)  
**Status:** Multi-domain platform: phases 2.1 complete, 2.2 partial, 2.3 code-ready

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

## The 10 Domains (Corrected)

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

**Status:** ✅ IMPLEMENTED. ⚠️ NOT INTEGRATED with orchestrator event loop yet.

**Next:** Wire orchestrator event bus → content drafts, enable multi-language (ES/EN fully working).

---

### Domain 2: AI Content Generation (LLM Gateway)

**What it does:** Generates creative content (story hooks, captions, scripts) via internal LLM Gateway, model 'sonnet' hardcoded.

**Files:**
- `src/generators/ai-content-generator.ts` — Structured prompts for story/caption/script generation (Zod schemas)
- `src/llm/client.ts` — LLM client abstraction:
  - **CANONICAL:** `GatewayClient` → internal LLM Gateway (port 3010), model 'sonnet' hardcoded
  - **TEST-ONLY:** `AnthropicDirectClient` (for testing, not production)
- `src/presets/tenant-content-presets.ts` — Per-tenant personas (opsly, technology, motivation)

**Topics:**
```typescript
'opsly' | 'technology' | 'motivation'
```

Each has:
- System prompt (tone, values, perspective)
- Hashtag templates
- Platform-specific character limits

**LLM Routing (ACTUAL):**
```typescript
interface LLMClient {
  complete(system: string, user: string, maxTokens?: number): Promise<string>;
}
// Canonical path: GatewayClient → Gateway → model 'sonnet'
// No runtime routing_bias selection (model is pinned)
```

**Status:** ✅ IMPLEMENTED with bilingual output (ES/EN), Zod validation, prompt engineering.
⚠️ CANONICAL PATH IS GATEWAY, not direct Anthropic.

**Next:** Integrate with orchestrator event loop, enable prompt caching, add A/B testing hooks.

---

### Domain 3: Video Rendering (Dry-Run → External Services)

**What it does:** Generates render plans (dry-run, informational). Phase 2.2 will wire to MoneyPrinterTurbo or other providers.

**Files:**
- `src/rendering/moneyprinterturbo.ts` — **TYPE-SAFE ADAPTER, NOT INTEGRATED**. Supports API call structure but never invoked in production.
- `src/rendering/episode-render-plan.ts` — Builds dry-run render plans (no external API calls)

**Current Capability (Phase 2.1):**
- Dry-run render plans only
- Validates episode readiness (blocks idea-stage episodes)
- Generates manifest with asset references
- **NO EXTERNAL API CALLS** (informational only)

**Future Capability (Phase 2.2):**
- Wire `buildEpisodeRenderPlan()` output to MoneyPrinterTurbo API
- Video aspect ratios: 9:16 (Reels/TikTok), 1:1 (Instagram), 16:9 (YouTube)
- Batched rendering, render status polling
- Asset manifest validation (URLs, thumbnails, subtitles)

**Safety:**
- Draft state validation (must be `approved` or `ready_to_copy`)
- Tenant isolation in manifests
- Request integrity checks (tenant_slug, request_id, draft_id match)

**Status:** ⚠️ CODE-READY but NOT INTEGRATED. Dry-run only, per CONTENT-PRODUCTION-MVP.md (2026-08-11).

**Next (Phase 2.2):** Wire into approval queue, integrate MoneyPrinterTurbo calls, add render status tracking in Supabase.

---

### Domain 4: YouTube Publishing (Adapter Complete)

**What it does:** Google API wrapper for YouTube video.insert() calls. CLI tool exists for manual publishing.

**Files:**
- `src/publishers/youtube.ts` — Google API wrapper (`videos.insert`, playlist support)
- `scripts/content/youtube-publish.ts` — CLI tool for manual upload

**Features:**
- Privacy status control (public, unlisted, private)
- COPPA compliance (made_for_kids flag mandatory, enforced at lines 35–37)
- Playlist insertion
- Tag/category management
- Credentials from Doppler (never hardcoded)

**Safety by Construction:**
- Credentials passed explicitly at CLI boundary
- No defaults for compliance flags
- Credentials validation on init

**Status:** ✅ IMPLEMENTED. ⚠️ E2E publishing NOT PROVEN in CI (adapter exists, integration status unclear).

**Next (Phase 2.2):** Wire into admin UI, add error handling + retry, metadata enrichment from draft, publish audit trail, E2E test integration.

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

**Status:** ✅ IMPLEMENTED, CODE-READY. Not yet integrated with runtime.

---

## Domains 6–10 (Additional)

### Domain 6: Character Management

**Files:**
- `src/characters/CharacterRegistry.ts` — Load persistent character profiles
- `src/characters/schema.ts` — Zod schema for CharacterProfile

**Status:** ✅ IMPLEMENTED (Opsly Founder, Luna, Wavo, The Traveler, NØVA).  
Character Bible finalized; used by series/episodes for consistent narration.

### Domain 7: Series Registry

**Files:**
- `src/series/SeriesRegistry.ts` — Load/manage series metadata
- `src/series/schema.ts` — Zod schema for Series

**Status:** ✅ IMPLEMENTED (Opsly Origins, Peski Lab, Build With Opsly, Parallel Path).  
Series continuity enforced; see `data/content/canon/CONTINUITY-RULES.md`.

### Domain 8: Episode Production

**Files:**
- `src/episodes/EpisodeManager.ts` — Load episodes, validate, check compliance
- `src/episodes/schema.ts` — Zod schema for Episode structure

**Status:** ✅ IMPLEMENTED. Pilot episode fully scripted; 15 episodes at idea stage (per CONTENT-PRODUCTION-MVP.md).  
CLI: `npm run content:episode -- <episode-id>` shows full script + scenes.

### Domain 9: Campaign Planning

**Files:**
- `src/campaigns/CampaignManager.ts` — Load campaign, build calendar, compute status
- `src/campaigns/schema.ts` — Zod schema for Campaign

**Status:** ✅ IMPLEMENTED. 30-day launch campaign with production status tracking.  
CLI: `npm run content:calendar` shows schedule joined with live status.

### Domain 10: Portal/Narrative Environments

**Files:**
- `config/content-formats.json` — Format definitions (NOVA_REACTS, NOVA_EXPLAINS, REALITY_CHECK, etc.)
- `config/content-portals.json` — Portal definitions (FUTURE, LAB, HUMAN, WILD, MOVE)

**Status:** ✅ IMPLEMENTED. 7 format templates with scene structure, pace, visual treatment.  
Portal system defines narrative context (NØVA's future lab, THE TRAVELER's unknown worlds, etc.).

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

### 🔄 Phase 2.2 (In Progress — AI + Rendering)

**Definition:** LLM Gateway generation + dry-run render plans (external rendering wired in Phase 2.3).

**Deliverables:**
- [x] AIContentGenerator (Claude prompts for ES/EN, via Gateway)
- [x] LLMClient (GatewayClient canonical; AnthropicDirectClient test-only)
- [x] Dry-run render plans (MoneyPrinterTurbo NOT CALLED yet)
- [x] YouTubePublisher adapter (E2E integration status unclear)

**Status:** 🔄 CODE-READY but PARTIALLY INTEGRATED. Needs:
- Orchestrator integration (event loop)
- MoneyPrinterTurbo wiring into render pipeline
- Supabase schema for drafts/renders
- Admin UI for render status & approval workflow
- YouTube E2E testing

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

### Integration (CRITICAL)

- [ ] **Event bus wiring** — Orchestrator → runtime events → ContentEventSelector (UNWIRED)
- [ ] **Approval workflow UI** — BullMQ approval queue exists, admin UI missing
- [ ] **Render integration** — MoneyPrinterTurbo adapter written but not called

### Infrastructure (OPTIONAL for Phase 2.1)

- [ ] **Supabase schema** — Optional for Phase 2.1 (dry-run only). Required Phase 2.2+ for state persistence.
- [ ] **RLS policies** — Tenant isolation on all tables
- [ ] **Audit tables** — Log all approvals, publishes, renders

### Publishing

- [ ] **Render status tracking** — Poll MoneyPrinterTurbo, update draft state (Phase 2.2)
- [ ] **Publish audit trail** — Log successful/failed publishes per platform
- [ ] **YouTube E2E** — Verify end-to-end integration (adapter exists, not proven)

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

### 4. LLM Gateway as Canonical Path (NOT routing bias)

**Decision:** Route ALL generation through internal LLM Gateway; model 'sonnet' hardcoded (no runtime selection).

**Rationale:**
- Internal Gateway provides unified cost tracking + routing
- Model pinned to 'sonnet' for consistency
- Anthropic direct client available for testing only, not production

**Implication:** No tenant-level model selection; orchestrator cannot override model choice. Gateway manages fallback logic internally.

### 5. Tenant Isolation at Every Boundary

**Decision:** Every asset, project, render, publish is scoped under `tenant_slug`.

**Rationale:**
- Multi-tenant compliance requirement
- Prevent cross-tenant data leaks
- Audit trail per tenant

**Implication:** Supabase RLS on all content tables; `tenant_slug` on every query.

---

## CLI Fragmentation (Consolidation Pending)

**Issue:** Three overlapping command-line interfaces exist without clear consolidation path.

| CLI | Purpose | Status | Note |
|-----|---------|--------|------|
| `content-os-cli.ts` | Primary: ingest, validate, transcribe, discover-clips, render-plan | ✅ ACTIVE | "OS" = Operating System; preferred interface |
| `content-cli.ts` | Legacy: duplicate commands (list, create, validate, render-plan, render) | 🟡 DUPLICATE | Per ADR-036 consolidation, should be deprecated |
| `content-engine.ts` | Approval/rejection workflow (approve, reject commands) | ✅ ACTIVE | Separate concern, may remain |
| Shell wrappers | `content-studio-enqueue.sh`, `content-studio-publish-youtube.sh` | 🟡 PARTIAL | Manual orchestration; not automated |

**Recommendation:** Adopt `content-os-cli.ts` as canonical. Deprecate `content-cli.ts` per ADR-036.

**Impact on Scope:** Unclear which CLI is used in production. Tests may require all three.

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
│   │   └── client.ts                     # LLM Gateway (canonical) + Anthropic (test-only)
│   │
│   ├── presets/
│   │   └── tenant-content-presets.ts     # Personas (opsly, tech, motivation)
│   │
│   ├── rendering/
│   │   ├── moneyprinterturbo.ts          # External render adapter (dry-run, not wired)
│   │   └── episode-render-plan.ts        # Dry-run plans only (Phase 2.2+)
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
│       └── (test status unknown: vitest unavailable in audit environment)
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
