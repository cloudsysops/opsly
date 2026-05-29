import { describe, expect, it } from 'vitest';
import { parseCollectionUpdatesFromUtterance } from '../lib/parse-collection';

describe('parseCollectionUpdatesFromUtterance', () => {
  it('extracts sticker numbers and duplicate status', () => {
    const updates = parseCollectionUpdatesFromUtterance(
      'Tengo la figurita 45 repetida y la 12 nueva',
    );
    expect(updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stickerNumber: 45, status: 'duplicate' }),
        expect.objectContaining({ stickerNumber: 12, status: 'owned' }),
      ]),
    );
  });

  it('returns empty when no numbers', () => {
    expect(parseCollectionUpdatesFromUtterance('hola mundo')).toEqual([]);
  });

  it('extracts country from "de País" pattern', () => {
    const updates = parseCollectionUpdatesFromUtterance('Tengo la 10 de Colombia');
    expect(updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stickerNumber: 10, status: 'owned', country: 'Colombia' }),
      ]),
    );
  });

  it('handles multi-segment with different countries', () => {
    const updates = parseCollectionUpdatesFromUtterance(
      'la 5 de Argentina y la 30 de Brasil repetida',
    );
    expect(updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stickerNumber: 5, country: 'Argentina' }),
        expect.objectContaining({ stickerNumber: 30, status: 'duplicate', country: 'Brasil' }),
      ]),
    );
  });
});
