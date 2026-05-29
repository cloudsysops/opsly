import { NextRequest, NextResponse } from 'next/server';
import { StickerContextService } from '../../../server/services/sticker-context';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { message, userId, tournamentId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // TODO: Get userId from session
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const tenantId = 'default'; // TODO: Get from session
    const currentTournamentId = tournamentId || 'default'; // TODO: Get active tournament

    const service = new StickerContextService(supabaseUrl, supabaseKey);
    const result = await service.queryInventory(message, userId, tenantId, currentTournamentId);

    const actions: Array<{ label: string; action: string }> = [];

    if (result.found && result.stickers.length > 0) {
      actions.push({ label: '➕ Agregar a deseos', action: 'add_to_wishlist' });
      actions.push({ label: '🔍 Buscar precios', action: 'search_marketplace' });
    } else if (!result.found) {
      actions.push({ label: '📷 Escanear', action: 'open_scanner' });
      actions.push({ label: 'Ver mi colección', action: 'show_inventory' });
    }

    return NextResponse.json({
      content: result.message,
      stickers: result.stickers,
      actions,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
