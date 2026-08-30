import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  InvalidStatusTransitionError,
  ProjectNotFoundError,
  loadProject,
  loadScenes,
  saveProject,
  saveScenes,
  transitionProjectStatus,
} from '../storage/project-store.js';
import { approveProject, markReadyForReview, NotReadyForReviewError, rejectProject } from '../approval/state-machine.js';
import type { ContentProject, Scene } from '../domain/types.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'content-engine-storage-test-'));
  process.env.CONTENT_ENGINE_ROOT_OVERRIDE = root;
});

afterEach(() => {
  delete process.env.CONTENT_ENGINE_ROOT_OVERRIDE;
  rmSync(root, { recursive: true, force: true });
});

function freshProject(status: ContentProject['status'] = 'idea'): ContentProject {
  const now = new Date().toISOString();
  return {
    id: 'proj-1',
    tenantId: 'tenant-a',
    channel: 'bitsitos',
    series: 's',
    episode: 1,
    title: 'T',
    slug: 't',
    goal: '',
    audience: '',
    format: '9:16',
    status,
    preset: 'bitsitos',
    createdAt: now,
    updatedAt: now,
  };
}

describe('project-store', () => {
  it('round-trips a project through save/load', () => {
    const project = freshProject();
    saveProject(project);
    const loaded = loadProject(project.id);
    expect(loaded).toEqual(project);
  });

  it('throws ProjectNotFoundError for an unknown id', () => {
    expect(() => loadProject('does-not-exist')).toThrow(ProjectNotFoundError);
  });

  it('round-trips scenes', () => {
    const project = freshProject();
    saveProject(project);
    const scenes: Scene[] = [
      { id: 's1', projectId: project.id, order: 1, durationMs: 1000, visualType: 'image', assetRefs: ['a1'], transition: 'cut', motion: 'static' },
    ];
    saveScenes(project.tenantId, project.id, scenes);
    expect(loadScenes(project.tenantId, project.id)).toEqual(scenes);
  });

  it('allows a legal status transition and persists it', () => {
    const project = freshProject('idea');
    saveProject(project);
    const updated = transitionProjectStatus(project, 'drafting');
    expect(updated.status).toBe('drafting');
    expect(loadProject(project.id).status).toBe('drafting');
  });

  it('rejects an illegal status transition without persisting anything', () => {
    const project = freshProject('idea');
    saveProject(project);
    expect(() => transitionProjectStatus(project, 'published')).toThrow(InvalidStatusTransitionError);
    expect(loadProject(project.id).status).toBe('idea');
  });

  it('archived is a legal terminal transition from any non-terminal state', () => {
    const project = freshProject('drafting');
    const updated = transitionProjectStatus(project, 'archived');
    expect(updated.status).toBe('archived');
  });
});

describe('approval state machine', () => {
  it('markReadyForReview transitions rendering -> ready_for_review and persists approval status', () => {
    const project = freshProject('rendering');
    saveProject(project);
    const updated = markReadyForReview(project);
    expect(updated.status).toBe('ready_for_review');
    expect(updated.approval?.status).toBe('ready_for_review');
    expect(loadProject(project.id).approval?.status).toBe('ready_for_review');
  });

  it('approveProject records approvedBy/approvedAt and moves to approved', () => {
    const project = freshProject('ready_for_review');
    saveProject(project);
    const updated = approveProject(project, 'owner@example.com', 'looks good');
    expect(updated.status).toBe('approved');
    expect(updated.approval?.status).toBe('approved');
    expect(updated.approval?.approvedBy).toBe('owner@example.com');
    expect(updated.approval?.approvedAt).toBeTruthy();
    expect(updated.approval?.reviewNotes).toBe('looks good');
  });

  it('rejects approval attempts on a project that is not ready_for_review', () => {
    const project = freshProject('drafting');
    expect(() => approveProject(project, 'owner@example.com')).toThrow(NotReadyForReviewError);
  });

  it('rejectProject sends the project back to assets_pending with rejection notes', () => {
    const project = freshProject('ready_for_review');
    saveProject(project);
    const updated = rejectProject(project, 'wrong pacing');
    expect(updated.status).toBe('assets_pending');
    expect(updated.approval?.status).toBe('rejected');
    expect(updated.approval?.reviewNotes).toBe('wrong pacing');
  });

  it('never auto-transitions to published — approved requires a separate explicit action', () => {
    const project = freshProject('ready_for_review');
    saveProject(project);
    const updated = approveProject(project, 'owner@example.com');
    expect(updated.status).toBe('approved');
    expect(updated.status).not.toBe('published');
  });
});
