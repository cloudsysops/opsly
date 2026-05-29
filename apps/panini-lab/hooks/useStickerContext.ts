'use client';

import { useState, useCallback } from 'react';

interface Sticker {
  id: string;
  player_name: string;
  country: string;
  number: number;
  rarity_level: string;
  card_type: string;
  image_url?: string;
}

export function useStickerContext() {
  const [inventory, setInventory] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(false);

  const queryInventory = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setInventory(data.stickers);
      return data;
    } catch (error) {
      console.error('Error querying inventory:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const addToInventory = useCallback(async (stickerId: string, condition: string = 'mint') => {
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sticker_id: stickerId, condition }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error adding to inventory:', error);
      return null;
    }
  }, []);

  const addToWishlist = useCallback(async (stickerId: string, maxPrice?: number) => {
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sticker_id: stickerId, max_price: maxPrice }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return null;
    }
  }, []);

  return {
    inventory,
    loading,
    queryInventory,
    addToInventory,
    addToWishlist,
  };
}
