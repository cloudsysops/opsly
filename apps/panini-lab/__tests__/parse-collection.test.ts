import { describe, expect, it } from 'vitest';
import { parseCollectionUpdatesFromUtterance } from '../lib/parse-collection';

describe('parseCollectionUpdatesFromUtterance', () => {
  it('extracts sticker numbers and duplicate status', () => {
    const updates = parseCollectionUpdatesFromUtterance(
      'Tengo la figurita 45 repetida y la 12 nueva',
    );
    expect(updates).toEqual(
      expect.arrayContaining([
        { stickerNumber: 45, status: 'duplicate' },
        { stickerNumber: 12, status: 'owned' },
      ]),
    );
  });

  it('returns empty when no numbers', () => {
    expect(parseCollectionUpdatesFromUtterance('hola mundo')).toEqual([]);
  });
});
