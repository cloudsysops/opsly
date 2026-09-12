import { composeUniverseForProject } from './universe-bridge.js';
import { createProjectEnvelope, saveProjectEnvelope } from './storage.js';
import type { ContentFormat, ContentProjectEnvelope, ContentScene } from './types.js';

export type AstralContentKind = 'story' | 'technolia' | 'cyber';

export interface AstralArenaProjectInput {
  episodeId: string;
  title: string;
  hook: string;
  topic: string;
  kind?: AstralContentKind;
  characterIds?: string[];
  format?: ContentFormat;
  durationSec?: number;
  baseDir?: string;
}

function defaultCharacters(kind: AstralContentKind): string[] {
  if (kind === 'technolia') return ['arena', 'brissa', 'nx-7', 'altair'];
  if (kind === 'cyber') return ['brissa', 'nx-7', 'altair'];
  return ['arena', 'brissa', 'orion-shepherd', 'aurora-unicorn'];
}

function storyboard(input: AstralArenaProjectInput, projectId: string): ContentScene[] {
  const kind = input.kind ?? 'story';
  const beats =
    kind === 'technolia'
      ? [
          ['WOW', input.hook, 'Reveal a new empty sector of Technolia.'],
          ['WHY', '¿Qué necesita este sistema para funcionar?', 'Show the missing architecture component.'],
          ['EXPLORE', 'Recolectamos energía, cristal, datos y conocimiento.', 'Explore the map and gather resources.'],
          ['UNDERSTAND', 'Cada edificio resuelve un problema real.', 'Connect the building to its software-architecture analogy.'],
          ['HUMAN', 'La tecnología funciona porque el equipo entiende sus límites.', 'Center the Guardians making a design choice.'],
          ['TAKEAWAY', 'Construimos el siguiente módulo de la nave.', 'Show visible base and starship progression.'],
        ]
      : kind === 'cyber'
        ? [
            ['WOW', input.hook, 'A safe simulated threat appears inside Cyber Arena.'],
            ['WHY', '¿Dónde está la frontera de confianza?', 'Reveal the affected architecture node.'],
            ['EXPLORE', 'NX-7 reproduce el fallo dentro del laboratorio.', 'Show only abstract disposable simulation state.'],
            ['UNDERSTAND', 'Elegimos la defensa y entendemos por qué funciona.', 'Visualize the defensive control.'],
            ['HUMAN', 'Brissa decide cómo proteger sin bloquear a los usuarios válidos.', 'Make trade-offs visible.'],
            ['TAKEAWAY', 'La arquitectura queda más fuerte y observable.', 'Upgrade Technolia after the lesson.'],
          ]
        : [
            ['WOW', input.hook, 'Open on an Astral Arena mystery.'],
            ['WHY', 'Algo en el Nexo cambió.', 'Show the problem through character reaction.'],
            ['EXPLORE', 'Los Guardianes investigan juntos.', 'Move through the canonical world.'],
            ['UNDERSTAND', 'Descubren una conexión que antes estaba oculta.', 'Reveal a Nexus rule visually.'],
            ['HUMAN', 'La decisión importa más que el poder.', 'Center sisterhood or chosen companions.'],
            ['TAKEAWAY', 'Si se rompe, se cose.', 'Resolve with restoration and a cliffhanger.'],
          ];

  const durationMs = Math.max(12000, (input.durationSec ?? 45) * 1000);
  const perScene = Math.floor(durationMs / beats.length);

  return beats.map(([beat, caption, narration], index) => ({
    id: `${projectId}-scene-${index + 1}`,
    projectId,
    order: index + 1,
    durationMs: perScene,
    visualType: 'character',
    assetRefs: [],
    caption,
    narration,
    transition: index === 0 ? 'cut' : 'dissolve',
    motion: index % 2 === 0 ? 'slow-zoom-in' : 'static',
    editorialBeat: beat as ContentScene['editorialBeat'],
  }));
}

export async function createAstralArenaProject(
  input: AstralArenaProjectInput,
): Promise<ContentProjectEnvelope> {
  const baseDir = input.baseDir ?? process.cwd();
  const kind = input.kind ?? 'story';
  let envelope = await createProjectEnvelope(
    {
      tenantId: 'astral-arena',
      channel: 'astral-arena',
      preset: 'astral-arena',
      series: kind === 'story' ? 'guardians-of-the-nexus' : `astral-${kind}`,
      episode: input.episodeId,
      title: input.title,
      goal: kind === 'cyber' ? 'education' : 'engagement',
      audience: 'family',
      format: input.format ?? 'youtube_short',
      mode: 'original',
      portal: kind === 'story' ? 'ASTRAL_ARENA' : 'TECHNOLIA',
      formatTemplate: 'ASTRAL_STORY',
      question: input.hook,
      emotion: 'wonder, courage, curiosity, teamwork',
      learningGoal: input.topic,
    },
    baseDir,
  );

  envelope = {
    ...envelope,
    scenes: storyboard(input, envelope.project.id),
    project: {
      ...envelope.project,
      status: 'storyboard',
      updatedAt: new Date().toISOString(),
    },
  };
  envelope.universeContext = composeUniverseForProject(
    envelope,
    input.characterIds ?? defaultCharacters(kind),
  );
  await saveProjectEnvelope(envelope, baseDir);
  return envelope;
}
