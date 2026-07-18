import { describe, expect, it, vi, beforeEach } from 'vitest';

const { resolveTwentyEnvMock, findPersonByEmailMock, createPersonMock } = vi.hoisted(() => ({
  resolveTwentyEnvMock: vi.fn(),
  findPersonByEmailMock: vi.fn(),
  createPersonMock: vi.fn(),
}));

vi.mock('@intcloudsysops/services/twenty', () => ({
  resolveTwentyEnv: resolveTwentyEnvMock,
  TwentyClient: vi.fn(function TwentyClientMock() {
    return {
      findPersonByEmail: findPersonByEmailMock,
      createPerson: createPersonMock,
    };
  }),
}));

import { syncSubmissionToTwenty } from '../twenty-submission-sync';

describe('syncSubmissionToTwenty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when Twenty is not enabled for this tenant', async () => {
    resolveTwentyEnvMock.mockReturnValue({ enabled: false });

    const result = await syncSubmissionToTwenty({
      parentEmail: 'family@example.com',
      parentName: 'Ana García',
    });

    expect(result).toBeNull();
    expect(findPersonByEmailMock).not.toHaveBeenCalled();
  });

  it('returns null when there is no parent email to sync', async () => {
    resolveTwentyEnvMock.mockReturnValue({
      enabled: true,
      apiKey: 'key',
      baseUrl: 'https://crm.example.com',
    });

    const result = await syncSubmissionToTwenty({ parentEmail: '' });

    expect(result).toBeNull();
    expect(findPersonByEmailMock).not.toHaveBeenCalled();
  });

  it('reuses an existing Twenty person instead of creating a duplicate', async () => {
    resolveTwentyEnvMock.mockReturnValue({
      enabled: true,
      apiKey: 'key',
      baseUrl: 'https://crm.example.com',
    });
    findPersonByEmailMock.mockResolvedValue({ id: 'person-1' });

    const result = await syncSubmissionToTwenty({
      parentEmail: 'family@example.com',
      parentName: 'Ana García',
    });

    expect(result).toEqual({ twentyPersonId: 'person-1', created: false });
    expect(createPersonMock).not.toHaveBeenCalled();
  });

  it('creates a Twenty person when none exists for that email', async () => {
    resolveTwentyEnvMock.mockReturnValue({
      enabled: true,
      apiKey: 'key',
      baseUrl: 'https://crm.example.com',
    });
    findPersonByEmailMock.mockResolvedValue(null);
    createPersonMock.mockResolvedValue({ id: 'person-2' });

    const result = await syncSubmissionToTwenty({
      parentEmail: 'new-family@example.com',
      parentName: 'Luis Pérez',
    });

    expect(result).toEqual({ twentyPersonId: 'person-2', created: true });
    expect(createPersonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        emails: { primaryEmail: 'new-family@example.com' },
      })
    );
  });

  it('swallows errors and returns null instead of throwing', async () => {
    resolveTwentyEnvMock.mockReturnValue({
      enabled: true,
      apiKey: 'key',
      baseUrl: 'https://crm.example.com',
    });
    findPersonByEmailMock.mockRejectedValue(new Error('Twenty is down'));

    const result = await syncSubmissionToTwenty({
      parentEmail: 'family@example.com',
      parentName: 'Ana García',
    });

    expect(result).toBeNull();
  });
});
