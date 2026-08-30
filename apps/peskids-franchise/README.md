# Franchise Management System

A full-stack franchise management platform built for managing the complete franchise lifecycle: lead capture, prospect qualification, automated workflows, franchisee onboarding, territory mapping, royalty collection, and AI-powered coaching.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL + pgvector (via Prisma ORM)
- **Auth:** NextAuth v5 (Google OAuth for admins, credentials for prospects/franchisees)
- **Payments:** Stripe Connect (ACH royalty collection)
- **Email:** Postmark (transactional email with branded templates)
- **E-Signatures:** Dropbox Sign (FDD, franchise agreements)
- **AI Chatbot:** Claude API (RAG-powered "Earl" assistant)
- **Embeddings:** OpenAI text-embedding-3-small
- **Maps:** Mapbox GL JS + Turf.js (territory visualization and analysis)
- **UI:** Tailwind CSS, Recharts, TipTap editor, ReactFlow, dnd-kit
- **Testing:** Vitest

## Key Features

- **Prospect Pipeline** -- CRM with lead scoring, automated stage transitions, speed-to-lead alerts
- **Pre-Work System** -- Multi-module assessment with AI-powered evaluation scoring
- **Franchise Academy** -- Learning management with progress tracking and gamification
- **Territory IQ** -- Interactive map-based territory analysis with demographic scoring
- **Royalty Engine** -- Automated invoice generation, Stripe Connect ACH collection, PDF statements
- **AI Coach "Earl"** -- RAG chatbot with journey-aware personalized coaching
- **Workflow Automation** -- Visual workflow builder with trigger/condition/action engine
- **Operations Manual** -- Rich-text wiki with knowledge base and search
- **Document Signing** -- Embedded e-signature flows for FDD and franchise agreements
- **Email Templates** -- Branded transactional emails with template variable system
- **Analytics Dashboard** -- Pipeline metrics, conversion funnels, franchisee health scores

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in DATABASE_URL and auth vars (required)
# All other integrations run in demo/stub mode without API keys

# Push database schema
npx prisma db push

# Seed base data
npx tsx prisma/seed.ts

# Start dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Demo Mode

Without external API keys, the app runs in demo mode:

- **Stripe** -- Returns mock payment objects
- **Postmark** -- Logs emails to console
- **Dropbox Sign** -- Returns mock signature requests
- **Claude/OpenAI** -- Returns canned chatbot responses and zero-vector embeddings
- **Mapbox** -- Map features require a free public token from mapbox.com

## Project Structure

```
src/
  app/           # Next.js App Router pages and API routes
  components/    # React components
  lib/           # Core business logic
    ai/          # AI evaluation and suggestions
    automation/  # Workflow engine and actions
    dropboxsign/ # E-signature integration
    email/       # Email service and templates
    rag/         # RAG pipeline (embeddings, retrieval, generation)
    royalties/   # Invoice generation and payment processing
    stripe/      # Stripe Connect integration
    territories/ # Mapbox, geocoding, territory scoring
  hooks/         # Custom React hooks
  middleware.ts  # Auth middleware
prisma/
  schema.prisma  # Database schema
  seed*.ts       # Seed scripts for demo data
```
