import { CANON_VERSION } from '../constants.js';
import { UniverseBitSchema } from '../schemas.js';
import type { UniverseBit } from '../types.js';

export const dewthread: UniverseBit = UniverseBitSchema.parse({
  id: 'dewthread',
  slug: 'dewthread',
  name: 'Dewthread',
  world: 'wild',
  affinity: 'canopy-water',
  description:
    'A small canopy weaver that knits dew into pale threads. The threads show how water moves through moss, bark, and soil. Dewthread is a being, not a prize.',
  personality: 'Shy, exact, and still until trusted. Hides when footsteps arrive faster than looking.',
  traits: ['observant', 'quiet', 'habitat-loyal', 'non-combative'],
  abilities: [
    'thread a dew path that maps moisture through a patch of forest',
    'go still enough that small life keeps moving',
  ],
  limitations: [
    'cannot speak words',
    'will not form a connection if treated as a pet or trophy',
    'cannot leave a damaged patch until the snag is eased',
  ],
  learningDomain: 'ecosystems and careful observation',
  visualDNA: {
    styleAnchor:
      'Fist-sized canopy weaver. Translucent dew-silk body, leaf-vein limbs, no armor, no fangs, no merch-mascot eyes.',
    invariants: [
      'small enough to sit in two child palms without filling them',
      'dew-silk threads as body language, not weapons',
      'canopy-green / river-teal / pollen-gold palette',
      'visible as an animal-analogue, never a spirit-god',
    ],
    negatives: [
      'no Pokémon silhouette, no elemental orb forehead',
      'no capture ball, collar, or battle stance',
      'no cute-aggression claws or fire breath',
      'no sacred-geometry overlay presented as biology',
    ],
  },
  bondRules: ['connection_not_capture', 'no_rushing', 'no_pet_prize', 'observation_before_touch'],
  cardRepresentation: {
    title: 'Dewthread',
    illustrationHint: 'css-shape:dew-knot',
    affinity: 'canopy-water',
    ability: 'Dew Path',
    knowledgeDomain: 'ecosystems',
  },
  canonVersion: CANON_VERSION,
});
