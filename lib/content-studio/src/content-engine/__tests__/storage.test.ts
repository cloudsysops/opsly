import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  addProjectRenderJob,
  buildProjectId,
  createProjectEnvelope,
  findProjectEnvelope,
  listProjectEnvelopes,
  loadProjectEnvelopeByTenant,
  saveProjectEnvelope,
  setProjectApproval,
  setProjectMetadata,
  slugifyContentTitle,
  writeAssetFromSource,
} from '../storage.js';
import { transitionContentProjectStatus } from '../workflow.js';

async function makeBaseDir(): Promise<string> {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-engine-storage-'));
  await fs.mkdir(path.join(baseDir, 'config'), { recursive: true });
  await fs.cp(path.resolve(process.cwd(), '../../config/content-channels'), path.join(baseDir, 'config', 'content-channels'), {
    recursive: true,
  });
  await fs.writeFile(path.join(baseDir, 'source-image.txt'), 'fake image asset', 'utf8');
  return baseDir;
}

describe('content-engine storage', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it('creates and persists a project envelope', async () => {
    const baseDir = await makeBaseDir();
    tempDirs.push(baseDir);

    const envelope = await createProjectEnvelope(
      {
        tenantId: 'intcloudsysops',
        channel: 'opsly-universe',
        series: 'parallel-path',
        title: 'Todo empezó con una pregunta',
        goal: 'education',
        audience: 'familias y niños',
        format: 'youtube_short',
      },
      baseDir
    );

    expect(envelope.project.id).toBe(buildProjectId({
      tenantId: 'intcloudsysops',
      channel: 'opsly-universe',
      series: 'parallel-path',
      title: 'Todo empezó con una pregunta',
      goal: 'education',
      audience: 'familias y niños',
      format: 'youtube_short',
    }));
    expect(slugifyContentTitle(envelope.project.title)).toBe('todo-empezo-con-una-pregunta');

    const asset = await writeAssetFromSource({
      tenantId: 'intcloudsysops',
      projectId: envelope.project.id,
      sourcePath: 'source-image.txt',
      type: 'image',
      baseDir,
    });
    envelope.assets.push(asset);
    envelope.scenes.push({
      id: 'scene-1',
      projectId: envelope.project.id,
      order: 1,
      durationMs: 2500,
      visualType: 'image',
      assetRefs: [asset.id],
      voiceover: 'Todo empezó con una pregunta.',
      caption: 'Todo empezó con una pregunta.',
      transition: 'cut',
      motion: 'zoom-in',
    });

    const savedPath = await saveProjectEnvelope(envelope, baseDir);
    expect(savedPath).toContain('/content/tenants/intcloudsysops/projects/');
    const loaded = await loadProjectEnvelopeByTenant('intcloudsysops', envelope.project.id, baseDir);
    expect(loaded.project.title).toBe('Todo empezó con una pregunta');
    expect(loaded.assets).toHaveLength(1);

    const found = await findProjectEnvelope(envelope.project.id, baseDir);
    expect(found?.project.id).toBe(envelope.project.id);

    const listed = await listProjectEnvelopes(baseDir);
    expect(listed.map((item) => item.project.id)).toContain(envelope.project.id);
  });

  it('supports render job and approval updates', async () => {
    const baseDir = await makeBaseDir();
    tempDirs.push(baseDir);
    const envelope = await createProjectEnvelope(
      {
        tenantId: 'intcloudsysops',
        channel: 'bitsitos',
        series: 'pilot',
        title: 'A quick idea',
        goal: 'education',
        audience: 'kids',
        format: 'youtube_short',
      },
      baseDir
    );

    envelope.project.status = transitionContentProjectStatus(envelope.project.status, 'drafting');
    envelope.project.status = transitionContentProjectStatus(envelope.project.status, 'ready_to_render');
    const renderingEnvelope = addProjectRenderJob(envelope, {
      id: 'render-1',
      projectId: envelope.project.id,
      status: 'rendering',
      startedAt: new Date().toISOString(),
      logs: [],
    });
    expect(renderingEnvelope.project.status).toBe('rendering');

    renderingEnvelope.project.status = transitionContentProjectStatus(renderingEnvelope.project.status, 'ready_for_review');
    const approved = setProjectApproval(renderingEnvelope, {
      state: 'approved',
      approvedBy: 'human-review',
      approvedAt: new Date().toISOString(),
      reviewNotes: 'ok',
    });
    expect(approved.project.status).toBe('approved');

    const withMetadata = setProjectMetadata(approved, {
      title: 'A quick idea',
      description: 'desc',
      tags: ['kids'],
      privacyStatus: 'unlisted',
    });
    expect(withMetadata.metadata?.privacyStatus).toBe('unlisted');
  });
});
