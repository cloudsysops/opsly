import { describe, it, expect } from 'vitest';
import {
  generateHashtags,
  getNextPublishTime,
  pickRandom,
  FAMOUS_STREAMERS,
  OPSLY_THEMES,
  PROMPT_TEMPLATES,
} from '../generate-reel.mjs';

describe('Social Media Automation — Unit Tests', () => {
  describe('generateHashtags', () => {
    it('includes base hashtags for Spanish', () => {
      const tags = generateHashtags('multi-tenant architecture', 'es', 'Ibai Llanos');
      expect(tags).toContain('#Opsly');
      expect(tags).toContain('#DevOps');
      expect(tags).toContain('#DevOpsEs');
      expect(tags).toContain('#IbaiLlanos');
      expect(tags).toContain('#multi-tenant');
    });

    it('includes English-specific hashtags', () => {
      const tags = generateHashtags('cloud scalability', 'en', 'Pokimane');
      expect(tags).toContain('#DevOpsLife');
      expect(tags).toContain('#CloudNative');
      expect(tags).toContain('#Pokimane');
      expect(tags).toContain('#cloud');
    });

    it('strips spaces from streamer name in hashtag', () => {
      const tags = generateHashtags('DevOps automation', 'es', 'Ibai Llanos');
      expect(tags).toContain('#IbaiLlanos');
      expect(tags.some((t) => t.includes(' '))).toBe(false);
    });

    it('returns at least 8 hashtags', () => {
      const tags = generateHashtags('API-first design', 'en', 'Valkyrae');
      expect(tags.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('getNextPublishTime', () => {
    it('returns an ISO string', () => {
      const time = getNextPublishTime();
      expect(time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('is in the future', () => {
      const time = new Date(getNextPublishTime());
      expect(time.getTime()).toBeGreaterThan(Date.now());
    });

    it('is set to 09:00 hours', () => {
      const time = new Date(getNextPublishTime());
      expect(time.getHours()).toBe(9);
      expect(time.getMinutes()).toBe(0);
    });
  });

  describe('pickRandom', () => {
    it('returns an element from the array', () => {
      const arr = ['a', 'b', 'c'];
      const result = pickRandom(arr);
      expect(arr).toContain(result);
    });

    it('works with FAMOUS_STREAMERS', () => {
      const streamer = pickRandom(FAMOUS_STREAMERS);
      expect(streamer).toHaveProperty('name');
      expect(streamer).toHaveProperty('platform');
    });
  });

  describe('data constants', () => {
    it('has at least 5 streamers', () => {
      expect(FAMOUS_STREAMERS.length).toBeGreaterThanOrEqual(5);
    });

    it('has at least 5 themes', () => {
      expect(OPSLY_THEMES.length).toBeGreaterThanOrEqual(5);
    });

    it('has 3 prompt templates', () => {
      expect(Object.keys(PROMPT_TEMPLATES)).toHaveLength(3);
    });

    it('prompt templates contain placeholders', () => {
      for (const tmpl of Object.values(PROMPT_TEMPLATES)) {
        expect(tmpl).toContain('{opsly_theme}');
        expect(tmpl).toContain('{language}');
      }
    });
  });
});
