import type { LoreNote } from '../types.js';

export const CANONICAL_LORE: LoreNote[] = [
  {
    id: 'nexus-is-unfinished',
    title: 'The Nexus is unfinished',
    summary:
      'The Nexus connects worlds. It is a tool and a mystery, not a god and not a complete encyclopedia.',
    fictionVsScience: 'fiction',
    relatedCharacterIds: ['echo', 'traveler', 'nova'],
    relatedWorldIds: ['nexus', 'unknown'],
  },
  {
    id: 'how-vs-why',
    title: 'How versus why',
    summary:
      'Lyra’s law: science explains how; curiosity discovers why. Educational episodes must not collapse the two.',
    fictionVsScience: 'science',
    relatedCharacterIds: ['lyra', 'nova', 'kai'],
    relatedWorldIds: ['lab', 'earth'],
  },
  {
    id: 'myth-is-not-a-paper',
    title: 'Myth is not a paper',
    summary:
      'Maya may use symbol, mythology, and philosophy. When the content is educational, fiction and science stay labeled and separate. Spirituality, numerology, and sacred geometry are not demonstrated science.',
    fictionVsScience: 'mixed-must-separate',
    relatedCharacterIds: ['maya', 'lyra'],
    relatedWorldIds: ['wild', 'origins', 'lab'],
  },
  {
    id: 'traveler-is-still-seeking',
    title: 'The Traveler is still seeking',
    summary: 'Mentorship does not require omniscience. The Traveler keeps walking with an incomplete map.',
    fictionVsScience: 'fiction',
    relatedCharacterIds: ['traveler', 'nova', 'kai'],
    relatedWorldIds: ['nexus', 'unknown'],
  },
  {
    id: 'astral-arena-nexus-realm',
    title: 'Astral Arena is a Nexus realm',
    summary:
      'Astral Arena is a fictional family adventure realm of the wider Nexus. Arena and Brissa repair connections between worlds rather than conquering them.',
    fictionVsScience: 'fiction',
    relatedCharacterIds: ['arena', 'brissa', 'nx-7', 'altair'],
    relatedWorldIds: ['astral-arena', 'nexus'],
  },
  {
    id: 'astral-dragons-are-conscious',
    title: 'Astral Dragons are guardians, never property',
    summary:
      'Astral Dragons are conscious living guardians tied to Nexus Currents. They may choose alliances but are never pets, owned mounts, or weapons.',
    fictionVsScience: 'fiction',
    relatedCharacterIds: ['asterion', 'pyra', 'nebryx', 'umbriel'],
    relatedWorldIds: ['astral-arena'],
  },
  {
    id: 'winged-ascension-is-cosmic',
    title: 'Winged Ascension is cosmic, not religious',
    summary:
      'Winged Ascension manifests angel-like wings as a fictional Nexus energy response symbolizing protection, freedom, and cooperation. It does not make theological claims.',
    fictionVsScience: 'fiction',
    relatedCharacterIds: ['arena', 'brissa', 'orion-shepherd', 'aurora-unicorn', 'nx-7'],
    relatedWorldIds: ['astral-arena'],
  },
  {
    id: 'umbra-last-memory-thread',
    title: 'The last thread of Umbra',
    summary:
      'The Season 1 resolution favors restoration over destruction: Umbriel helps reveal the last memory-thread connecting Señor Sombra to the Guardian Umbra once was.',
    fictionVsScience: 'fiction',
    relatedCharacterIds: ['umbra', 'umbriel', 'arena', 'brissa', 'altair'],
    relatedWorldIds: ['astral-arena'],
  },
];
