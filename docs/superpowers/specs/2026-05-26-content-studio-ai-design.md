# Content Studio AI Generator — Design Spec
**Date:** 2026-05-26  
**Status:** Approved  
**Goal:** Generate AI-powered social content (Opsly, technology, motivation) operable in a Docker node

---

## What This Builds

An AI content generation pipeline inside `lib/content-studio` plus a standalone HTTP service (`apps/content-studio-service`) that exposes it over HTTP and runs in Docker on the VPS (dragon-1 / 100.120.151.91).

---

## Topics

| Topic | Description |
|---|---|
| `opsly` | Opsly product updates, automation, platform features |
| `technology` | Tech trends, engineering insights, tools |
| `motivation` | Founder mindset, builder culture, resilience |

---

## Architecture

```
POST /generate
  → Express server (content-studio-service:3013)
    → validateRequest (Zod)
      → LLMClient.complete(system, user)
        → AnthropicDirectClient (SDK) | GatewayClient (HTTP→llm-gateway:3010)
      → parseAIResponse (Zod)
      → ContentDraft (bilingual, reel_script, captions)
  ← { ok: true, draft: ContentDraft }
```

---

## New Types (`lib/content-studio/src/types.ts`)

```typescript
ContentTopic = 'opsly' | 'technology' | 'motivation'

AIGenerationParams {
  topic: ContentTopic
  tenant_slug: string
  language: 'es' | 'en' | 'both'           // both = generate two sets
  platforms: Platform[]                      // default: instagram, youtube, tiktok
  context?: string                           // extra context for the AI
  tone?: ToneOfVoice                         // default: friendly
}
```

---

## LLMClient Interface (`lib/content-studio/src/llm/client.ts`)

```typescript
interface LLMClient {
  complete(system: string, user: string, maxTokens?: number): Promise<string>
}

class AnthropicDirectClient implements LLMClient  // uses @anthropic-ai/sdk
class GatewayClient implements LLMClient           // HTTP POST llm-gateway:3010/v1/complete
```

Service picks client based on env: `LLM_PROVIDER=anthropic|gateway`

---

## AI Generator (`lib/content-studio/src/generators/ai-content-generator.ts`)

Single LLM call with structured JSON output. Prompt asks for:
- `story_hook` — hook opening (≤150 chars)
- `call_to_action` — closing action line
- `captions` — per-platform text + hashtags (respects char limits)
- `reel_script` — array of scenes: `{ scene, copy, duration_sec }` totaling 30–90s
- `image_prompt` — DALL-E / Midjourney ready prompt
- Bilingual: when `language = 'both'`, output has `es` and `en` versions

Output is validated with Zod before returning as `ContentDraft`.  
Draft state is set to `ready_to_copy` (no approval queue).

---

## Service (`apps/content-studio-service`)

- **Port:** 3013
- **Framework:** Express + Zod
- **Routes:**
  - `GET /health` → `{ ok: true, uptime_ms }`
  - `POST /generate` → `{ ok: true, draft: ContentDraft }`
  - `POST /generate/batch` → `{ ok: true, drafts: ContentDraft[] }` (up to 5)
- **Auth:** `X-API-Key` header (env var `CONTENT_STUDIO_API_KEY`)
- **Config via env:**
  - `LLM_PROVIDER` = `anthropic` | `gateway`
  - `ANTHROPIC_API_KEY` (if provider = anthropic)
  - `LLM_GATEWAY_URL` (if provider = gateway, default: `http://llm-gateway:3010`)
  - `CONTENT_STUDIO_API_KEY`

---

## Docker

**Dockerfile:** `apps/content-studio-service/Dockerfile`  
**Compose:** `infra/docker-compose.content-studio.yml`  
**Network:** `opsly-mcp` (existing)  
**Image pattern:** multi-stage, node:20-alpine, builds lib + app

---

## Success Criteria

- [ ] `POST /generate` returns valid `ContentDraft` with bilingual captions + reel_script
- [ ] Container starts with `ANTHROPIC_API_KEY` set
- [ ] `GET /health` returns 200
- [ ] Tests pass for AI generator (mock LLMClient)
- [ ] Service runs on dragon-1 at port 3013
