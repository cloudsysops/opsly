import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockAdd = vi.fn();
const mockGetWaitingCount = vi.fn();
const mockGetActiveCount = vi.fn();
const mockQueueClose = vi.fn();
const mockWorkerClose = vi.fn();

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockAdd,
    getWaitingCount: mockGetWaitingCount,
    getActiveCount: mockGetActiveCount,
    close: mockQueueClose,
  })),
  Worker: vi.fn().mockImplementation(() => ({
    close: mockWorkerClose,
  })),
}));

vi.mock('../src/events/bus.js', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));

import { publishEvent } from '../src/events/bus.js';
import { TeamManager } from '../src/teams/TeamManager.js';

describe('TeamManager', () => {
  let manager: TeamManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdd.mockResolvedValue({ id: 'job-42' });
    mockGetWaitingCount.mockResolvedValue(1);
    mockGetActiveCount.mockResolvedValue(0);
    mockQueueClose.mockResolvedValue(undefined);
    mockWorkerClose.mockResolvedValue(undefined);
    manager = new TeamManager({ host: 'localhost', port: 6379 });
  });

  afterEach(async () => {
    await manager.close();
  });

  it('assignToTeam encola en la cola del team y publica evento', async () => {
    const jobId = await manager.assignToTeam('ui_fix', { decision_id: 'd1' });

    expect(jobId).toBe('job-42');
    expect(mockAdd).toHaveBeenCalledWith('ui_fix', { decision_id: 'd1' });
    expect(publishEvent).toHaveBeenCalledWith(
      'job.completed',
      expect.objectContaining({
        team: 'frontend-team',
        task_type: 'ui_fix',
        job_id: 'job-42',
      })
    );
  });

  it('task desconocido cae en backend-team por defecto', async () => {
    await manager.assignToTeam('unknown_task', {});

    expect(mockAdd).toHaveBeenCalledWith('unknown_task', {});
    expect(publishEvent).toHaveBeenCalledWith(
      'job.completed',
      expect.objectContaining({ team: 'backend-team' })
    );
  });

  it('getTeamStatus agrega waiting y active por team', async () => {
    let waitingCalls = 0;
    mockGetWaitingCount.mockImplementation(async () => {
      waitingCalls += 1;
      return waitingCalls === 1 ? 2 : 0;
    });
    let activeCalls = 0;
    mockGetActiveCount.mockImplementation(async () => {
      activeCalls += 1;
      return activeCalls === 1 ? 1 : 0;
    });

    const status = await manager.getTeamStatus();

    expect(status['frontend-team']).toEqual({ waiting: 2, active: 1 });
    expect(status['backend-team']).toEqual({ waiting: 0, active: 0 });
    expect(Object.keys(status)).toContain('ml-team');
    expect(Object.keys(status)).toContain('infra-team');
  });
});
