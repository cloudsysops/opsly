# 🎟️ BBC - Panini Sticker Collection Assistant

**BBC/Jarvis**: An AI-powered assistant to manage Panini sticker collections with voice, scanning, and marketplace integration.

## Features

✅ **Voice Q&A** — Ask "Do I have Messi?" → BBC searches your inventory  
✅ **Camera Scanning** — Point at stickers → OCR recognition → auto-catalog  
✅ **Inventory Tracking** — View which cards you own vs. need  
✅ **Smart Wishlist** — Missing stickers + price budgets  
✅ **Marketplace Search** — Auto-compare MercadoLibre, Ebay, Facebook  
✅ **Multi-Tournament** — World Cup, Euros, Copa America, etc.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Node.js, Express (in-process)
- **Database**: Supabase (PostgreSQL)
- **Vision**: OpenAI Vision API (OCR)
- **State Management**: React Hooks + Supabase Real-time
- **Styling**: Tailwind CSS

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Development server
npm run dev
# Open http://localhost:3005
```

## Architecture

### Pages

| Page           | Purpose                                |
| -------------- | -------------------------------------- |
| `/chat`        | Main BBC Q&A interface (voice + text)  |
| `/scan`        | Camera scanner for sticker recognition |
| `/inventory`   | View collection by tournament          |
| `/wishlist`    | Missing stickers + price tracking      |
| `/marketplace` | Cross-venue price comparison           |

### API Routes

| Route                     | Method   | Purpose                         |
| ------------------------- | -------- | ------------------------------- |
| `/api/chat`               | POST     | BBC message handling            |
| `/api/scan/ocr`           | POST     | Image → sticker identification  |
| `/api/inventory`          | GET/POST | Inventory queries + add sticker |
| `/api/wishlist`           | GET/POST | Wishlist management             |
| `/api/marketplace/search` | POST     | Cross-venue search              |

### Hooks

- `useVoiceInput()` — Record + transcribe audio
- `useStickerContext()` — Manage inventory state

## Development Phases

| Phase                   | Status         | Duration |
| ----------------------- | -------------- | -------- |
| 1. Database Schema      | ✅ Complete    | 1 day    |
| 2. Frontend (this)      | 🔄 In Progress | 2 days   |
| 3. Backend Services     | Pending        | 2 days   |
| 4. OCR + CV             | Pending        | 2 days   |
| 5. Marketplace APIs     | Pending        | 2 days   |
| 6. LLM Integration      | Pending        | 2 days   |
| 7. Testing + Deployment | Pending        | 2 days   |

## Environment Variables

See `.env.example` for all required variables. Key ones:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — For server-side DB operations
- `OPENAI_API_KEY` — For vision/OCR capabilities
- `MERCADOLIBRE_ACCESS_TOKEN`, `EBAY_API_KEY` — Marketplace APIs

## Contributing

This is part of the Opsly monorepo. See `../../CLAUDE.md` for codebase guidelines.

## Next Steps

1. **Phase 3** — Implement backend services:
   - StickerContextService (inventory queries)
   - StickerOCRService (vision integration)
   - MarketplaceService (API wrappers)

2. **Phase 4** — Wire LLM Gateway with sticker tools

3. **Phase 5** — Deploy to VPS

## Related

- Plan: `/root/.claude/plans/mira-qbyavv-bbc-empezamos-parsed-rabbit.md`
- Database: `supabase/migrations/0066_panini_sticker_collections.sql`
- Voice Library: `lib/voice-messaging/`
