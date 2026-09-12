import { describe, expect, it } from 'vitest';
import {
  buildShlinkAttributionRequest,
  normalizeChangeDetectionEvent,
  normalizeMedusaProduct,
  shouldCreateDealOpportunity,
} from '../src/index';

describe('normalizeMedusaProduct', () => {
  it('normalizes price, inventory and discount', () => {
    const result = normalizeMedusaProduct({
      id: 'prod_1',
      title: 'Gaming Laptop',
      status: 'published',
      thumbnail: 'https://example.com/laptop.jpg',
      variants: [
        {
          id: 'var_1',
          inventory_quantity: 4,
          calculated_price: {
            calculated_amount: 119900,
            original_amount: 149900,
            currency_code: 'usd',
          },
        },
      ],
    });

    expect(result.price).toEqual({ amount: 1199, currency: 'USD' });
    expect(result.compareAtPrice).toEqual({ amount: 1499, currency: 'USD' });
    expect(result.discountPercent).toBeCloseTo(20.01, 2);
    expect(result.inventoryState).toBe('in_stock');
  });
});

describe('normalizeChangeDetectionEvent', () => {
  it('recognizes price drops', () => {
    const event = normalizeChangeDetectionEvent({
      uuid: 'watch-1',
      url: 'https://merchant.example/item',
      old_value: 799,
      new_value: 699,
      currency: 'USD',
    });
    expect(event.eventType).toBe('price_drop');
    expect(shouldCreateDealOpportunity(event).eligible).toBe(true);
  });

  it('recognizes restocks', () => {
    const event = normalizeChangeDetectionEvent({
      watch_id: 'watch-2',
      target_url: 'https://merchant.example/item',
      previous_value: 'Out of stock',
      current_value: 'In stock',
    });
    expect(event.eventType).toBe('restock');
  });
});

describe('buildShlinkAttributionRequest', () => {
  it('creates deterministic attribution tags without embedding secrets', () => {
    expect(
      buildShlinkAttributionRequest({
        longUrl: 'https://merchant.example/product',
        tenantSlug: 'intcloudsysops',
        attributionKey: 'attr-123',
        campaign: 'laptop-deals',
        offerRef: 'offer-1',
        partnerRef: 'partner-1',
        agentTaskRequestId: 'task-1',
      }),
    ).toMatchObject({
      tags: [
        'tenant:intcloudsysops',
        'campaign:laptop-deals',
        'offer:offer-1',
        'partner:partner-1',
      ],
      metadata: {
        attributionKey: 'attr-123',
        agentTaskRequestId: 'task-1',
      },
    });
  });

  it('rejects non-http destinations', () => {
    expect(() =>
      buildShlinkAttributionRequest({
        longUrl: 'javascript:alert(1)',
        tenantSlug: 'intcloudsysops',
        attributionKey: 'x',
      }),
    ).toThrow(/absolute http/);
  });
});
