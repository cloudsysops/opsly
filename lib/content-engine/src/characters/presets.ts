import type { CharacterProfile, NovaCustomization, NovaVariant } from './types.js';

export const THE_TRAVELER: CharacterProfile = {
  id: 'the-traveler',
  name: 'The Traveler',
  channels: ['opsly-universe'],
  traits: ['hidden face', 'hooded', 'human/cyborg', 'builder', 'dreamer', 'wanderer'],
  colorPalette: ['#241B4E', '#5A2CA0', '#D4AF37'],
  description:
    'Hooded figure of ambiguous human/cyborg nature, in blue/violet/gold, with its own geometric visual ' +
    'language. Wanders and builds across the Parallel Path storyline.',
};

export const NOVA_BASE: CharacterProfile = {
  id: 'nova',
  name: 'NØVA',
  channels: ['opsly-universe'],
  traits: ['same silhouette across variants', 'same eyes', 'same core', 'recognizable identity'],
  colorPalette: ['#5A2CA0', '#00E5FF', '#D4AF37'],
  description:
    'Companion entity that supports multiple visual variants (aquatic, explorer, builder, science, cyber, ' +
    'ancestral-tech) while keeping a consistent silhouette, eyes, and core so it stays recognizable.',
};

export const WAVO: CharacterProfile = {
  id: 'wavo',
  name: 'WAVO',
  channels: ['splashitos'],
  traits: ['swimming', 'water safety', 'friendly', 'confident'],
  colorPalette: ['#1FC2C2', '#0A5C63', '#FFD166'],
  description: 'Splashitos/Peskids channel mascot — swimming and water-safety focused.',
  continuityNote: 'Do not mix visually with NØVA except in explicit crossover episodes.',
};

export const CHARACTER_PROFILES: CharacterProfile[] = [THE_TRAVELER, NOVA_BASE, WAVO];

/** Example NovaCustomization presets — one per variant — seeding future "build your own NØVA" UI. */
export const NOVA_VARIANT_PRESETS: Record<NovaVariant, NovaCustomization> = {
  base: {
    baseModel: 'base',
    primaryColor: '#5A2CA0',
    secondaryColor: '#00E5FF',
    eyes: 'twin cyan dots',
    headAccessory: 'none',
    outfit: 'smooth core shell',
    tool: 'none',
    ability: 'light-trail navigation',
    symbol: 'nova-core-glyph',
    personalityTrait: 'curious',
  },
  aquatic: {
    baseModel: 'aquatic',
    primaryColor: '#1FC2C2',
    secondaryColor: '#0A5C63',
    eyes: 'twin cyan dots',
    headAccessory: 'fin crest',
    outfit: 'sleek hydrodynamic shell',
    tool: 'sonar pulse',
    ability: 'underwater light-trail navigation',
    symbol: 'wave-core-glyph',
    personalityTrait: 'calm',
  },
  explorer: {
    baseModel: 'explorer',
    primaryColor: '#D4AF37',
    secondaryColor: '#5A2CA0',
    eyes: 'twin cyan dots',
    headAccessory: 'scanner visor',
    outfit: 'weathered travel plating',
    tool: 'compass core',
    ability: 'terrain mapping',
    symbol: 'path-core-glyph',
    personalityTrait: 'adventurous',
  },
  builder: {
    baseModel: 'builder',
    primaryColor: '#5A2CA0',
    secondaryColor: '#D4AF37',
    eyes: 'twin cyan dots',
    headAccessory: 'tool rig',
    outfit: 'reinforced construction shell',
    tool: 'geometry forge',
    ability: 'structure generation',
    symbol: 'build-core-glyph',
    personalityTrait: 'methodical',
  },
  science: {
    baseModel: 'science',
    primaryColor: '#00E5FF',
    secondaryColor: '#241B4E',
    eyes: 'twin cyan dots',
    headAccessory: 'data lens',
    outfit: 'lab-clean shell',
    tool: 'analysis core',
    ability: 'pattern recognition',
    symbol: 'data-core-glyph',
    personalityTrait: 'analytical',
  },
  cyber: {
    baseModel: 'cyber',
    primaryColor: '#00E5FF',
    secondaryColor: '#5A2CA0',
    eyes: 'twin cyan dots',
    headAccessory: 'signal antenna',
    outfit: 'circuit-lined shell',
    tool: 'network thread',
    ability: 'connection tracing',
    symbol: 'signal-core-glyph',
    personalityTrait: 'quick',
  },
  'ancestral-tech': {
    baseModel: 'ancestral-tech',
    primaryColor: '#D4AF37',
    secondaryColor: '#241B4E',
    eyes: 'twin cyan dots',
    headAccessory: 'etched crown',
    outfit: 'engraved ancient-tech shell',
    tool: 'origin key',
    ability: 'memory resonance',
    symbol: 'origin-core-glyph',
    personalityTrait: 'wise',
  },
};
