import { createClient } from '@supabase/supabase-js';

interface OcrExtractionResult {
  player_name?: string;
  country?: string;
  jersey_number?: number;
  card_number?: number;
  rarity_indicators?: string[];
  confidence: number;
}

interface StickerScanResult {
  matches: Array<{
    id: string;
    number: number;
    player_name: string;
    country: string;
    card_type: string;
    confidence: number;
  }>;
  confidence: number;
  primary_match: {
    id: string;
    number: number;
    player_name: string;
    country: string;
    card_type: string;
    confidence: number;
  } | null;
  extracted_metadata: OcrExtractionResult;
  message: string;
}

export class StickerOCRService {
  private supabase: any;
  private openaiApiKey: string;

  constructor(supabaseUrl: string, supabaseKey: string, openaiApiKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openaiApiKey = openaiApiKey;
  }

  async scanSticker(
    imageBuffer: Buffer,
    tournamentId: string,
    tenantId: string
  ): Promise<StickerScanResult> {
    // Extract metadata from image using vision API
    const metadata = await this.extractMetadataFromImage(imageBuffer);

    // Search Supabase for matching stickers
    const matches = await this.findMatches(metadata, tournamentId);

    // Rank by confidence
    const ranked = this.rankMatches(metadata, matches);

    return {
      matches: ranked,
      confidence: ranked[0]?.confidence || 0,
      primary_match: ranked[0] || null,
      extracted_metadata: metadata,
      message:
        ranked.length > 0
          ? `Encontré ${ranked.length} estampa${ranked.length === 1 ? '' : 's'} posible${ranked.length === 1 ? '' : 's'}. Mejor coincidencia: ${ranked[0]?.player_name || 'Desconocido'}`
          : 'No pude identificar esta estampa. ¿Puedes tomarla de mejor ángulo?',
    };
  }

  private async extractMetadataFromImage(
    imageBuffer: Buffer
  ): Promise<OcrExtractionResult> {
    // For now, return mock extraction
    // In production, call OpenAI Vision API or Google Cloud Vision

    const base64Image = imageBuffer.toString('base64');
    const mimeType = this.detectImageMimeType(imageBuffer);

    try {
      // Mock extraction for MVP
      // Real implementation would use OpenAI Vision API
      const extraction = await this.mockVisionExtraction(base64Image);
      return extraction;
    } catch (error) {
      console.error('Vision API error:', error);
      return {
        player_name: 'Unknown',
        country: 'Unknown',
        confidence: 0,
      };
    }
  }

  private async mockVisionExtraction(
    base64Image: string
  ): Promise<OcrExtractionResult> {
    // This is a placeholder for actual OpenAI Vision integration
    // In real implementation, call OpenAI's GPT-4V endpoint

    return {
      player_name: 'Pending OCR',
      country: 'Unknown',
      jersey_number: undefined,
      card_number: undefined,
      rarity_indicators: [],
      confidence: 0.3,
    };
  }

  private detectImageMimeType(buffer: Buffer): string {
    // Check magic bytes
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return 'image/jpeg';
    }
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }
    return 'image/jpeg';
  }

  private async findMatches(
    metadata: OcrExtractionResult,
    tournamentId: string
  ): Promise<any[]> {
    const filters: any = { tournament_id: tournamentId };

    if (metadata.player_name && metadata.player_name !== 'Unknown') {
      filters.player_name = `ilike.%${metadata.player_name}%`;
    }

    if (metadata.card_number) {
      filters.number = `eq.${metadata.card_number}`;
    }

    if (metadata.country && metadata.country !== 'Unknown') {
      filters.country = `ilike.%${metadata.country}%`;
    }

    const { data: stickers, error } = await this.supabase
      .from('stickers')
      .select('*')
      .eq(filters.tournament_id ? 'tournament_id' : 'id', tournamentId)
      .limit(10);

    if (error) {
      console.error('Sticker search error:', error);
      return [];
    }

    return stickers || [];
  }

  private rankMatches(
    metadata: OcrExtractionResult,
    matches: any[]
  ): Array<{
    id: string;
    number: number;
    player_name: string;
    country: string;
    card_type: string;
    confidence: number;
  }> {
    if (!matches || matches.length === 0) {
      return [];
    }

    const scored = matches.map((sticker: any) => {
      let score = metadata.confidence * 100;

      // Boost confidence if player name matches
      if (
        metadata.player_name &&
        sticker.player_name &&
        sticker.player_name.toLowerCase().includes(metadata.player_name.toLowerCase())
      ) {
        score += 25;
      }

      // Boost confidence if country matches
      if (
        metadata.country &&
        sticker.country &&
        sticker.country.toLowerCase().includes(metadata.country.toLowerCase())
      ) {
        score += 15;
      }

      // Boost confidence if card number matches exactly
      if (metadata.card_number && sticker.number === metadata.card_number) {
        score += 40;
      }

      return {
        id: sticker.id,
        number: sticker.number,
        player_name: sticker.player_name || 'Unknown',
        country: sticker.country || 'Unknown',
        card_type: sticker.card_type || 'player',
        confidence: Math.min(score / 100, 1.0),
      };
    });

    return scored.sort((a, b) => b.confidence - a.confidence);
  }

  async confirmMatch(
    userId: string,
    stickerId: string,
    condition: string,
    tenantId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await this.supabase
        .from('sticker_inventory')
        .insert({
          user_id: userId,
          sticker_id: stickerId,
          tenant_id: tenantId,
          condition,
          source: 'scanned',
          acquired_date: new Date().toISOString(),
          quantity: 1,
        } as any);

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation, increment quantity
          const { data: existing } = (await this.supabase
            .from('sticker_inventory')
            .select('quantity')
            .eq('sticker_id', stickerId)
            .eq('user_id', userId)
            .single()) as any;

          if (existing) {
            const newQty = (existing as any).quantity + 1;
            await (this.supabase
              .from('sticker_inventory')
              .update({ quantity: newQty } as any)
              .eq('sticker_id', stickerId)
              .eq('user_id', userId) as any);
          }

          return {
            success: true,
            message: 'Estampa duplicada agregada a tu colección',
          };
        }

        throw error;
      }

      return {
        success: true,
        message: '¡Estampa agregada a tu colección! 🎉',
      };
    } catch (error) {
      console.error('Confirm match error:', error);
      return {
        success: false,
        message: 'Error al agregar estampa',
      };
    }
  }
}
