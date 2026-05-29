import { createClient } from '@supabase/supabase-js';

interface MarketplaceListing {
  id: string;
  marketplace: string;
  seller_id?: string;
  price: number;
  currency: string;
  shipping_cost: number;
  total_price: number;
  condition: string;
  seller_rating?: number;
  listing_url?: string;
  in_stock: boolean;
  expires_at?: string;
}

interface SearchResult {
  sticker_id: string;
  listings: MarketplaceListing[];
  cheapest: MarketplaceListing | null;
  message: string;
}

export class MarketplaceService {
  private supabase: any;
  private mercadolibreAccessToken: string;

  constructor(supabaseUrl: string, supabaseKey: string, mercadolibreAccessToken: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.mercadolibreAccessToken = mercadolibreAccessToken;
  }

  async searchSticker(stickerId: string): Promise<SearchResult> {
    // Get sticker details
    const { data: sticker } = (await this.supabase
      .from('stickers')
      .select('*')
      .eq('id', stickerId)
      .single()) as any;

    if (!sticker) {
      return {
        sticker_id: stickerId,
        listings: [],
        cheapest: null,
        message: 'Estampa no encontrada',
      };
    }

    // Check database cache first
    const { data: cached } = (await this.supabase
      .from('sticker_marketplace_listings')
      .select('*')
      .eq('sticker_id', stickerId)
      .gt('expires_at', new Date().toISOString())
      .order('price', { ascending: true })
      .limit(20)) as any;

    if (cached && cached.length > 0) {
      const cheapest = this.formatListing(cached[0]);
      return {
        sticker_id: stickerId,
        listings: (cached as any[]).map((c: any) => this.formatListing(c)),
        cheapest,
        message: `Encontré ${cached.length} oferta${cached.length === 1 ? '' : 's'} para "${sticker.player_name || 'esta estampa'}"`,
      };
    }

    // Search live (would call MercadoLibre API)
    // For MVP, return cached results or mock
    const mockResults = await this.generateMockListings(sticker as any);

    const stickerName = sticker ? sticker.player_name || 'esta estampa' : 'esta estampa';
    return {
      sticker_id: stickerId,
      listings: mockResults,
      cheapest: mockResults[0] || null,
      message: `Buscando precios de "${stickerName}" en MercadoLibre y otros sitios...`,
    };
  }

  private formatListing(listing: any): MarketplaceListing {
    const shippingCost = listing.shipping_cost || 0;
    const totalPrice = listing.price + shippingCost;

    return {
      id: listing.id,
      marketplace: listing.marketplace,
      seller_id: listing.seller_id,
      price: listing.price,
      currency: listing.currency || 'ARS',
      shipping_cost: shippingCost,
      total_price: totalPrice,
      condition: listing.condition || 'unknown',
      seller_rating: listing.seller_rating,
      listing_url: listing.listing_url,
      in_stock: listing.in_stock,
      expires_at: listing.expires_at,
    };
  }

  private async generateMockListings(sticker: any): Promise<MarketplaceListing[]> {
    // For MVP development, generate mock listings
    // Real implementation would call MercadoLibre API
    const basePrice = Math.random() * 500 + 50; // $50-$550

    return [
      {
        id: 'ml-' + sticker.id.slice(0, 8),
        marketplace: 'mercadolibre',
        price: basePrice,
        currency: 'ARS',
        shipping_cost: Math.random() * 100 + 20,
        total_price: basePrice + 50,
        condition: 'usado',
        seller_rating: Math.random() * 2 + 4.5,
        listing_url: `https://mercadolibre.com.ar/search?q=${encodeURIComponent(sticker.player_name || '')}`,
        in_stock: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ebay-' + sticker.id.slice(0, 8),
        marketplace: 'ebay',
        price: basePrice * 1.2,
        currency: 'ARS',
        shipping_cost: Math.random() * 80 + 30,
        total_price: basePrice * 1.2 + 50,
        condition: 'mint',
        seller_rating: Math.random() * 2 + 4,
        listing_url: `https://ebay.com/sch/i.html?_nkw=${encodeURIComponent(sticker.player_name || '')}`,
        in_stock: Math.random() > 0.3,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'fb-' + sticker.id.slice(0, 8),
        marketplace: 'facebook',
        price: basePrice * 0.9,
        currency: 'ARS',
        shipping_cost: Math.random() * 120 + 40,
        total_price: basePrice * 0.9 + 80,
        condition: 'near_mint',
        seller_rating: Math.random() * 2 + 3.5,
        listing_url: '#',
        in_stock: Math.random() > 0.2,
        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ].filter((l) => l.in_stock);
  }

  async addToWishlist(
    userId: string,
    stickerId: string,
    maxPrice: number | null,
    tenantId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data: sticker } = await this.supabase
        .from('stickers')
        .select('player_name')
        .eq('id', stickerId)
        .single();

      if (!sticker) {
        return { success: false, message: 'Estampa no encontrada' };
      }

      const { error } = await this.supabase
        .from('sticker_wishlist')
        .insert({
          user_id: userId,
          sticker_id: stickerId,
          tenant_id: tenantId,
          max_price: maxPrice,
        } as any);

      if (error) {
        if (error.code === '23505') {
          return { success: false, message: 'Ya está en tu lista de deseos' };
        }
        throw error;
      }

      return {
        success: true,
        message: `${sticker.player_name} agregado a tu lista de deseos`,
      };
    } catch (error) {
      console.error('Wishlist error:', error);
      return { success: false, message: 'Error al agregar a deseos' };
    }
  }

  async getPriceHistory(stickerId: string, days = 30): Promise<any[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: history } = await this.supabase
      .from('sticker_marketplace_listings')
      .select('price, marketplace, scraped_at')
      .eq('sticker_id', stickerId)
      .gte('scraped_at', since.toISOString())
      .order('scraped_at', { ascending: true });

    return history || [];
  }

  async getWishlist(
    userId: string,
    tenantId: string
  ): Promise<
    Array<{
      id: string;
      player_name: string;
      country: string;
      price: number;
      marketplace: string;
      max_price?: number;
    }>
  > {
    const { data: wishlist } = await this.supabase
      .from('sticker_wishlist')
      .select(
        `
        id,
        max_price,
        stickers (
          id,
          player_name,
          country,
          sticker_marketplace_listings (price, marketplace)
        )
      `
      )
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('priority', { ascending: true });

    return (
      wishlist?.map((w: any) => ({
        id: w.id,
        player_name: w.stickers?.player_name || 'Unknown',
        country: w.stickers?.country || 'Unknown',
        price: w.stickers?.sticker_marketplace_listings?.[0]?.price || 0,
        marketplace: w.stickers?.sticker_marketplace_listings?.[0]?.marketplace || 'N/A',
        max_price: w.max_price,
      })) || []
    );
  }

  async removeFromWishlist(
    userId: string,
    wishlistId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await this.supabase
        .from('sticker_wishlist')
        .delete()
        .eq('id', wishlistId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Removed from wishlist',
      };
    } catch (error) {
      console.error('Remove wishlist error:', error);
      return {
        success: false,
        message: 'Error removing from wishlist',
      };
    }
  }
}
