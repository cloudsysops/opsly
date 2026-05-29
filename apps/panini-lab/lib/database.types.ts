export type Database = {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          year: number;
          country: string | null;
          total_stickers: number | null;
          total_cards: number;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          year: number;
          country?: string | null;
          total_stickers?: number | null;
          total_cards?: number;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          year?: number;
          country?: string | null;
          total_stickers?: number | null;
          total_cards?: number;
          image_url?: string | null;
          created_at?: string;
        };
      };
      stickers: {
        Row: {
          id: string;
          tenant_id: string;
          tournament_id: string;
          number: number;
          player_name: string | null;
          country: string | null;
          position: string | null;
          club_name: string | null;
          jersey_number: number | null;
          rarity_level: string | null;
          card_type: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          tournament_id: string;
          number: number;
          player_name?: string | null;
          country?: string | null;
          position?: string | null;
          club_name?: string | null;
          jersey_number?: number | null;
          rarity_level?: string | null;
          card_type?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          tournament_id?: string;
          number?: number;
          player_name?: string | null;
          country?: string | null;
          position?: string | null;
          club_name?: string | null;
          jersey_number?: number | null;
          rarity_level?: string | null;
          card_type?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
      };
      sticker_inventory: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          sticker_id: string;
          quantity: number;
          condition: string | null;
          acquired_date: string | null;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          sticker_id: string;
          quantity?: number;
          condition?: string | null;
          acquired_date?: string | null;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          sticker_id?: string;
          quantity?: number;
          condition?: string | null;
          acquired_date?: string | null;
          source?: string | null;
          created_at?: string;
        };
      };
      sticker_wishlist: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          sticker_id: string;
          priority: number | null;
          max_price: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          sticker_id: string;
          priority?: number | null;
          max_price?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          sticker_id?: string;
          priority?: number | null;
          max_price?: number | null;
          created_at?: string;
        };
      };
      sticker_marketplace_listings: {
        Row: {
          id: string;
          sticker_id: string;
          marketplace: string;
          seller_id: string | null;
          price: number;
          currency: string;
          listing_url: string | null;
          condition: string | null;
          shipping_cost: number | null;
          shipping_time_days: number | null;
          seller_rating: number | null;
          in_stock: boolean;
          scraped_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sticker_id: string;
          marketplace: string;
          seller_id?: string | null;
          price: number;
          currency?: string;
          listing_url?: string | null;
          condition?: string | null;
          shipping_cost?: number | null;
          shipping_time_days?: number | null;
          seller_rating?: number | null;
          in_stock?: boolean;
          scraped_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sticker_id?: string;
          marketplace?: string;
          seller_id?: string | null;
          price?: number;
          currency?: string;
          listing_url?: string | null;
          condition?: string | null;
          shipping_cost?: number | null;
          shipping_time_days?: number | null;
          seller_rating?: number | null;
          in_stock?: boolean;
          scraped_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
