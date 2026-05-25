---
type: governance
status: active
owner: operations
last_review: 2026-05-24
---

# Sub-Processor Registry

All third-party services that process personal data on behalf of Peskids or Opsly.

**Review cycle:** quarterly. Add new processors here BEFORE onboarding them.

---

## Peskids Sub-Processors

| # | Processor | Legal entity | Jurisdiction | Data processed | DPA / Privacy URL | Tier |
|---|-----------|-------------|-------------|----------------|-------------------|------|
| 1 | **Supabase** | Supabase Inc. | USA (AWS us-east-1) | All leads, students, parents, staff PII | [DPA](https://supabase.com/legal/dpa) | P0/P1 |
| 2 | **Jelou** | Jelou S.A.S | Colombia | Guardian name, email, phone (CRM comms) | [Privacy](https://jelou.ai/privacidad) | P1 |
| 3 | **n8n (self-hosted)** | Opsly (internal) | VPS: Colombia/EU | Lead mirror (name, email, phone, neighborhood, grade) | Internal DPA — same controller | P1 |
| 4 | **Anthropic** | Anthropic PBC | USA | Chat message content (AI processing) | [Privacy](https://www.anthropic.com/legal/privacy) | P1 |
| 5 | **Vercel** | Vercel Inc. | USA | Hosting, edge network, IP addresses in access logs | [DPA](https://vercel.com/legal/dpa) | P2 |
| 6 | **Resend** | Resend Inc. | USA | Transactional email (guardian email address) | [Privacy](https://resend.com/legal/privacy-policy) | P1 |

**Note on Google Fonts:** Peskids uses `next/font/google` which downloads fonts at **build time** and serves them from Vercel's CDN — no requests are sent to Google's servers from user browsers. No data transfer to Google.

**Note on Instagram:** The `@peskids_oficial` feed is loaded **server-side** via Instagram Graph API at build/ISR time. No Meta scripts, pixels, or cookies are loaded on the user's browser.

---

## Opsly Platform Sub-Processors

| # | Processor | Legal entity | Jurisdiction | Data processed | DPA / Privacy URL | Tier |
|---|-----------|-------------|-------------|----------------|-------------------|------|
| 1 | **Supabase** | Supabase Inc. | USA (AWS us-east-1) | All tenant and user PII | [DPA](https://supabase.com/legal/dpa) | P0/P1 |
| 2 | **Doppler** | Doppler Systems Inc. | USA | Secrets metadata (no PII values) | [Privacy](https://www.doppler.com/privacy) | P2 |
| 3 | **Stripe** | Stripe Inc. | USA | Billing PII (name, email, card metadata) | [DPA](https://stripe.com/legal/dpa) | P1 |
| 4 | **Vercel** | Vercel Inc. | USA | Hosting, edge, IP logs | [DPA](https://vercel.com/legal/dpa) | P2 |
| 5 | **Cloudflare** | Cloudflare Inc. | USA | DNS, CDN, IP addresses | [DPA](https://www.cloudflare.com/gdpr/introduction/) | P2 |
| 6 | **Tailscale** | Tailscale Inc. | Canada | Device identifiers (infrastructure only, no user PII) | [Privacy](https://tailscale.com/privacy-policy) | P2 |
| 7 | **Resend** | Resend Inc. | USA | Transactional email (tenant admin emails) | [Privacy](https://resend.com/legal/privacy-policy) | P1 |
| 8 | **Anthropic** | Anthropic PBC | USA | LLM processing via LLM Gateway | [Privacy](https://www.anthropic.com/legal/privacy) | P1 |
| 9 | **OpenRouter** | OpenRouter Inc. | USA | LLM routing (may include OpenAI, Mistral) | [Privacy](https://openrouter.ai/privacy) | P1 |

---

## Adding a new sub-processor

1. Confirm they have an acceptable DPA (EU SCCs or Colombia-equivalent).
2. Add row to this file.
3. Update `docs/legal/{tenant}/privacy.md` sub-processor section.
4. If P0/P1: verify encryption in transit and at rest, data residency acceptable.
5. PR → approved by `operations` owner.
