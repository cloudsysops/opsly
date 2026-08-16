import { mkdtempSync, mkdirSync, copyFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProjectEnvelope } from '../storage.js';
import { resolveRepoRoot } from '../paths.js';
import {
  charactersForChannel,
  composeUniverseForProject,
  featuredCharacterIdsForChannel,
  loadUniverseCharacters,
  suggestCharactersForTopic,
} from '../universe-bridge.js';

function tempChannelRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'universe-bridge-'));
  mkdirSync(path.join(root, 'config', 'content-channels'), { recursive: true });
  copyFileSync(
    path.join(resolveRepoRoot(), 'config', 'content-channels', 'opsly-universe.json'),
    path.join(root, 'config', 'content-channels', 'opsly-universe.json')
  );
  return root;
}

describe('content os consumes universe', () => {
  it('projects the full canon into Creator Studio characters', () => {
    const characters = loadUniverseCharacters();
    expect(characters.map((item) => item.id)).toEqual(
      expect.arrayContaining(['nova', 'traveler', 'kai', 'orion', 'wavo', 'echo', 'lyra', 'maya', 'atlas'])
    );
    const nova = characters.find((item) => item.id === 'nova');
    expect(nova?.portals).toContain('FUTURE');
    expect(nova?.portals).not.toContain('HUMAN');
  });

  it('keeps featured kits aligned to tenant adaptation', () => {
    expect(featuredCharacterIdsForChannel('peskids')).toEqual(['orion', 'kai', 'wavo']);
    expect(featuredCharacterIdsForChannel('splashitos')).toEqual(['orion', 'kai', 'wavo']);
    expect(featuredCharacterIdsForChannel('opsly-universe')).toEqual(['traveler', 'nova', 'echo']);
    expect(charactersForChannel('bitsitos')).toEqual(['NØVA']);
  });

  it('maps swimming trends to Orion and Kai, not a Wavo-as-coach fork', () => {
    expect(suggestCharactersForTopic('swimming', 'peskids')).toEqual(['orion', 'kai']);
  });

  it('attaches story/image/video agent envelopes without inventing canon', async () => {
    const envelope = await createProjectEnvelope(
      {
        tenantId: 'opsly-universe',
        channel: 'opsly-universe',
        series: 'creator-studio',
        title: 'NØVA Explains identity',
        goal: 'education',
        audience: 'family',
        format: 'youtube_short',
      },
      tempChannelRoot()
    );
    const binding = envelope.universeContext ?? composeUniverseForProject(envelope);
    expect(binding.foundation.version).toBe('1.0.0');
    expect(binding.foundation.vision).toContain('THE MAP IS STILL BEING DRAWN');
    expect(binding.foundation.childSafetyPrinciples.length).toBeGreaterThan(0);
    expect(binding.canonVersion).toBe('1.0');
    expect(binding.characterIds).toEqual(['traveler', 'nova', 'echo']);
    expect(binding.agentInputs.story).toMatchObject({ agent: 'story' });
    expect(binding.agentInputs.image).toMatchObject({ agent: 'image' });
    expect(binding.agentInputs.video).toMatchObject({ agent: 'video' });
    expect(binding.agentInputs.content).toMatchObject({ agent: 'content' });
    expect(binding.storyPrompt.length).toBeGreaterThan(0);
    expect(binding.imagePrompt.length).toBeGreaterThan(0);
  });
});
