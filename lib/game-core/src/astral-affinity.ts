export const astralElementValues = ['FIRE', 'EARTH', 'AIR', 'WATER'] as const;
export type AstralElement = (typeof astralElementValues)[number];

export const zodiacSignValues = [
  'ARIES',
  'TAURUS',
  'GEMINI',
  'CANCER',
  'LEO',
  'VIRGO',
  'LIBRA',
  'SCORPIO',
  'SAGITTARIUS',
  'CAPRICORN',
  'AQUARIUS',
  'PISCES',
] as const;
export type ZodiacSign = (typeof zodiacSignValues)[number];

export interface AstralTechnique {
  id: string;
  name: string;
  description: string;
}

export interface AstralAffinity {
  sign: ZodiacSign;
  element: AstralElement;
  elementName: string;
  title: string;
  baseTechniques: AstralTechnique[];
  signatureTechnique: AstralTechnique;
  unlockedTechniqueIds: string[];
  visualLanguage: string;
}

/**
 * Astral Arena uses western zodiac dates only as a fictional character/game
 * customization seed. It is not a personality diagnosis or prediction.
 * Store the returned affinity, not the player's birth date.
 */
export function zodiacSignFromBirthDate(birthDate: string | Date): ZodiacSign {
  const date = birthDate instanceof Date ? birthDate : new Date(`${birthDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('INVALID_BIRTH_DATE');
  }

  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const md = month * 100 + day;

  if (md >= 321 && md <= 419) return 'ARIES';
  if (md >= 420 && md <= 520) return 'TAURUS';
  if (md >= 521 && md <= 620) return 'GEMINI';
  if (md >= 621 && md <= 722) return 'CANCER';
  if (md >= 723 && md <= 822) return 'LEO';
  if (md >= 823 && md <= 922) return 'VIRGO';
  if (md >= 923 && md <= 1022) return 'LIBRA';
  if (md >= 1023 && md <= 1121) return 'SCORPIO';
  if (md >= 1122 && md <= 1221) return 'SAGITTARIUS';
  if (md >= 1222 || md <= 119) return 'CAPRICORN';
  if (md >= 120 && md <= 218) return 'AQUARIUS';
  return 'PISCES';
}

export function elementForSign(sign: ZodiacSign): AstralElement {
  if (['ARIES', 'LEO', 'SAGITTARIUS'].includes(sign)) return 'FIRE';
  if (['TAURUS', 'VIRGO', 'CAPRICORN'].includes(sign)) return 'EARTH';
  if (['GEMINI', 'LIBRA', 'AQUARIUS'].includes(sign)) return 'AIR';
  return 'WATER';
}

const ELEMENT_TECHNIQUES: Record<AstralElement, AstralTechnique[]> = {
  FIRE: [
    { id: 'solar-pulse', name: 'Pulso Solar', description: 'Expands controlled heat and light in a short protective burst.' },
    { id: 'ember-step', name: 'Paso de Brasa', description: 'A fast dash that leaves a fading trail of astral sparks.' },
    { id: 'flame-shield', name: 'Escudo Ígneo', description: 'Forms a curved thermal barrier that redirects incoming energy.' },
  ],
  EARTH: [
    { id: 'stone-wall', name: 'Muro Astral', description: 'Raises a compact defensive wall from mineral-rich Nexus matter.' },
    { id: 'root-anchor', name: 'Ancla de Raíz', description: 'Stabilizes the Guardian against pulls, rifts, and knockback.' },
    { id: 'crystal-rise', name: 'Ascenso de Cristal', description: 'Creates crystal steps, ramps, or platforms for traversal.' },
  ],
  AIR: [
    { id: 'wind-step', name: 'Paso del Viento', description: 'Accelerates movement with a controlled current around the body.' },
    { id: 'sky-push', name: 'Impulso del Cielo', description: 'Pushes objects or redirects attacks with a focused air wave.' },
    { id: 'current-glide', name: 'Planeo de Corriente', description: 'Extends jumps into silent glides by riding an Astral Current.' },
  ],
  WATER: [
    { id: 'tide-shield', name: 'Escudo de Marea', description: 'Wraps the Guardian in a rotating liquid-energy barrier.' },
    { id: 'mist-veil', name: 'Velo de Niebla', description: 'Creates a cool mist for concealment, rescue, or safe retreat.' },
    { id: 'healing-current', name: 'Corriente Restauradora', description: 'Stabilizes exhausted allies and restores damaged Nexus links.' },
  ],
};

const SIGNATURE_TECHNIQUES: Record<ZodiacSign, AstralTechnique> = {
  ARIES: { id: 'ram-burst', name: 'Impacto del Carnero', description: 'A short forward Fire burst for breaking obstacles, never people.' },
  TAURUS: { id: 'living-bastion', name: 'Bastión Vivo', description: 'Creates a heavy Earth dome that protects the whole team.' },
  GEMINI: { id: 'twin-current', name: 'Corriente Gemela', description: 'Splits one Air current into two synchronized paths.' },
  CANCER: { id: 'moon-tide', name: 'Marea Lunar', description: 'Shapes Water into a protective crescent around nearby allies.' },
  LEO: { id: 'solar-roar', name: 'Rugido Solar', description: 'Projects a brilliant Fire wave that reveals hidden Shadow traces.' },
  VIRGO: { id: 'crystal-pattern', name: 'Patrón de Cristal', description: 'Builds precise Earth geometry to repair unstable structures.' },
  LIBRA: { id: 'balance-field', name: 'Campo de Equilibrio', description: 'Uses opposing Air currents to suspend or stabilize moving objects.' },
  SCORPIO: { id: 'deep-current', name: 'Corriente Profunda', description: 'Moves Water beneath barriers to detect hidden paths and anchors.' },
  SAGITTARIUS: { id: 'comet-arc', name: 'Arco Cometa', description: 'Launches a guided Fire-light signal toward distant Nexus markers.' },
  CAPRICORN: { id: 'mountain-path', name: 'Senda de Montaña', description: 'Raises a durable Earth route across broken terrain.' },
  AQUARIUS: { id: 'storm-current', name: 'Corriente de Tormenta', description: 'Combines Air pressure and static astral charge for rapid traversal.' },
  PISCES: { id: 'dream-tide', name: 'Marea de Sueños', description: 'Uses Water resonance to reveal emotional memory echoes in the Nexus.' },
};

const ELEMENT_META: Record<AstralElement, { name: string; title: string; visual: string }> = {
  FIRE: {
    name: 'Fuego',
    title: 'Guardián de la Llama Astral',
    visual: 'gold-red light, comet sparks, warm circular shockwaves',
  },
  EARTH: {
    name: 'Tierra',
    title: 'Guardián del Cristal Vivo',
    visual: 'stone-gold geometry, crystal growth, grounded ring patterns',
  },
  AIR: {
    name: 'Aire',
    title: 'Guardián de las Corrientes',
    visual: 'cyan-white ribbons, spiraling wind rings, weightless movement',
  },
  WATER: {
    name: 'Agua',
    title: 'Guardián de las Mareas del Nexo',
    visual: 'blue-violet fluid ribbons, mist, reflective crescent shapes',
  },
};

export function resolveAstralAffinity(birthDate: string | Date): AstralAffinity {
  const sign = zodiacSignFromBirthDate(birthDate);
  const element = elementForSign(sign);
  const meta = ELEMENT_META[element];

  return {
    sign,
    element,
    elementName: meta.name,
    title: meta.title,
    baseTechniques: ELEMENT_TECHNIQUES[element],
    signatureTechnique: SIGNATURE_TECHNIQUES[sign],
    unlockedTechniqueIds: [
      ...ELEMENT_TECHNIQUES[element].map((technique) => technique.id),
      SIGNATURE_TECHNIQUES[sign].id,
    ],
    visualLanguage: meta.visual,
  };
}

export interface AstralTechSpecialization {
  element: AstralElement;
  architectureFocus: string[];
  favoredTechnoliaSystems: string[];
  gameplayBonus: string;
}

export const ASTRAL_TECH_SPECIALIZATIONS: Record<AstralElement, AstralTechSpecialization> = {
  FIRE: {
    element: 'FIRE',
    architectureFocus: ['compute', 'energy', 'workers', 'propulsion'],
    favoredTechnoliaSystems: ['nx-foundry', 'shipyard', 'wing-drive'],
    gameplayBonus: 'Energy and compute upgrades require less Astral Energy in affinity-aware game modes.',
  },
  EARTH: {
    element: 'EARTH',
    architectureFocus: ['storage', 'durability', 'backup', 'resilience'],
    favoredTechnoliaSystems: ['memory-vault', 'backup-archive', 'resilience-grid'],
    gameplayBonus: 'Defensive and recovery structures gain an extra stability tier.',
  },
  AIR: {
    element: 'AIR',
    architectureFocus: ['networking', 'routing', 'edge', 'observability'],
    favoredTechnoliaSystems: ['portal-gateway', 'observatory', 'navigation-core'],
    gameplayBonus: 'Exploration routes and network upgrades become visible one step earlier.',
  },
  WATER: {
    element: 'WATER',
    architectureFocus: ['data flow', 'queues', 'recovery', 'adaptation'],
    favoredTechnoliaSystems: ['dragon-queue', 'memory-core', 'event-engine'],
    gameplayBonus: 'Flow-control and recovery actions restore more system health after simulated incidents.',
  },
};

export function getAstralTechSpecialization(
  element: AstralElement,
): AstralTechSpecialization {
  return ASTRAL_TECH_SPECIALIZATIONS[element];
}
