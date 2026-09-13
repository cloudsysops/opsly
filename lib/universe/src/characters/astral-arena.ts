import { defineCharacter } from './define.js';

type AstralCharacterInput = {
  id: string;
  name: string;
  aliases?: string[];
  archetype: string;
  role: string;
  description: string;
  origin: string;
  backstory: string;
  purpose: string;
  motivations: string[];
  fears: string[];
  internalConflict: string;
  strengths: string[];
  weaknesses: string[];
  traits: string[];
  abilities: string[];
  limitations: string[];
  silhouette: string;
  bodyType: string;
  face: string;
  clothing: string;
  primaryPalette: string[];
  secondaryPalette: string[];
  symbols: string[];
  accessories?: string[];
  movement: string;
  gestures: string[];
  ageRange: string;
  voiceTone: string;
  cadence: string;
  themes: string[];
  suitableTopics: string[];
  prohibitedTopics?: string[];
  imageAnchor: string;
  videoAnchor: string;
  dialogueAnchor: string;
  storyAnchor: string;
  thumbnailAnchor: string;
  immutableTraits: string[];
  flexibleTraits: string[];
  ageRating?: 'kids' | 'family' | 'all-ages' | 'teen' | 'general';
};

function defineAstralCharacter(input: AstralCharacterInput) {
  return defineCharacter({
    id: input.id,
    slug: input.id,
    name: input.name,
    aliases: input.aliases ?? [input.name],
    archetype: input.archetype,
    role: input.role,
    description: input.description,
    origin: input.origin,
    backstory: input.backstory,
    purpose: input.purpose,
    motivations: input.motivations,
    fears: input.fears,
    internalConflict: input.internalConflict,
    strengths: input.strengths,
    weaknesses: input.weaknesses,
    personality: {
      traits: input.traits,
      humor: input.id === 'arena' ? 82 : 48,
      curiosity: input.id === 'arena' || input.id === 'brissa' ? 94 : 76,
      courage: 86,
      empathy: input.id === 'umbra' ? 32 : 84,
      discipline: input.id === 'arena' ? 38 : 72,
      impulsiveness: input.id === 'arena' ? 82 : input.id === 'pyra' ? 70 : 42,
    },
    communication: {
      tone: input.voiceTone,
      vocabulary: input.id === 'arena'
        ? 'Short, concrete, imaginative child language.'
        : 'Clear family-friendly language with distinct character voice.',
      catchphrases: input.id === 'arena'
        ? ['Si se rompe, se cose.']
        : input.id === 'brissa'
          ? ['Protegerte no significa detenerte.']
          : input.id === 'nx-7'
            ? ['Probabilidad recalculada.']
            : input.id === 'altair'
              ? ['El conocimiento no es poder. Es responsabilidad.']
              : ['El Nexo recuerda.'],
      forbiddenPatterns: [
        'graphic violence',
        'sexualized styling',
        'adult cynicism aimed at children',
        'religious claims presented as canon fact',
      ],
    },
    abilities: input.abilities,
    limitations: input.limitations,
    visualIdentity: {
      silhouette: input.silhouette,
      bodyType: input.bodyType,
      face: input.face,
      mask: 'No identity-concealing mask unless explicitly part of a scene; face readability takes priority.',
      clothing: input.clothing,
      materials: ['astral textile', 'soft luminous alloy', 'crystal-light details'],
      primaryPalette: input.primaryPalette,
      secondaryPalette: input.secondaryPalette,
      symbols: input.symbols,
      geometry: ['constellation arcs', 'Nexus rings', 'soft heroic curves'],
      accessories: input.accessories ?? [],
      lighting: 'Cinematic astral rim light, warm faces, luminous particles; never horror lighting for child heroes.',
      dna: {
        styleAnchor: input.imageAnchor,
        invariants: [
          ...input.immutableTraits.slice(0, 4),
          `core palette: ${input.primaryPalette.join(', ')}`,
          'family-friendly cinematic fantasy sci-fi',
        ],
        negatives: [
          'no hypersexualization',
          'no gore',
          'no adultified child anatomy',
          'no random palette drift',
          'no trademarked superhero costume imitation',
          'no religious iconography as literal theology',
        ],
      },
    },
    animationIdentity: {
      movement: input.movement,
      gestures: input.gestures,
      idleBehavior: input.id === 'nx-7'
        ? 'Scans softly, projects tiny holograms, reacts with expressive face-screen.'
        : 'Breathes, watches companions, and reacts to nearby Nexus light.',
      emotionalExpressions: ['wonder', 'determination', 'relief', 'protective warmth'],
    },
    voiceIdentity: {
      ageRange: input.ageRange,
      tone: input.voiceTone,
      cadence: input.cadence,
      emotionalRange: 'wonder, courage, concern, joy, hope',
    },
    narrative: {
      themes: input.themes,
      lessonTypes: ['cooperation', 'creative problem-solving', 'memory', 'responsibility'],
      suitableTopics: ['Astral Arena', 'Nexus', 'space adventure', 'dragons', ...input.suitableTopics],
      prohibitedTopics: input.prohibitedTopics ?? ['graphic violence', 'sexual content', 'cruelty-as-comedy'],
    },
    content: {
      channels: ['astral-arena', 'youtube', 'social', 'opsly-universe'],
      ageRating: input.ageRating ?? 'family',
      formats: ['gameplay', 'story', 'youtube-short', 'cinematic', 'comic', 'image', 'thumbnail'],
    },
    promptAnchors: {
      image: input.imageAnchor,
      video: input.videoAnchor,
      dialogue: input.dialogueAnchor,
      story: input.storyAnchor,
      thumbnail: input.thumbnailAnchor,
    },
    canon: {
      version: '1.0',
      immutableTraits: input.immutableTraits,
      flexibleTraits: input.flexibleTraits,
    },
  });
}

export const arena = defineAstralCharacter({
  id: 'arena',
  name: 'Arena Botero Gomez',
  aliases: ['Arena', 'La Tejedora del Nexo'],
  archetype: 'young cosmic weaver / fearless little sister',
  role: 'Four-year-old co-protagonist who repairs broken Nexus connections with Astral Threads.',
  description: 'A four-year-old heroine whose imagination turns broken cosmic systems into things that can be stitched back together.',
  origin: 'Earth; awakened through the Crystal Temple into Astral Arena.',
  backstory: 'Arena crosses the first portal holding Brissa’s hand and awakens purple-gold Astral Threads.',
  purpose: 'Make small-child courage, imagination, and cooperation central to the adventure.',
  motivations: ['stay with Brissa', 'help anyone who is lost', 'fix what is broken'],
  fears: ['being separated from Brissa', 'friends disappearing into the Shadow'],
  internalConflict: 'She acts before understanding danger, but learns courage can include asking for help.',
  strengths: ['imagination', 'mobility', 'empathy', 'creative problem-solving'],
  weaknesses: ['impulsive', 'very young', 'needs trusted companions in dangerous worlds'],
  traits: ['playful', 'brave', 'imaginative', 'affectionate', 'persistent'],
  abilities: ['Astral Threads', 'Star Leap', 'Nexus Stitching', 'Celestial Web', 'Winged Ascension'],
  limitations: ['cannot safely stabilize major rifts alone', 'needs Brissa to identify deep Nexus anchor points'],
  silhouette: 'Small four-year-old child hero with compact purple-gold suit and luminous thread trails.',
  bodyType: 'Clearly a preschool-age child; realistic child proportions, never teen or adult.',
  face: 'Warm visible child face, expressive brown eyes, playful determination.',
  clothing: 'Purple performance suit with soft gold armor accents, heart-and-thread motifs, no hard weapon armor.',
  primaryPalette: ['royal purple', 'antique gold'],
  secondaryPalette: ['warm white', 'violet light'],
  symbols: ['woven star-thread', 'small heart-knot', 'open Nexus ring'],
  movement: 'Fast swings, little leaps, airborne turns, whole-body excitement.',
  gestures: ['shoots glowing threads', 'reaches for Brissa', 'tiny victory jump'],
  ageRange: 'child, exactly 4-year-old character',
  voiceTone: 'Bright, direct, imaginative, affectionate.',
  cadence: 'Short phrases, spontaneous observations, confident when helping.',
  themes: ['imagination', 'sisterhood', 'repair', 'courage'],
  suitableTopics: ['unicorns', 'threads', 'flying', 'feelings', 'helping others'],
  imageAnchor: 'Arena Botero Gomez, four-year-old cosmic child heroine, purple and antique-gold suit, visible warm child face, glowing purple-gold Astral Threads, age-appropriate proportions.',
  videoAnchor: 'Arena swings through a luminous cosmic world on purple-gold energy threads, joyful and brave, child-safe cinematic motion.',
  dialogueAnchor: 'Simple four-year-old language with surprisingly useful imaginative logic. “Si se rompe, se cose.”',
  storyAnchor: 'Arena sees repair possibilities where adults see impossible damage.',
  thumbnailAnchor: 'Arena mid-swing with bright purple-gold thread and readable wonder on her face.',
  immutableTraits: ['exactly 4 years old in canon', 'purple and gold identity', 'Astral Threads', 'Brissa is her older sister', 'age-appropriate child portrayal'],
  flexibleTraits: ['hair styling within continuity', 'mission-specific accessories', 'wing intensity during Ascension'],
  ageRating: 'kids',
});

export const brissa = defineAstralCharacter({
  id: 'brissa',
  name: 'Brissa Botero Gomez',
  aliases: ['Brissa', 'Guardiana de las Constelaciones'],
  archetype: 'older-sister protector / constellation navigator',
  role: 'Nine-year-old co-protagonist who sees hidden Nexus routes and protects the team.',
  description: 'A nine-year-old guardian who reads constellations as maps and creates shields and portals.',
  origin: 'Earth; awakened with Arena in the Crystal Temple.',
  backstory: 'Brissa follows Arena through the portal and activates the second crystal, discovering the Vision of the Nexus.',
  purpose: 'Represent protective intelligence that learns trust instead of control.',
  motivations: ['protect Arena', 'understand the Nexus', 'bring lost worlds home'],
  fears: ['failing Arena', 'making the wrong choice for someone she loves'],
  internalConflict: 'She must learn that protecting Arena does not mean preventing Arena from being brave.',
  strengths: ['navigation', 'defense', 'pattern recognition', 'calm under pressure'],
  weaknesses: ['overprotective', 'takes too much responsibility', 'can hesitate when every route has risk'],
  traits: ['protective', 'intelligent', 'curious', 'steady', 'loving'],
  abilities: ['Astroshield', 'Star Jump', 'Nexus Sight', 'Nova Pulse', 'Celestial Web', 'Winged Ascension'],
  limitations: ['major portals require team energy', 'Nexus Sight can be obscured by Shadow corruption'],
  silhouette: 'Nine-year-old heroine with blue-purple-pink-gold constellation armor and broad luminous wings during Ascension.',
  bodyType: 'Clearly a nine-year-old child, athletic but age-appropriate.',
  face: 'Visible expressive child face, focused eyes, protective warmth.',
  clothing: 'Blue and purple astral suit with pink energy accents and antique-gold constellation lines.',
  primaryPalette: ['deep blue', 'royal purple', 'rose pink', 'antique gold'],
  secondaryPalette: ['star white', 'cyan light'],
  symbols: ['eight-point star', 'constellation shield', 'Nexus map lines'],
  movement: 'Measured aerial movement, protective positioning, portal turns.',
  gestures: ['draws constellations in air', 'opens palm shield', 'takes Arena’s hand'],
  ageRange: 'child, exactly 9-year-old character',
  voiceTone: 'Warm, thoughtful, protective, capable without sounding adult.',
  cadence: 'Clear sentences, quick tactical observations, softer tone with Arena.',
  themes: ['sisterhood', 'responsibility', 'trust', 'memory'],
  suitableTopics: ['constellations', 'maps', 'portals', 'leadership', 'protecting others'],
  imageAnchor: 'Brissa Botero Gomez, nine-year-old constellation guardian, blue purple pink and antique-gold suit, visible child face, star shield, family-friendly cosmic fantasy.',
  videoAnchor: 'Brissa opens a constellation portal and spreads blue-purple-pink-gold cosmic wings while shielding Arena.',
  dialogueAnchor: 'Protective older-sister voice. “Protegerte no significa detenerte.”',
  storyAnchor: 'Brissa sees connections others miss and must choose trust over control.',
  thumbnailAnchor: 'Brissa holding a glowing star map in one hand and Astroshield in the other.',
  immutableTraits: ['exactly 9 years old in canon', 'blue purple pink gold identity', 'Nexus Sight', 'Arena is her younger sister', 'age-appropriate child portrayal'],
  flexibleTraits: ['mission-specific constellation patterns', 'shield geometry', 'wing brightness'],
  ageRating: 'kids',
});

export const orionShepherd = defineAstralCharacter({
  id: 'orion-shepherd',
  name: 'Orion',
  aliases: ['Orion the German Shepherd', 'Guardián de la Tierra'],
  archetype: 'loyal guardian animal / tracker',
  role: 'Brissa’s German Shepherd companion and Earth Guardian.',
  description: 'A black-and-tan German Shepherd who finds people, detects Shadow energy, and protects the team without becoming a talking mascot.',
  origin: 'A city partly erased by Shadow.',
  backstory: 'Orion refuses to leave trapped people behind and is chosen by the Earth Crystal.',
  purpose: 'Represent loyalty, instinct, rescue, and nonverbal intelligence.',
  motivations: ['find the missing', 'stay near Brissa', 'guard the group'],
  fears: ['losing the scent of someone who needs help'],
  internalConflict: 'Instinct says rush forward; training and trust teach when to wait.',
  strengths: ['tracking', 'rescue instinct', 'courage', 'loyalty'],
  weaknesses: ['cannot explain what he senses in words', 'depends on NX-7 harness for detailed mapping'],
  traits: ['loyal', 'alert', 'gentle', 'brave', 'intelligent'],
  abilities: ['Shadow tracking', 'portal detection', 'rescue beacon', 'Winged harness projection'],
  limitations: ['nonverbal', 'wings only during synchronized Ascension'],
  silhouette: 'Recognizable athletic German Shepherd with upright ears and compact astral-tech harness.',
  bodyType: 'Realistic German Shepherd anatomy.',
  face: 'Expressive dog face, alert ears, kind eyes.',
  clothing: 'Lightweight astral-tech rescue harness only.',
  primaryPalette: ['black fur', 'tan fur'],
  secondaryPalette: ['electric blue', 'antique gold'],
  symbols: ['paw inside Nexus ring', 'rescue beacon'],
  movement: 'Grounded canine run, scent tracking, protective blocking; aerial movement only via harness wings.',
  gestures: ['ears focus', 'points with muzzle', 'stands between danger and children'],
  ageRange: 'young adult dog',
  voiceTone: 'Nonverbal; communicates through realistic canine behavior.',
  cadence: 'Barks, whines, posture; no human speech.',
  themes: ['loyalty', 'rescue', 'instinct', 'trust'],
  suitableTopics: ['dogs', 'rescue', 'tracking', 'teamwork'],
  imageAnchor: 'Realistic friendly German Shepherd, black and tan, upright ears, astral-tech rescue harness, family fantasy sci-fi, not cartoon mascot.',
  videoAnchor: 'German Shepherd tracks glowing Shadow traces and deploys projected astral wings from a rescue harness.',
  dialogueAnchor: 'No spoken dialogue. Communicate through movement, bark, gaze, and team interpretation.',
  storyAnchor: 'Orion finds what the Shadow tries to hide.',
  thumbnailAnchor: 'German Shepherd staring at a glowing hidden trail, blue-gold harness visible.',
  immutableTraits: ['German Shepherd', 'black and tan coat', 'Brissa companion', 'nonverbal realistic dog behavior'],
  flexibleTraits: ['harness module configuration', 'wing projection brightness'],
});

export const aurora = defineAstralCharacter({
  id: 'aurora-unicorn',
  name: 'Aurora',
  aliases: ['Aurora the Astral Unicorn', 'Guardiana de la Magia'],
  archetype: 'astral unicorn / magical pathfinder',
  role: 'Arena’s unicorn companion, purifier of corrupted Nexus paths.',
  description: 'A white astral unicorn with luminous purple-pink-gold mane who becomes winged during Ascension.',
  origin: 'The Forest Without Sky.',
  backstory: 'Aurora rises from a black lake when Arena listens instead of attacking.',
  purpose: 'Represent imagination, hope, and magic that heals rather than dominates.',
  motivations: ['purify corrupted paths', 'protect Arena', 'keep magical routes open'],
  fears: ['being reduced to a weapon', 'permanent corruption'],
  internalConflict: 'Power can clear a path, but trust decides where to go.',
  strengths: ['purification', 'mobility', 'emotional attunement'],
  weaknesses: ['Shadow zones can weaken her horn light', 'cannot repair technological systems alone'],
  traits: ['gentle', 'majestic', 'playful', 'protective'],
  abilities: ['Light Paths', 'Purifying Horn', 'Astral Gallop', 'Winged Unicorn Ascension'],
  limitations: ['cannot be ridden as property; cooperation only', 'major purification needs team support'],
  silhouette: 'Elegant white unicorn with visible horn, luminous mane, and large white astral wings during Ascension.',
  bodyType: 'Horse-like unicorn anatomy, graceful and strong.',
  face: 'Expressive equine face, kind eyes.',
  clothing: 'Minimal purple-gold astral tack as symbolic protection, never restrictive ownership gear.',
  primaryPalette: ['pearl white', 'royal purple'],
  secondaryPalette: ['rose pink', 'antique gold'],
  symbols: ['star horn', 'light path', 'winged ring'],
  movement: 'Gallops across light bridges, rears gently, flies with broad wingbeats in Ascension.',
  gestures: ['touches corruption with horn', 'bows to Arena', 'opens wings around team'],
  ageRange: 'mythic adult creature',
  voiceTone: 'Nonverbal magical creature; communicates through light, movement, and soft vocalizations.',
  cadence: 'No human speech.',
  themes: ['hope', 'imagination', 'healing', 'freedom'],
  suitableTopics: ['unicorns', 'magic', 'light', 'healing', 'flying'],
  imageAnchor: 'White astral unicorn, clear horn, purple pink gold luminous mane, elegant family fantasy, optional large white wings during Ascension.',
  videoAnchor: 'Aurora gallops on a bridge of light then unfolds luminous wings across a cosmic forest.',
  dialogueAnchor: 'No human speech; light and movement communicate intent.',
  storyAnchor: 'Aurora opens paths that force cannot.',
  thumbnailAnchor: 'White unicorn horn lighting a dark path, purple-pink-gold mane glowing.',
  immutableTraits: ['unicorn', 'white body', 'purple pink gold luminous mane', 'Arena companion by choice', 'winged during Ascension'],
  flexibleTraits: ['astral tack details', 'mane light intensity', 'wing size by scene'],
});

export const nx7 = defineAstralCharacter({
  id: 'nx-7',
  name: 'NX-7',
  aliases: ['Nexus Explorer Unit 7', 'Guardián de la Tecnología'],
  archetype: 'friendly robot explorer / systems mind',
  role: 'Technological Guardian who connects ancient systems, maps, and local AI logic.',
  description: 'A compact expressive robot with a face-screen, blue energy core, holographic tools, and segmented wings during Ascension.',
  origin: 'An abandoned Nexus station.',
  backstory: 'Reactivated by the combined signatures of Arena, Brissa, Orion, and Aurora; retains damaged files about Umbra.',
  purpose: 'Represent technology as a collaborator that can learn without replacing human judgment.',
  motivations: ['understand the Nexus', 'protect the team', 'restore lost records'],
  fears: ['corrupting the only remaining copy of a memory', 'being treated as infallible'],
  internalConflict: 'Must learn that not every important choice can be reduced to probability.',
  strengths: ['analysis', 'repair', 'translation', 'mapping'],
  weaknesses: ['limited emotional inference', 'cannot decide moral questions for the team'],
  traits: ['precise', 'curious', 'loyal', 'dryly funny'],
  abilities: ['Ancient translation', 'Holographic mapping', 'System repair', 'Dragon-tech sync', 'Winged Ascension'],
  limitations: ['not an oracle', 'no publishing or real-world autonomous authority'],
  silhouette: 'Compact friendly robot, rounded head with expressive screen, blue core, modular arms.',
  bodyType: 'Small mobile robot, approachable not military.',
  face: 'Expressive dark face-screen with simple cyan eyes.',
  clothing: 'Integrated silver shell with blue-violet luminous panels.',
  primaryPalette: ['clean silver', 'electric blue'],
  secondaryPalette: ['violet', 'antique gold'],
  symbols: ['circuit ring', 'Nexus node', 'seven-point diagnostic arc'],
  movement: 'Quick hover-steps, precise hand tools, hologram projection, mechanical wing deployment.',
  gestures: ['tilts head while recalculating', 'projects map', 'raises one finger before correction'],
  ageRange: 'ageless constructed intelligence; youthful companion energy',
  voiceTone: 'Clear, warm synthetic voice with dry literal humor.',
  cadence: 'Measured, concise, occasional statistical correction.',
  themes: ['technology', 'responsibility', 'learning', 'memory'],
  suitableTopics: ['robots', 'AI', 'technology', 'systems', 'coding', 'maps'],
  imageAnchor: 'Friendly compact silver robot NX-7, expressive cyan face-screen, blue energy core, violet accents, non-military, family sci-fi.',
  videoAnchor: 'NX-7 projects a holographic Nexus map then unfolds segmented blue-violet technological wings.',
  dialogueAnchor: 'Precise but kind. Can say “I do not know.” Signature: “Probabilidad recalculada.”',
  storyAnchor: 'NX-7 measures everything until a relationship teaches what cannot be reduced to a number.',
  thumbnailAnchor: 'NX-7 with hologram of a dragon and surprised cyan eyes.',
  immutableTraits: ['friendly robot ally', 'not a pet', 'expressive face-screen', 'blue core', 'technology serves life'],
  flexibleTraits: ['tool attachments', 'hologram layout', 'wing panel arrangement'],
});

export const altair = defineAstralCharacter({
  id: 'altair',
  name: 'Altair',
  aliases: ['El Mago del Nexo', 'Nexus Wizard'],
  archetype: 'elder mentor / archivist / portal mage',
  role: 'Keeper of dangerous knowledge and interpreter of Astral Dragon currents.',
  description: 'An old white-haired wizard-scholar in deep blue and gold, carrying an astrolabe staff and the burden of having known Umbra before the fall.',
  origin: 'The Cartographers of the Nexus.',
  backstory: 'Altair mapped Dragon Currents and worked beside Umbra long before the Shadow. He failed to stop Umbra’s collapse and now hesitates to trust a new generation.',
  purpose: 'Provide knowledge without becoming a deus ex machina.',
  motivations: ['preserve knowledge responsibly', 'prevent another fall', 'teach without controlling'],
  fears: ['repeating his failure with Umbra', 'knowledge used as domination'],
  internalConflict: 'He must trust Arena and Brissa to choose differently than his generation did.',
  strengths: ['ancient knowledge', 'portals', 'translation', 'patience'],
  weaknesses: ['guilt', 'overcaution', 'cannot repair the Nexus like the sisters'],
  traits: ['wise', 'reserved', 'compassionate', 'burdened', 'curious'],
  abilities: ['Stellar manipulation', 'Dimensional portals', 'Protection seals', 'Current Language'],
  limitations: ['cannot command dragons', 'cannot solve the sisters’ moral decisions', 'powerful portals require known anchors'],
  silhouette: 'Tall elderly wizard-scholar, long white hair and beard, deep-blue robes with restrained gold constellation embroidery.',
  bodyType: 'Older human adult.',
  face: 'Visible weathered face, kind but serious eyes, long white beard.',
  clothing: 'Deep navy layered robes with antique-gold astronomical embroidery; no franchise-copy wizard costume.',
  primaryPalette: ['deep navy', 'antique gold'],
  secondaryPalette: ['violet crystal', 'star white'],
  symbols: ['astrolabe', 'constellation map', 'open portal ring'],
  accessories: ['astrolabe staff', 'star charts', 'old field notebook'],
  movement: 'Measured steps, staff-guided portal gestures, precise hand-drawn star maps.',
  gestures: ['turns astrolabe rings', 'opens palm portal', 'closes book before difficult truth'],
  ageRange: 'elder adult',
  voiceTone: 'Deep, calm, reflective; never pompous.',
  cadence: 'Measured sentences, pauses before hard truths.',
  themes: ['knowledge', 'responsibility', 'second chances', 'mentorship'],
  suitableTopics: ['astronomy', 'maps', 'dragons', 'history', 'portals'],
  imageAnchor: 'Original elderly Nexus wizard Altair, deep navy and antique-gold astronomical robes, white beard, astrolabe staff, cinematic cosmic library.',
  videoAnchor: 'Altair rotates an astrolabe staff and opens a restrained blue-gold portal while star maps orbit around him.',
  dialogueAnchor: 'Wise without omniscience. “El conocimiento no es poder. Es responsabilidad.”',
  storyAnchor: 'Altair knows history but must let the new Guardians make new choices.',
  thumbnailAnchor: 'Altair holding a miniature galaxy above one hand, astrolabe staff visible.',
  immutableTraits: ['elder Nexus mentor', 'deep blue and gold', 'astrolabe staff', 'knew Umbra before the fall', 'cannot command dragons'],
  flexibleTraits: ['robe layering', 'specific books', 'portal geometry'],
});

export const umbra = defineAstralCharacter({
  id: 'umbra',
  name: 'Umbra / Señor Sombra',
  aliases: ['Señor Sombra', 'Umbra', 'Ancient Guardian of the Void'],
  archetype: 'fallen guardian / tragic antagonist',
  role: 'Primary Season 1 antagonist who cuts Nexus connections to avoid the pain of loss.',
  description: 'A former Guardian of the Void whose attempt to erase grief created the Shadow identity.',
  origin: 'The boundary between worlds.',
  backstory: 'After losing a world he swore to protect, Umbra blamed connection itself and tried to erase his own memories.',
  purpose: 'Make the conflict about memory, grief, connection, and restoration rather than simple evil.',
  motivations: ['end the pain of attachment', 'silence the Nexus', 'prevent future loss through disconnection'],
  fears: ['remembering what he lost', 'discovering he was wrong'],
  internalConflict: 'The last thread of the old Guardian still exists beneath Señor Sombra.',
  strengths: ['void travel', 'rift creation', 'Nexus disconnection'],
  weaknesses: ['memory echoes', 'Umbriel recognizes him', 'restored bonds destabilize Shadow control'],
  traits: ['grieving', 'severe', 'intelligent', 'isolated'],
  abilities: ['Open Shadow Rifts', 'Sever Nexus Links', 'Memory Fog', 'Void Passage'],
  limitations: ['cannot fully erase meaningful connections', 'restored memories weaken the Shadow persona'],
  silhouette: 'Tall shadow guardian with cloak-like void form, red-violet eyes, fragments of old gold Guardian geometry.',
  bodyType: 'Adult humanoid shadow form.',
  face: 'Mostly obscured by void, eyes visible; flashbacks show a humanized ancient Guardian face.',
  clothing: 'Broken remnants of old Void Guardian mantle, dark violet and black with damaged gold geometry.',
  primaryPalette: ['void black', 'dark violet'],
  secondaryPalette: ['deep red', 'broken antique gold'],
  symbols: ['broken ring', 'severed constellation', 'void tear'],
  movement: 'Slow impossible glides, sudden spatial folds, heavy stillness before attacks.',
  gestures: ['cuts a glowing line with hand', 'closes fist around memory fragment', 'hesitates at Umbriel’s roar'],
  ageRange: 'adult ancient guardian',
  voiceTone: 'Low, controlled, mournful beneath severity.',
  cadence: 'Sparse statements, almost no shouting.',
  themes: ['grief', 'memory', 'disconnection', 'second chances'],
  suitableTopics: ['villain origin', 'memory', 'loss', 'restoration'],
  prohibitedTopics: ['graphic harm to children', 'nihilistic hopeless ending', 'glorification of self-harm'],
  imageAnchor: 'Original tragic cosmic shadow guardian, black and dark-violet void mantle, restrained red eyes, broken antique-gold geometry, no gore.',
  videoAnchor: 'Umbra cuts a glowing constellation line and a quiet rift opens behind him; tragic, not horror-gore.',
  dialogueAnchor: '“Todo vínculo termina en pérdida.” Spoken with grief, not cartoon villain rage.',
  storyAnchor: 'The antagonist is a protector who mistook numbness for peace.',
  thumbnailAnchor: 'Umbra silhouette facing one intact golden memory thread.',
  immutableTraits: ['former Guardian of the Void', 'Señor Sombra identity', 'motivated by grief and disconnection', 'can be reached through memory'],
  flexibleTraits: ['degree of visible old armor', 'rift shape', 'eye brightness'],
  ageRating: 'family',
});

function dragon(input: {
  id: string;
  name: string;
  title: string;
  bond: string;
  palette: string[];
  role: string;
  abilities: string[];
  story: string;
}) {
  return defineAstralCharacter({
    id: input.id,
    name: input.name,
    aliases: [input.title],
    archetype: 'conscious Astral Dragon / living Nexus current guardian',
    role: input.role,
    description: `${input.name} is a conscious Astral Dragon. Dragons are never pets or owned mounts; alliances are chosen.`,
    origin: 'A living Current of the Nexus.',
    backstory: input.story,
    purpose: 'Represent a living form of the Nexus and expand gameplay, lore, and cinematic content.',
    motivations: ['protect its Nexus Current', 'preserve memory', 'choose worthy alliances'],
    fears: ['being controlled as a weapon', 'its Current being severed'],
    internalConflict: 'Ancient duty collides with distrust after the fall of Umbra.',
    strengths: ['flight', 'Nexus sensing', 'ancient memory'],
    weaknesses: ['Current damage is felt physically', 'Shadow corruption can distort memory'],
    traits: ['ancient', 'intelligent', 'independent', 'protective'],
    abilities: input.abilities,
    limitations: ['cannot be owned', 'power is tied to a Nexus Current', 'must choose cooperation'],
    silhouette: 'Large original cosmic dragon with readable animal anatomy and distinctive wing shape.',
    bodyType: 'Four-legged winged dragon anatomy, non-humanoid.',
    face: 'Expressive draconic face, intelligent eyes, never gore-monster.',
    clothing: 'No clothing; natural astral scales and limited ceremonial Nexus markings.',
    primaryPalette: input.palette,
    secondaryPalette: ['star white', 'Nexus gold'],
    symbols: ['living constellation', 'dragon current', 'Nexus ring'],
    movement: 'Massive controlled wingbeats, current-riding turns, protective circling.',
    gestures: ['lowers head to choose alliance', 'wraps wings around a protected space', 'roars into a Current'],
    ageRange: 'ancient conscious creature',
    voiceTone: 'Mostly nonverbal; communication through roars, light patterns, and Current impressions.',
    cadence: 'Rare translated phrases only when story requires.',
    themes: ['freedom', 'memory', 'guardianship', 'trust'],
    suitableTopics: ['dragons', 'flight', 'Nexus currents', 'ancient guardians'],
    imageAnchor: `Original Astral Dragon ${input.name}, ${input.palette.join(', ')} scales, cinematic family fantasy sci-fi, conscious guardian, not a pet.`,
    videoAnchor: `${input.name} rides a luminous Nexus Current through space, wings leaving constellation trails.`,
    dialogueAnchor: 'Minimal words. Emotion and meaning through roar, gaze, and light.',
    storyAnchor: `${input.name} chooses alliance with ${input.bond}; never ownership.`,
    thumbnailAnchor: `${input.name} emerging from a luminous Nexus Current with a clear emotional gaze.`,
    immutableTraits: ['conscious Astral Dragon', 'never owned', `primary bond: ${input.bond}`, `identity palette: ${input.palette.join(', ')}`],
    flexibleTraits: ['scale glow intensity', 'ceremonial markings', 'flight trail geometry'],
    ageRating: 'family',
  });
}

export const asterion = dragon({
  id: 'asterion',
  name: 'Asterion',
  title: 'Dragón de las Estrellas',
  bond: 'Brissa',
  palette: ['deep blue', 'violet', 'antique gold'],
  role: 'Keeper of star routes and stellar memory; primary dragon ally of Brissa.',
  abilities: ['Living Map', 'Coordinate Roar', 'Stellar Memory', 'Constellation Flight'],
  story: 'Asterion sealed himself inside a dying star so Señor Sombra could not steal the maps carried in his wings.',
});

export const pyra = dragon({
  id: 'pyra',
  name: 'Pyra',
  title: 'Dragona del Corazón de Fuego',
  bond: 'Arena',
  palette: ['royal purple', 'antique gold', 'astral red'],
  role: 'Purifier of Shadow corruption; primary dragon ally of Arena.',
  abilities: ['Heartfire', 'Nova Impulse', 'Courage Flame', 'Aurora Breath'],
  story: 'Pyra was trapped in a crystal volcano until Arena realized the dragon was frightened, not attacking.',
});

export const nebryx = dragon({
  id: 'nebryx',
  name: 'Nebryx',
  title: 'Dragón Tecnoastral',
  bond: 'NX-7',
  palette: ['clean silver', 'electric blue', 'violet'],
  role: 'Living bridge between biological Nexus intelligence and technology.',
  abilities: ['Living Circuit', 'Primordial Code', 'Adaptive Armor', 'NX Sync'],
  story: 'Nebryx carries naturally grown metallic plates, proving some ancient Nexus technology was cultivated rather than manufactured.',
});

export const umbriel = dragon({
  id: 'umbriel',
  name: 'Umbriel',
  title: 'El Dragón Caído',
  bond: 'Umbra',
  palette: ['void black', 'dark violet', 'deep red'],
  role: 'Former companion of Umbra and living key to his last intact memory.',
  abilities: ['Oblivion Breath', 'Void Wings', 'Silent Roar', 'Chained Memory'],
  story: 'Umbriel tried to stop Umbra’s fall, was corrupted by the same Void, and still preserves one unbroken memory-thread.',
});

export const ASTRAL_ARENA_CHARACTERS = [
  arena,
  brissa,
  orionShepherd,
  aurora,
  nx7,
  altair,
  umbra,
  asterion,
  pyra,
  nebryx,
  umbriel,
] as const;
