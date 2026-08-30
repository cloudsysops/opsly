import { getCharacter, listCharacters, type UniverseCharacter } from '@intcloudsysops/universe';
import type { ContentChannel } from '../domain/types.js';
import type { CharacterProfile, NovaCustomization, NovaVariant } from './types.js';

function engineChannels(character: UniverseCharacter): ContentChannel[] {
  const channels = new Set<ContentChannel>();
  for (const channel of character.content.channels) {
    if (channel === 'bitsitos' || channel === 'splashitos' || channel === 'opsly-universe') {
      channels.add(channel);
    }
    if (channel === 'peskids') channels.add('splashitos');
  }
  if (channels.size === 0) channels.add('opsly-universe');
  return [...channels];
}

function profileFromUniverse(character: UniverseCharacter): CharacterProfile {
  return {
    id: character.id,
    name: character.name,
    channels: engineChannels(character),
    traits: character.personality.traits,
    colorPalette: [...character.visualIdentity.primaryPalette, ...character.visualIdentity.secondaryPalette],
    description: character.description,
    continuityNote: character.limitations[0],
  };
}

export const CHARACTER_PROFILES: CharacterProfile[] = listCharacters().map(profileFromUniverse);

export const THE_TRAVELER: CharacterProfile = profileFromUniverse(getCharacter('traveler'));
export const NOVA_BASE: CharacterProfile = profileFromUniverse(getCharacter('nova'));
export const WAVO: CharacterProfile = profileFromUniverse(getCharacter('wavo'));

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
