import { getCharacter, getWorld } from '@intcloudsysops/universe';
import { GAME_SCHEMA_VERSION } from './constants.js';
import { MissionSchema } from './schemas.js';
import type { Mission } from './types.js';

export const ASTRAL_ARENA_PORTAL_ID = 'astral-arena';
export const ASTRAL_ARENA_WORLD_ID = 'astral-arena';

type MissionSeed = {
  id: string;
  title: string;
  summary: string;
  threshold: string;
  guide: string;
  steps: Array<{ id: string; prompt: string; kind: 'connect' | 'explore' | 'create' }>;
};

const seeds: MissionSeed[] = [
  {
    id: 'awakening-sisters-001',
    title: 'Dos Firmas Astrales',
    summary: 'Arena and Brissa cross the Crystal Temple threshold and awaken Astral Threads and Nexus Sight.',
    threshold: 'altair',
    guide: 'brissa',
    steps: [
      { id: 'follow-star-thread', prompt: 'Follow the star-thread into the Crystal Temple.', kind: 'explore' },
      { id: 'awaken-arena', prompt: 'Connect Arena to the purple-gold crystal.', kind: 'connect' },
      { id: 'awaken-brissa', prompt: 'Connect Brissa to the constellation crystal.', kind: 'connect' },
      { id: 'protect-together', prompt: 'Create the first safe path by combining thread and shield.', kind: 'create' },
    ],
  },
  {
    id: 'orion-earth-guardian-001',
    title: 'El que Encuentra lo Perdido',
    summary: 'A German Shepherd refuses to abandon trapped people and becomes the Earth Guardian.',
    threshold: 'brissa',
    guide: 'orion-shepherd',
    steps: [
      { id: 'read-orion-signal', prompt: 'Notice what Orion is trying to show the team.', kind: 'explore' },
      { id: 'locate-survivors', prompt: 'Use Nexus Sight to find the hidden people.', kind: 'explore' },
      { id: 'open-rescue-path', prompt: 'Connect Arena’s thread to Brissa’s safe route.', kind: 'connect' },
    ],
  },
  {
    id: 'aurora-magic-guardian-001',
    title: 'El Bosque sin Cielo',
    summary: 'The team enters a starless forest and discovers Aurora, the Astral Unicorn.',
    threshold: 'altair',
    guide: 'aurora-unicorn',
    steps: [
      { id: 'track-dark-lake', prompt: 'Follow Orion to the lake hidden under the Shadow dome.', kind: 'explore' },
      { id: 'listen-before-acting', prompt: 'Choose curiosity before force when the lake begins to glow.', kind: 'explore' },
      { id: 'light-path', prompt: 'Connect Aurora’s light path to Arena’s Astral Threads.', kind: 'connect' },
    ],
  },
  {
    id: 'nx7-awakening-001',
    title: 'El Robot que Recuerda',
    summary: 'The Guardians reactivate NX-7 and recover the first damaged record of Umbra.',
    threshold: 'altair',
    guide: 'nx-7',
    steps: [
      { id: 'find-core', prompt: 'Explore the abandoned station and locate NX-7’s core.', kind: 'explore' },
      { id: 'sync-four-signatures', prompt: 'Connect the four Guardian signatures without overloading the core.', kind: 'connect' },
      { id: 'recover-umbra-file', prompt: 'Create a safe reconstruction of the damaged Umbra record.', kind: 'create' },
    ],
  },
  {
    id: 'dragon-signal-001',
    title: 'El Rugido en las Estrellas',
    summary: 'Altair identifies a roar traveling through a living Nexus Current.',
    threshold: 'altair',
    guide: 'brissa',
    steps: [
      { id: 'hear-current', prompt: 'Trace the roar without treating it as an enemy signal.', kind: 'explore' },
      { id: 'map-current', prompt: 'Connect Brissa’s star map to Altair’s Current language.', kind: 'connect' },
      { id: 'reach-dying-star', prompt: 'Create a stable path to the dying star.', kind: 'create' },
    ],
  },
  {
    id: 'asterion-awakening-001',
    title: 'La Estrella Dormida',
    summary: 'Brissa earns Asterion’s trust by restoring a constellation instead of commanding him.',
    threshold: 'altair',
    guide: 'asterion',
    steps: [
      { id: 'find-lost-constellation', prompt: 'Explore Asterion’s damaged memory map.', kind: 'explore' },
      { id: 'restore-star-route', prompt: 'Connect the missing stars without forcing Asterion awake.', kind: 'connect' },
      { id: 'accept-alliance', prompt: 'Create a chosen alliance, not ownership.', kind: 'create' },
    ],
  },
  {
    id: 'pyra-heartfire-001',
    title: 'El Corazón de Fuego',
    summary: 'Arena realizes the dragon inside the crystal volcano is frightened, not attacking.',
    threshold: 'altair',
    guide: 'arena',
    steps: [
      { id: 'hear-heartbeat', prompt: 'Explore the crystal for the living heartbeat inside.', kind: 'explore' },
      { id: 'stitch-from-inside', prompt: 'Connect the fractures with Astral Threads instead of breaking the shell.', kind: 'connect' },
      { id: 'meet-pyra', prompt: 'Create a safe opening and let Pyra choose what happens next.', kind: 'create' },
    ],
  },
  {
    id: 'nebryx-code-001',
    title: 'El Código que Está Vivo',
    summary: 'NX-7 discovers that ancient Nexus technology may have been grown rather than manufactured.',
    threshold: 'altair',
    guide: 'nx-7',
    steps: [
      { id: 'scan-nebryx', prompt: 'Explore Nebryx without classifying the dragon as a machine.', kind: 'explore' },
      { id: 'living-circuit', prompt: 'Connect NX-7 to the Living Circuit with consent.', kind: 'connect' },
      { id: 'decode-primordial', prompt: 'Create a translation of the Primordial Code.', kind: 'create' },
    ],
  },
  {
    id: 'umbriel-fallen-001',
    title: 'El Dragón Caído',
    summary: 'The team finds one intact light-thread inside the corrupted dragon Umbriel.',
    threshold: 'altair',
    guide: 'brissa',
    steps: [
      { id: 'survive-silent-roar', prompt: 'Explore the safe rhythm between Umbriel’s Silent Roars.', kind: 'explore' },
      { id: 'find-light-thread', prompt: 'Connect Brissa’s Nexus Sight to the last intact memory-thread.', kind: 'connect' },
      { id: 'choose-restoration', prompt: 'Create a plan that preserves the possibility of healing.', kind: 'create' },
    ],
  },
  {
    id: 'seven-stars-001',
    title: 'Los Siete Fragmentos',
    summary: 'The Guardians learn that every Star Fragment is also a key to a Dragon Sanctuary.',
    threshold: 'altair',
    guide: 'brissa',
    steps: [
      { id: 'map-seven-fragments', prompt: 'Explore the seven fragment signatures.', kind: 'explore' },
      { id: 'match-sanctuaries', prompt: 'Connect each fragment to its Sanctuary Current.', kind: 'connect' },
      { id: 'protect-the-keys', prompt: 'Create a route that keeps the keys out of Señor Sombra’s control.', kind: 'create' },
    ],
  },
  {
    id: 'dragon-current-war-001',
    title: 'La Guerra de las Corrientes',
    summary: 'Señor Sombra tries to corrupt the Dragon Sanctuaries and turn guardians into weapons.',
    threshold: 'altair',
    guide: 'nx-7',
    steps: [
      { id: 'split-team', prompt: 'Explore which Current each team member can protect best.', kind: 'explore' },
      { id: 'link-defenses', prompt: 'Connect dragon, magic, technology, and rescue routes.', kind: 'connect' },
      { id: 'deny-control', prompt: 'Create a defense that frees dragons instead of commanding them.', kind: 'create' },
    ],
  },
  {
    id: 'winged-ascension-001',
    title: 'La Ascensión Alada',
    summary: 'When none of the five Guardians chooses self-preservation first, the Nexus learns a new protective form.',
    threshold: 'altair',
    guide: 'brissa',
    steps: [
      { id: 'reach-each-other', prompt: 'Connect the separated Guardians across the void.', kind: 'connect' },
      { id: 'synchronize-five', prompt: 'Create one synchronized protective pattern from five different strengths.', kind: 'create' },
      { id: 'take-flight', prompt: 'Explore flight while keeping the team connection intact.', kind: 'explore' },
    ],
  },
  {
    id: 'city-without-colors-001',
    title: 'La Ciudad sin Colores',
    summary: 'Señor Sombra attacks memory itself, and the sisters discover Red Celestial.',
    threshold: 'altair',
    guide: 'arena',
    steps: [
      { id: 'find-rememberers', prompt: 'Explore the city with Orion and find people who still remember.', kind: 'explore' },
      { id: 'shield-city', prompt: 'Connect Brissa’s Astroshield to the central plaza.', kind: 'connect' },
      { id: 'weave-red-celestial', prompt: 'Create Red Celestial by linking every protected block with Arena’s threads.', kind: 'create' },
    ],
  },
  {
    id: 'shadow-truth-001',
    title: 'El Archivo Umbra',
    summary: 'NX-7 and Altair reveal that Señor Sombra was once the Guardian of the Void.',
    threshold: 'altair',
    guide: 'nx-7',
    steps: [
      { id: 'recover-before-shadow', prompt: 'Explore the archive from before Umbra’s fall.', kind: 'explore' },
      { id: 'connect-umbriel', prompt: 'Connect Umbriel’s chained memory to the recovered record.', kind: 'connect' },
      { id: 'separate-grief-from-evil', prompt: 'Create a truthful account that explains Umbra without excusing his harm.', kind: 'create' },
    ],
  },
  {
    id: 'shadow-rift-001',
    title: 'La Gran Grieta',
    summary: 'Destroying the Great Rift would destroy the worlds attached to it, so the Guardians must repair it.',
    threshold: 'umbra',
    guide: 'brissa',
    steps: [
      { id: 'map-seven-anchors', prompt: 'Explore the Great Rift and locate seven safe anchors.', kind: 'explore' },
      { id: 'thread-the-rift', prompt: 'Connect Arena’s seven threads to Brissa’s anchor map.', kind: 'connect' },
      { id: 'stabilize-team', prompt: 'Create a shared flight pattern with Orion, Aurora, NX-7, and the dragons.', kind: 'create' },
    ],
  },
  {
    id: 'umbra-memory-001',
    title: 'El Último Hilo',
    summary: 'Arena and Brissa choose to restore Umbra’s last memory-thread instead of destroying him.',
    threshold: 'umbra',
    guide: 'arena',
    steps: [
      { id: 'notice-last-thread', prompt: 'Explore the final light-thread inside Señor Sombra.', kind: 'explore' },
      { id: 'connect-umbriel-memory', prompt: 'Connect Umbriel’s recognition to Umbra’s lost world.', kind: 'connect' },
      { id: 'restore-not-erase', prompt: 'Create a restorative ending that leaves responsibility and memory intact.', kind: 'create' },
    ],
  },
];

export function getAstralArenaMissions(): Mission[] {
  getWorld(ASTRAL_ARENA_WORLD_ID);
  return seeds.map((seed) => {
    getCharacter(seed.threshold);
    getCharacter(seed.guide);
    return MissionSchema.parse({
      schemaVersion: GAME_SCHEMA_VERSION,
      id: seed.id,
      portalId: ASTRAL_ARENA_PORTAL_ID,
      universeWorldId: ASTRAL_ARENA_WORLD_ID,
      thresholdCharacterId: seed.threshold,
      guideCharacterId: seed.guide,
      title: seed.title,
      summary: seed.summary,
      steps: seed.steps,
    });
  });
}

export function getAstralArenaMission(id: string): Mission {
  const mission = getAstralArenaMissions().find((candidate) => candidate.id === id);
  if (!mission) throw new Error(`Unknown Astral Arena mission: ${id}`);
  return mission;
}
