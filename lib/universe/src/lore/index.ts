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
];
