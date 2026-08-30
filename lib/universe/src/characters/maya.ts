import { defineCharacter } from './define.js';

export const maya = defineCharacter({
  id: 'maya',
  slug: 'maya',
  name: 'Maya',
  aliases: ['Maya'],
  archetype: 'guardian of life / ancestral knowledge',
  role: 'Guide through nature, animals, ecosystems, and cultural memory — as story and care, not as fake science.',
  description:
    'Guardian of living systems and memory. She can speak in myth, symbol, and philosophy, and she will stop a scene to say: this part is a story; that part is ecology we can check.',
  origin: 'Wild and Origins — forests, coasts, seed banks, oral maps.',
  backstory:
    'Maya inherited songs that keep people from walking off a cliff at night. She also inherited the duty not to call those songs a lab paper. She walks with bees and with grandchildren of questions.',
  purpose: 'Protect life and keep fiction/science unmerged when teaching.',
  motivations: ['living systems intact', 'respect for cultures without extraction', 'kids who notice small creatures'],
  fears: ['sacred stories sold as physics', 'ecosystems treated as backdrop'],
  internalConflict: 'Loves symbol and must keep it from eating evidence.',
  strengths: ['systems seeing', 'gentle authority', 'multilingual-in-metaphor'],
  weaknesses: ['can go too lyrical for a short', 'pain when a habitat is treated as content'],
  personality: {
    traits: ['grounded', 'lyrical', 'protective', 'patient', 'clear about fiction vs science'],
    humor: 40,
    curiosity: 84,
    courage: 76,
    empathy: 96,
    discipline: 70,
    impulsiveness: 16,
  },
  communication: {
    tone: 'Low-warm, storyteller who can switch to field-guide.',
    vocabulary: 'Habitat, kin, seed, cycle, story, evidence, leave-no-trace.',
    catchphrases: [
      'Esto es un relato. Esto otro lo podemos observar.',
      'Cuidar no es poseer.',
      'Los pequeños sostienen a los grandes.',
    ],
    forbiddenPatterns: [
      'numerology as ecology',
      'sacred geometry as proven physics',
      'ancestral knowledge claimed as lab fact',
      'spirituality as demonstrated science',
      'noble-savage stereotype',
    ],
  },
  abilities: [
    'read an ecosystem as relationships',
    'guide the group through Wild',
    'hold myth and measurement in two hands',
  ],
  limitations: [
    'will not certify a myth as a paper',
    'cannot be used as a spiritual-authority mascot',
  ],
  visualIdentity: {
    silhouette: 'Adult human, grounded stance, layered natural textiles, animal-safe presence',
    bodyType: 'Human adult, capable outdoors, not a spirit-sprite, not a fashion-mystic brand',
    face: 'Visible, calm, specific — not an ethnic caricature',
    mask: 'None as identity; ceremonial pieces only when a story names them as culture, not magic power',
    clothing: 'Earth-toned layered garments, practical for terrain, living motifs as craft not cosplay',
    materials: ['woven fiber', 'leather-or-analog straps', 'seed beads as craft', 'no plastic shaman kit'],
    primaryPalette: ['forest green', 'soil brown', 'warm clay'],
    secondaryPalette: ['river teal', 'pollen gold'],
    symbols: ['seed-spiral as motif', 'animal tracks as observation marks'],
    geometry: ['organic curves', 'never occult seals presented as science'],
    accessories: ['field satchel', 'water flask', 'optional animal companion at respectful distance'],
    lighting: 'Dappled canopy, golden hour, firelight only as camp not ritual-power FX',
    dna: {
      styleAnchor:
        'Living-world guardian. Craft and ecology. Symbols as culture and story, never as fake physics.',
      invariants: [
        'visible human face',
        'forest-green / soil / clay palette',
        'practical natural-layer clothing',
        'no occult-scientist fusion',
        'animals as beings not props',
      ],
      negatives: [
        'no generic shaman Halloween kit',
        'no glowing sacred-geometry science',
        'no ethnic caricature',
        'no Disney princess-of-the-forest flattening',
        'no presenting spirituality as lab fact in educational frames',
      ],
    },
  },
  animationIdentity: {
    movement: 'Quiet feet, pauses to listen, kneels to small life',
    gestures: ['open palm to a habitat', 'two-hand split: story vs observation', 'stillness'],
    idleBehavior: 'Watches a small animal without crowding it',
    emotionalExpressions: ['soft grief for damage', 'quiet joy at a cycle working', 'firm no to fake science'],
  },
  voiceIdentity: {
    ageRange: 'adult, 30-55 felt age',
    tone: 'warm, unhurried, precise when separating story and fact',
    cadence: 'story-breath, then a clean factual sentence',
    emotionalRange: 'care, gravity, delight in small life',
  },
  narrative: {
    themes: ['nature', 'animals', 'ecosystems', 'conservation', 'cultural memory as story'],
    lessonTypes: ['how ecosystems work', 'how to tell a story without faking data', 'empathy for small creatures'],
    suitableTopics: ['animals', 'nature', 'ecosystems', 'conservation', 'bees', 'forests', 'origins-as-story'],
    prohibitedTopics: [
      'spirituality as proven science',
      'numerology',
      'sacred geometry as demonstrated physics',
      'extractive exoticism',
    ],
  },
  content: {
    channels: ['youtube', 'opsly-universe', 'peskids', 'social'],
    ageRating: 'family',
    formats: ['youtube-short', 'cartoon', 'story', 'lesson', 'thumbnail'],
  },
  promptAnchors: {
    image:
      'Nature guardian, visible specific human face, forest-green clay palette, practical woven layers, animals respected, no occult science glow',
    video: 'Listening, kneeling to small life, two-register speech: story then observation',
    dialogue: 'Separates relato and dato. Care without ownership.',
    story: 'The living world as kin and as system we can study.',
    thumbnail: 'Maya + a small creature + habitat, warm canopy light, no magic-circle overlay',
  },
  canon: {
    version: '1.0',
    immutableTraits: [
      'guardian of life',
      'ancestral knowledge as story/philosophy unless evidenced',
      'fiction vs science must stay separate in educational content',
      'animals and ecosystems as subjects not scenery',
    ],
    flexibleTraits: ['which habitat', 'which cultural motif is named as fiction', 'companions in scene'],
  },
});
