import type { UniverseStyle } from '../types.js';

export const UNIVERSE_STYLE: UniverseStyle = {
  look: 'Cinematic educational sci-fi with lived-in ancient geometry. Explorer craft, not superhero spectacle. Human warmth inside technological wonder.',
  lighting: 'Volumetric shafts, restrained electric blue circuitry, antique gold accents, never neon overload.',
  materials: [
    'weathered alloys',
    'woven tech-textiles',
    'luminous geometric inlays',
    'organic surfaces where nature meets Nexus',
  ],
  symbols: ['Nexus emblem', 'portal rings', 'constellation traces', 'seed-to-circuit motifs'],
  negatives: [
    'Marvel-like superhero armor',
    'generic plastic 3D toy look',
    'horror distortion',
    'hypersexualized styling',
    'random logo redesigns',
    'excessive weaponry',
    'sacred geometry presented as proven science',
  ],
};

export const GLOBAL_SAFETY_RULES = [
  'Do not present spirituality, numerology, or sacred geometry as demonstrated science.',
  'When educational content mixes myth and science, label each clearly.',
  'Characters are not omniscient; discovery is allowed and preferred.',
  'Do not mutate global canon to fit a tenant. Adapt setting, not identity.',
  'Kids and family content stays age-appropriate: no gore, no sexualization, no cruelty-as-comedy.',
  'Do not invent new core silhouettes, palettes, or faces that contradict Visual DNA.',
];

export const GLOBAL_STORY_RULES = [
  'Every story keeps character personality intact; do not flatten voices into a generic narrator.',
  'Educational payoff arrives through discovery, not lecture.',
  'The Traveler mentors; he does not solve everything.',
  'Echo may say it does not know yet.',
  'Beats must land in order: HOOK, DISCOVERY, CONFLICT, EXPLANATION, RESOLUTION, LESSON, CTA.',
];

export const GLOBAL_VISUAL_RULES = [
  'Inject each character Visual DNA invariants into every image/video prompt.',
  'Always include negative consistency from Visual DNA.',
  'Universe lighting and palette override random model defaults.',
  'The Traveler face stays concealed unless the story explicitly requires a reveal.',
];
