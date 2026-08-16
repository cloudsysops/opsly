import path from 'node:path';
import {
  createProjectEnvelope,
  loadProjectEnvelopeByTenant,
  listProjectEnvelopes,
  saveProjectEnvelope,
  setProjectApproval,
} from '../lib/content-studio/src/content-engine/storage.ts';
import { validateContentProject } from '../lib/content-studio/src/content-engine/validation.ts';
import { evaluateRightsGate } from '../lib/content-studio/src/content-engine/rights.ts';
import { buildContentMetadata } from '../lib/content-studio/src/content-engine/metadata.ts';
import {
  runCommentaryDemo,
  runOriginalNovaExplains,
  runRepurposeSlice,
  transcribeProject,
  discoverProjectClips,
  ingestOwnedVideo,
  copyEvidenceBundle,
} from '../lib/content-studio/src/content-engine/pipeline.ts';
import { getContentArtifactsRoot, getContentProjectArtifactsRoot } from '../lib/content-studio/src/content-engine/paths.ts';
import { thumbnail } from '../lib/content-studio/src/content-engine/ffmpeg.ts';
import { createManualTrendCandidate, saveTrendCandidate } from '../lib/content-studio/src/content-engine/trends.ts';
import { proposeTransformativeAngle } from '../lib/content-studio/src/content-engine/angles.ts';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function command(): string {
  return process.argv[2] ?? 'help';
}

async function main(): Promise<void> {
  const cmd = command();
  const tenant = arg('--tenant') ?? 'opsly-universe';
  const file = arg('--file');
  const projectId = arg('--project') ?? process.argv[3];

  if (cmd === 'create') {
    const envelope = await createProjectEnvelope({
      tenantId: tenant,
      channel: tenant === 'peskids' ? 'peskids' : 'opsly-universe',
      series: arg('--series') ?? 'creator-studio',
      title: arg('--title') ?? 'Untitled',
      goal: 'education',
      audience: 'general',
      format: 'youtube_short',
      mode: 'original',
      portal: 'FUTURE',
      formatTemplate: 'NOVA_EXPLAINS',
    });
    const saved = await saveProjectEnvelope(envelope);
    console.log(saved);
    return;
  }

  if (cmd === 'ingest') {
    if (!file) throw new Error('--file is required');
    const envelope = await ingestOwnedVideo({ tenantId: tenant, filePath: path.resolve(file) });
    console.log(envelope.project.id);
    return;
  }

  if (cmd === 'transcribe') {
    const envelope = await loadProjectEnvelopeByTenant(tenant, projectId);
    const next = await transcribeProject(envelope);
    console.log(next.transcript?.adapter);
    return;
  }

  if (cmd === 'discover-clips' || cmd === 'clips') {
    const envelope = await loadProjectEnvelopeByTenant(tenant, projectId);
    const next = await discoverProjectClips(envelope);
    console.log(JSON.stringify(next.clipCandidates, null, 2));
    return;
  }

  if (cmd === 'validate') {
    const envelope = await loadProjectEnvelopeByTenant(tenant, projectId);
    console.log(JSON.stringify(await validateContentProject(envelope), null, 2));
    return;
  }

  if (cmd === 'rights-check') {
    const envelope = await loadProjectEnvelopeByTenant(tenant, projectId);
    console.log(JSON.stringify(evaluateRightsGate(envelope), null, 2));
    return;
  }

  if (cmd === 'metadata') {
    const envelope = await loadProjectEnvelopeByTenant(tenant, projectId);
    console.log(JSON.stringify(buildContentMetadata(envelope), null, 2));
    return;
  }

  if (cmd === 'approve') {
    const envelope = await loadProjectEnvelopeByTenant(tenant, projectId);
    const next = setProjectApproval(envelope, {
      state: 'approved',
      approvedBy: arg('--by') ?? 'human',
      approvedAt: new Date().toISOString(),
    });
    await saveProjectEnvelope(next);
    console.log(next.project.status);
    return;
  }

  if (cmd === 'list') {
    console.log(JSON.stringify((await listProjectEnvelopes()).map((item) => item.project), null, 2));
    return;
  }

  if (cmd === 'trend') {
    const candidate = createManualTrendCandidate({
      tenantId: tenant,
      sourceUrl: arg('--url') ?? 'https://example.invalid/moment',
      creatorName: arg('--creator') ?? 'manual',
      topic: arg('--topic') ?? 'AI',
      claim: arg('--claim') ?? 'AI will replace every programmer',
    });
    saveTrendCandidate(tenant, candidate);
    console.log(JSON.stringify(proposeTransformativeAngle({
      sourceMoment: candidate.sourceUrl,
      claim: candidate.detectedClaim,
      portal: candidate.portal,
    }), null, 2));
    return;
  }

  if (cmd === 'render-plan') {
    const envelope = await loadProjectEnvelopeByTenant(tenant, projectId);
    const plan = (envelope.clipCandidates ?? []).slice(0, 3).map((clip, index) => ({
      id: clip.id,
      start: clip.start,
      end: clip.end,
      output: `repurpose-short-0${index + 1}.mp4`,
      hook: clip.hook,
      score: clip.score,
    }));
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (cmd === 'thumbnail') {
    const envelope = await loadProjectEnvelopeByTenant(tenant, projectId);
    const source = envelope.renderJobs[0]?.outputPath ?? envelope.assets[0]?.path;
    if (!source) throw new Error('No render or asset to thumbnail');
    const dest = path.join(getContentProjectArtifactsRoot(envelope.project.id), 'thumbnail.jpg');
    await thumbnail(source, dest);
    console.log(dest);
    return;
  }

  if (cmd === 'slice' || cmd === 'render') {
    const envelope = await runRepurposeSlice({ tenantId: tenant, filePath: file });
    console.log(envelope.project.id);
    console.log((envelope.renderJobs[0]?.logs ?? []).join('\n'));
    return;
  }

  if (cmd === 'original') {
    const envelope = await runOriginalNovaExplains();
    console.log(envelope.renderJobs[0]?.outputPath);
    return;
  }

  if (cmd === 'commentary') {
    const envelope = await runCommentaryDemo();
    console.log(envelope.renderJobs[0]?.outputPath);
    return;
  }

  if (cmd === 'demo') {
    const original = await runOriginalNovaExplains();
    const repurpose = await runRepurposeSlice({ tenantId: tenant });
    const commentary = await runCommentaryDemo();
    const evidenceDir = path.join(getContentArtifactsRoot(), 'evidence');
    const repurposeDir = getContentProjectArtifactsRoot(repurpose.project.id);
    const copied = copyEvidenceBundle({
      'original-short.mp4': original.renderJobs[0]?.outputPath ?? '',
      'repurpose-short-01.mp4': path.join(repurposeDir, 'repurpose-short-01.mp4'),
      'repurpose-short-02.mp4': path.join(repurposeDir, 'repurpose-short-02.mp4'),
      'repurpose-short-03.mp4': path.join(repurposeDir, 'repurpose-short-03.mp4'),
      'commentary-demo.mp4': commentary.renderJobs[0]?.outputPath ?? '',
      'captions.srt': path.join(repurposeDir, 'captions.srt'),
      'thumbnail.jpg': path.join(repurposeDir, 'thumbnail.jpg'),
      'metadata.json': path.join(repurposeDir, 'metadata.json'),
    }, evidenceDir);
    console.log(JSON.stringify({
      original: original.project.id,
      originalRights: original.rights,
      repurpose: repurpose.project.id,
      repurposeRights: repurpose.rights,
      commentary: commentary.project.id,
      commentaryRights: commentary.rights,
      evidence: copied,
    }, null, 2));
    return;
  }

  console.log(`commands: create ingest transcribe discover-clips clips validate rights-check metadata approve list trend render-plan thumbnail slice render original commentary demo`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
