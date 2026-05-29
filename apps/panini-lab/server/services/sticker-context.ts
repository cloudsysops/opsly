import { createClient } from '@supabase/supabase-js';

interface StickerQueryResult {
  found: boolean;
  stickers: Array<{
    id: string;
    player_name: string;
    country: string;
    number: number;
    card_type: string;
    owned: boolean;
    quantity: number;
  }>;
  message: string;
}

interface CollectionStats {
  total_cards: number;
  owned_cards: number;
  percent_complete: number;
  missing_cards: number;
}

interface MissingSticker {
  id: string;
  number: number;
  player_name: string;
  country: string;
  rarity_level: string;
  cheapest_price?: number;
  marketplace?: string;
}

export class StickerContextService {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async queryInventory(
    query: string,
    userId: string,
    tenantId: string,
    tournamentId: string
  ): Promise<StickerQueryResult> {
    const lowerQuery = query.toLowerCase();

    // Extract intent and parameters from natural language
    if (
      lowerQuery.includes('tengo') ||
      lowerQuery.includes('do i have') ||
      lowerQuery.includes('tienes')
    ) {
      return this.findPlayerInInventory(userId, tenantId, tournamentId, query);
    }

    if (
      lowerQuery.includes('falta') ||
      lowerQuery.includes('missing') ||
      lowerQuery.includes('necesito')
    ) {
      return this.findMissingByTeam(userId, tenantId, tournamentId, query);
    }

    if (
      lowerQuery.includes('escudos') ||
      lowerQuery.includes('shields') ||
      lowerQuery.includes('equipos')
    ) {
      return this.getTeamStats(userId, tenantId, tournamentId);
    }

    if (
      lowerQuery.includes('cuántos') ||
      lowerQuery.includes('how many') ||
      lowerQuery.includes('total')
    ) {
      return this.getTotalStats(userId, tenantId, tournamentId);
    }

    return {
      found: false,
      stickers: [],
      message:
        'No pude entender tu pregunta. Intenta preguntar: "¿Tengo a Messi?", "¿Qué me falta?", o "¿Cuántos tengo?"',
    };
  }

  private async findPlayerInInventory(
    userId: string,
    tenantId: string,
    tournamentId: string,
    query: string
  ): Promise<StickerQueryResult> {
    // Extract player name from query
    const playerMatch = query.match(/(?:a |de |del )?([A-Za-záéíóúñÁÉÍÓÚÑ\s]+?)(?:\?|$)/);
    const playerName = playerMatch ? playerMatch[1].trim() : '';

    if (!playerName) {
      return {
        found: false,
        stickers: [],
        message:
          '¿De qué jugador quieres saber? Pregunta: "¿Tengo a Messi?" o "¿Tengo a Cristiano?"',
      };
    }

    const { data: stickers, error } = await this.supabase
      .from('stickers')
      .select(
        `
        id,
        number,
        player_name,
        country,
        card_type,
        rarity_level,
        sticker_inventory!left (
          quantity,
          user_id
        )
      `
      )
      .eq('tournament_id', tournamentId)
      .ilike('player_name', `%${playerName}%`);

    if (error) {
      console.error('Sticker query error:', error);
      return {
        found: false,
        stickers: [],
        message: 'Error consultando la base de datos',
      };
    }

    if (!stickers || stickers.length === 0) {
      return {
        found: false,
        stickers: [],
        message: `No encontré a "${playerName}" en la colección de Panini.`,
      };
    }

    const ownedCount = stickers.filter(
      (s: any) => s.sticker_inventory?.some((inv: any) => inv.user_id === userId)
    ).length;

    return {
      found: ownedCount > 0,
      stickers: stickers.map((s: any) => ({
        id: s.id,
        player_name: s.player_name,
        country: s.country,
        number: s.number,
        card_type: s.card_type,
        owned: s.sticker_inventory?.some((inv: any) => inv.user_id === userId) || false,
        quantity: s.sticker_inventory?.find((inv: any) => inv.user_id === userId)?.quantity || 0,
      })),
      message:
        ownedCount > 0
          ? `Tienes ${ownedCount} carta${ownedCount === 1 ? '' : 's'} de ${playerName}.`
          : `No tienes ninguna carta de ${playerName}. ¿Quieres agregar a tu lista de deseos?`,
    };
  }

  private async findMissingByTeam(
    userId: string,
    tenantId: string,
    tournamentId: string,
    query: string
  ): Promise<StickerQueryResult> {
    const teamMatch = query.match(/(?:de |del )?([A-Za-záéíóúñÁÉÍÓÚÑ\s]+?)(?:\?|$)/);
    const teamName = teamMatch ? teamMatch[1].trim() : '';

    if (!teamName) {
      return {
        found: false,
        stickers: [],
        message: '¿De qué equipo quieres saber? Pregunta: "¿Qué me falta de Argentina?"',
      };
    }

    const { data: stickers, error } = await this.supabase
      .from('stickers')
      .select(
        `
        id,
        number,
        player_name,
        country,
        card_type,
        rarity_level,
        sticker_inventory!left (
          quantity,
          user_id
        )
      `
      )
      .eq('tournament_id', tournamentId)
      .ilike('country', `%${teamName}%`);

    if (error || !stickers) {
      return {
        found: false,
        stickers: [],
        message: `No encontré el equipo "${teamName}" en la colección.`,
      };
    }

    const missing = stickers.filter(
      (s: any) => !s.sticker_inventory?.some((inv: any) => inv.user_id === userId)
    );

    return {
      found: missing.length < stickers.length,
      stickers: missing.slice(0, 5).map((s: any) => ({
        id: s.id,
        player_name: s.player_name,
        country: s.country,
        number: s.number,
        card_type: s.card_type,
        owned: false,
        quantity: 0,
      })),
      message:
        missing.length === 0
          ? `¡Completaste ${teamName}! 🎉`
          : `Te faltan ${missing.length} cartas de ${teamName}. Mostrando las primeras 5.`,
    };
  }

  private async getTeamStats(
    userId: string,
    tenantId: string,
    tournamentId: string
  ): Promise<StickerQueryResult> {
    const { data: teams, error } = (await this.supabase
      .from('stickers')
      .select(
        `
        country,
        sticker_inventory!left (
          user_id
        )
      `
      )
      .eq('tournament_id', tournamentId)) as any;

    if (error || !teams) {
      return {
        found: false,
        stickers: [],
        message: 'Error consultando equipos',
      };
    }

    const teamMap = new Map<
      string,
      { total: number; owned: number; country: string }
    >();

    teams.forEach((t: any) => {
      const country = t.country || 'Unknown';
      const current = teamMap.get(country) || {
        total: 0,
        owned: 0,
        country,
      };
      current.total += 1;
      if (t.sticker_inventory?.some((inv: any) => inv.user_id === userId)) {
        current.owned += 1;
      }
      teamMap.set(country, current);
    });

    const complete = Array.from(teamMap.values())
      .filter((t) => t.owned === t.total)
      .slice(0, 10);

    return {
      found: complete.length > 0,
      stickers: complete.map((t) => ({
        id: t.country,
        player_name: t.country,
        country: t.country,
        number: t.owned,
        card_type: 'team',
        owned: true,
        quantity: t.owned,
      })),
      message:
        complete.length > 0
          ? `Completaste ${complete.length} equipo${complete.length === 1 ? '' : 's'}: ${complete.map((t) => t.country).join(', ')}`
          : 'Aún no completaste ningún equipo. ¡Sigue coleccionando!',
    };
  }

  private async getTotalStats(
    userId: string,
    tenantId: string,
    tournamentId: string
  ): Promise<StickerQueryResult> {
    const { count: totalCount } = await this.supabase
      .from('stickers')
      .select('*', { count: 'exact' })
      .eq('tournament_id', tournamentId);

    const { data: owned } = await this.supabase
      .from('sticker_inventory')
      .select('sticker_id')
      .eq('user_id', userId)
      .in(
        'sticker_id',
        (
          await this.supabase
            .from('stickers')
            .select('id')
            .eq('tournament_id', tournamentId)
        ).data?.map((s: any) => s.id) || []
      );

    const total = totalCount || 0;
    const ownedCount = owned?.length || 0;
    const percent = total > 0 ? Math.round((ownedCount / total) * 100) : 0;

    return {
      found: ownedCount > 0,
      stickers: [],
      message: `Tienes **${ownedCount}/${total}** cartas (${percent}% completo). Te faltan ${total - ownedCount} para terminar.`,
    };
  }

  async findMissing(
    userId: string,
    tournamentId: string,
    limit = 10
  ): Promise<MissingSticker[]> {
    const { data: allStickers } = await this.supabase
      .from('stickers')
      .select('id')
      .eq('tournament_id', tournamentId);

    if (!allStickers) return [];

    const stickerIds = allStickers.map((s: any) => s.id);

    const { data: ownedIds } = await this.supabase
      .from('sticker_inventory')
      .select('sticker_id')
      .eq('user_id', userId)
      .in('sticker_id', stickerIds);

    const ownedSet = new Set(ownedIds?.map((o: any) => o.sticker_id) || []);
    const missingIds = stickerIds.filter((id: string) => !ownedSet.has(id));

    const { data: missing } = await this.supabase
      .from('stickers')
      .select(
        `
        id,
        number,
        player_name,
        country,
        rarity_level,
        sticker_marketplace_listings (
          price,
          shipping_cost,
          marketplace
        )
      `
      )
      .in('id', missingIds.slice(0, limit));

    return (
      missing?.map((s: any) => ({
        id: s.id,
        number: s.number,
        player_name: s.player_name,
        country: s.country,
        rarity_level: s.rarity_level,
        cheapest_price: s.sticker_marketplace_listings?.[0]?.price,
        marketplace: s.sticker_marketplace_listings?.[0]?.marketplace,
      })) || []
    );
  }

  async getCollectionStats(
    userId: string,
    tournamentId: string
  ): Promise<CollectionStats> {
    const { count: totalCount } = await this.supabase
      .from('stickers')
      .select('*', { count: 'exact' })
      .eq('tournament_id', tournamentId);

    const { count: ownedCount } = await this.supabase
      .from('sticker_inventory')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .in(
        'sticker_id',
        (
          await this.supabase
            .from('stickers')
            .select('id')
            .eq('tournament_id', tournamentId)
        ).data?.map((s: any) => s.id) || []
      );

    const total = totalCount || 0;
    const owned = ownedCount || 0;

    return {
      total_cards: total,
      owned_cards: owned,
      percent_complete: total > 0 ? (owned / total) * 100 : 0,
      missing_cards: total - owned,
    };
  }
}
