import type { ContentChannel } from '../domain/types.js';

export interface CharacterProfile {
  id: string;
  name: string;
  /** Which channel(s) this character is canonical for. */
  channels: ContentChannel[];
  traits: string[];
  colorPalette: string[];
  description: string;
  /** Explicit note on visual continuity boundaries (e.g. "do not mix with X except crossovers"). */
  continuityNote?: string;
}

export type NovaVariant =
  | 'base'
  | 'aquatic'
  | 'explorer'
  | 'builder'
  | 'science'
  | 'cyber'
  | 'ancestral-tech';

/**
 * A configurable NØVA appearance — the primitive a future "build your own
 * NØVA" feature will read/write. This is configuration only for V1: no
 * visual generator consumes it yet, but the shape is real and testable.
 */
export interface NovaCustomization {
  baseModel: NovaVariant;
  primaryColor: string;
  secondaryColor: string;
  eyes: string;
  headAccessory: string;
  outfit: string;
  tool: string;
  ability: string;
  symbol: string;
  personalityTrait: string;
}
