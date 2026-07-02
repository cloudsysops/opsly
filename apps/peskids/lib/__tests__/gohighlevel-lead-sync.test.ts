import { afterEach, describe, expect, it, vi } from 'vitest';

const { createContactMock, resolveEnvMock, GoHighLevelClientMock, isPeskidsGhlEnabledMock } =
  vi.hoisted(() => ({
    createContactMock: vi.fn(),
    resolveEnvMock: vi.fn(),
    GoHighLevelClientMock: vi.fn(),
    isPeskidsGhlEnabledMock: vi.fn(),
  }));

vi.mock('@intcloudsysops/services/twenty', () => ({
  isPeskidsGhlEnabled: isPeskidsGhlEnabledMock,
}));

vi.mock('@intcloudsysops/services/gohighlevel', () => ({
  GoHighLevelClient: GoHighLevelClientMock,
  resolveGoHighLevelPeskidsEnv: resolveEnvMock,
}));

import { sendLeadToGHL } from '../gohighlevel-lead-sync';

describe('sendLeadToGHL', () => {
  afterEach(() => {
    vi.clearAllMocks();
    isPeskidsGhlEnabledMock.mockReturnValue(true);
  });

  it('returns null when PESKIDS_GHL_ENABLED=false', async () => {
    isPeskidsGhlEnabledMock.mockReturnValue(false);

    const result = await sendLeadToGHL({
      parentName: 'Parent Test',
      email: 'parent@example.com',
    });

    expect(result).toBeNull();
    expect(GoHighLevelClientMock).not.toHaveBeenCalled();
  });

  it('passes custom field map to createContact when grade is present', async () => {
    resolveEnvMock.mockReturnValue({
      apiKey: 'pit-test',
      baseUrl: 'https://services.leadconnectorhq.com',
      locationId: 'loc-1',
      apiVersion: '2021-07-28',
    });
    GoHighLevelClientMock.mockImplementation(function MockGoHighLevelClient() {
      return { createContact: createContactMock };
    });
    createContactMock.mockResolvedValue({ id: 'ghl-contact-1' });

    const result = await sendLeadToGHL({
      parentName: 'Parent Test',
      email: 'parent@example.com',
      phone: '+573001234567',
      gradeInterested: '5-7',
      source: 'production-audit',
    });

    expect(result).toEqual({ ghlContactId: 'ghl-contact-1' });
    expect(createContactMock).toHaveBeenCalledWith({
      name: 'Parent Test',
      email: 'parent@example.com',
      phone: '+573001234567',
      source: 'production-audit',
      customFields: { grade_interested: '5-7' },
    });
  });

  it('returns null when GHL createContact throws', async () => {
    resolveEnvMock.mockReturnValue({
      apiKey: 'pit-test',
      baseUrl: 'https://services.leadconnectorhq.com',
      locationId: 'loc-1',
      apiVersion: '2021-07-28',
    });
    GoHighLevelClientMock.mockImplementation(function MockGoHighLevelClient() {
      return { createContact: createContactMock };
    });
    createContactMock.mockRejectedValue(new Error('customFields must be an array'));

    const result = await sendLeadToGHL({
      parentName: 'Parent Test',
      email: 'parent@example.com',
      gradeInterested: '5-7',
    });

    expect(result).toBeNull();
  });

  it('returns null when GHL is not configured', async () => {
    resolveEnvMock.mockReturnValue({
      apiKey: '',
      baseUrl: 'https://services.leadconnectorhq.com',
      locationId: 'loc-1',
      apiVersion: '2021-07-28',
    });

    const result = await sendLeadToGHL({
      parentName: 'Parent Test',
      email: 'parent@example.com',
    });

    expect(result).toBeNull();
    expect(GoHighLevelClientMock).not.toHaveBeenCalled();
  });
});
