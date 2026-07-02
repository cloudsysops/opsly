import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSearchOpportunities,
  mockGetContacts,
  isPeskidsGhlEnabledMock,
} = vi.hoisted(() => ({
  mockSearchOpportunities: vi.fn(),
  mockGetContacts: vi.fn(),
  isPeskidsGhlEnabledMock: vi.fn(() => true),
}));

vi.mock('@intcloudsysops/services/twenty', () => ({
  isPeskidsGhlEnabled: isPeskidsGhlEnabledMock,
}));

vi.mock('@intcloudsysops/services/gohighlevel', () => ({
  getGoHighLevelService: () => ({
    searchOpportunities: mockSearchOpportunities,
    getContacts: mockGetContacts,
  }),
  resolveGoHighLevelPeskidsEnv: () => ({
    apiKey: 'test-key',
    baseUrl: 'https://services.leadconnectorhq.com',
    apiVersion: '2021-07-28',
    locationId: 'loc-1',
  }),
  isGoHighLevelPeskidsConfigured: () => true,
}));

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({
    from: mockFrom,
  }),
}));

import { PipelineAnalyticsService } from '../pipeline-analytics.service';

function makeOpp(overrides: Partial<{
  id: string;
  pipelineStageId: string;
  contactId: string;
  createdAt: string;
  contact: { source: string };
}> = {}) {
  return {
    id: 'opp-1',
    pipelineStageId: 'f4c7365b-efe8-4d33-9559-c7f06881f172',
    contactId: 'contact-1',
    createdAt: '2026-05-01T12:00:00Z',
    ...overrides,
  };
}

describe('PipelineAnalyticsService', () => {
  let service: PipelineAnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    isPeskidsGhlEnabledMock.mockReturnValue(true);
    service = new PipelineAnalyticsService();

    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ data: [], error: null });
  });

  describe('getPipelineMetrics', () => {
    it('returns fallback when GHL legacy flag is disabled', async () => {
      isPeskidsGhlEnabledMock.mockReturnValue(false);

      const result = await service.getPipelineMetrics();

      expect(result.ghlConfigured).toBe(false);
      expect(result.ghlError).toContain('PESKIDS_GHL_ENABLED=false');
      expect(mockSearchOpportunities).not.toHaveBeenCalled();
    });

    it('returns fallback when GHL returns empty opportunities', async () => {
      mockSearchOpportunities.mockResolvedValue({ opportunities: [], total: 0 });

      const result = await service.getPipelineMetrics();

      expect(result.totalLeads).toBe(0);
      expect(result.byStage['New Lead']).toBe(0);
      expect(result.ghlConfigured).toBe(true);
      expect(result.ghlError).toBeUndefined();
    });

    it('counts stages correctly from GHL opportunities', async () => {
      mockSearchOpportunities.mockResolvedValue({
        opportunities: [
          makeOpp({ id: 'o1', pipelineStageId: 'f4c7365b-efe8-4d33-9559-c7f06881f172' }),
          makeOpp({ id: 'o2', pipelineStageId: '75742c84-9063-4539-b755-b09bfdeb6346' }),
          makeOpp({ id: 'o3', pipelineStageId: '75742c84-9063-4539-b755-b09bfdeb6346' }),
          makeOpp({ id: 'o4', pipelineStageId: '13f095d8-4c87-4637-a6f7-b8d2d294ad0b' }),
          makeOpp({ id: 'o5', pipelineStageId: 'd69d8656-1836-4d48-8a83-5268895c5c74' }),
          makeOpp({ id: 'o6', pipelineStageId: 'c9b615f7-b4da-416c-a3b1-28be6da1d063' }),
          makeOpp({ id: 'o7', pipelineStageId: '6faadc43-3454-4a0a-af6f-6ee7c4ecbad7' }),
        ],
        total: 7,
      });

      const result = await service.getPipelineMetrics();

      expect(result.totalLeads).toBe(7);
      expect(result.byStage).toEqual({
        'New Lead': 1,
        Contacted: 2,
        'Trial Class': 1,
        Enrolled: 1,
        'Active Student': 1,
        Renewal: 0,
        Lost: 1,
      });
    });

    it('computes conversion rates between adjacent stages', async () => {
      mockSearchOpportunities.mockResolvedValue({
        opportunities: [
          makeOpp({ id: 'o1', pipelineStageId: 'f4c7365b-efe8-4d33-9559-c7f06881f172' }),
          makeOpp({ id: 'o2', pipelineStageId: 'f4c7365b-efe8-4d33-9559-c7f06881f172' }),
          makeOpp({ id: 'o3', pipelineStageId: '75742c84-9063-4539-b755-b09bfdeb6346' }),
          makeOpp({ id: 'o4', pipelineStageId: '13f095d8-4c87-4637-a6f7-b8d2d294ad0b' }),
          makeOpp({ id: 'o5', pipelineStageId: 'd69d8656-1836-4d48-8a83-5268895c5c74' }),
        ],
        total: 5,
      });

      const result = await service.getPipelineMetrics();

      expect(result.byStage).toEqual({
        'New Lead': 2,
        Contacted: 1,
        'Trial Class': 1,
        Enrolled: 1,
        'Active Student': 0,
        Renewal: 0,
        Lost: 0,
      });
      expect(result.conversionRates.leadToContacted).toBe(50);
      expect(result.conversionRates.contactedToTrial).toBe(100);
      expect(result.conversionRates.trialToEnrolled).toBe(100);
      expect(result.conversionRates.enrolledToActive).toBe(0);
    });

    it('breaks down by contact source', async () => {
      mockSearchOpportunities.mockResolvedValue({
        opportunities: [
          makeOpp({
            id: 'o1',
            pipelineStageId: 'f4c7365b-efe8-4d33-9559-c7f06881f172',
            contact: { source: 'web' },
          }),
          makeOpp({
            id: 'o2',
            pipelineStageId: '75742c84-9063-4539-b755-b09bfdeb6346',
            contact: { source: 'Web' },
          }),
          makeOpp({
            id: 'o3',
            pipelineStageId: '13f095d8-4c87-4637-a6f7-b8d2d294ad0b',
            contact: { source: 'referral' },
          }),
          makeOpp({
            id: 'o4',
            pipelineStageId: 'd69d8656-1836-4d48-8a83-5268895c5c74',
          }),
        ],
        total: 4,
      });

      const result = await service.getPipelineMetrics();

      expect(result.bySource['web']).toBe(2);
      expect(result.bySource['referral']).toBe(1);
      expect(result.bySource['unknown']).toBe(1);
    });

    it('builds monthly trend from opportunity dates', async () => {
      mockSearchOpportunities.mockResolvedValue({
        opportunities: [
          makeOpp({
            id: 'o1',
            pipelineStageId: 'f4c7365b-efe8-4d33-9559-c7f06881f172',
            createdAt: '2026-05-01T12:00:00Z',
          }),
          makeOpp({
            id: 'o2',
            pipelineStageId: 'f4c7365b-efe8-4d33-9559-c7f06881f172',
            createdAt: '2026-05-15T12:00:00Z',
          }),
          makeOpp({
            id: 'o3',
            pipelineStageId: '13f095d8-4c87-4637-a6f7-b8d2d294ad0b',
            createdAt: '2026-05-20T12:00:00Z',
          }),
          makeOpp({
            id: 'o4',
            pipelineStageId: 'd69d8656-1836-4d48-8a83-5268895c5c74',
            createdAt: '2026-06-01T12:00:00Z',
          }),
        ],
        total: 4,
      });

      const result = await service.getPipelineMetrics();

      expect(result.monthlyTrend).toHaveLength(2);
      const may = result.monthlyTrend.find((m) => m.month === '2026-05');
      const jun = result.monthlyTrend.find((m) => m.month === '2026-06');
      expect(may?.newLeads).toBe(2);
      expect(may?.trials).toBe(1);
      expect(may?.enrollments).toBe(0);
      expect(jun?.newLeads).toBe(0);
      expect(jun?.enrollments).toBe(1);
    });
  });

  describe('getLeadSourceBreakdown', () => {
    it('counts contacts by source', async () => {
      mockGetContacts.mockResolvedValue({
        data: [
          { source: 'web', id: 'c1' },
          { source: 'Web', id: 'c2' },
          { source: 'referral', id: 'c3' },
          { source: undefined, id: 'c4' },
        ],
        total: 4,
      });

      const result = await service.getLeadSourceBreakdown();

      expect(result['web']).toBe(2);
      expect(result['referral']).toBe(1);
      expect(result['unknown']).toBe(1);
    });

    it('returns empty counts when GHL fails', async () => {
      mockGetContacts.mockRejectedValue(new Error('API error'));

      const result = await service.getLeadSourceBreakdown();

      expect(result).toEqual({ web: 0, whatsapp: 0, referral: 0, event: 0, manual: 0, unknown: 0 });
    });
  });

  describe('getRevenueAttribution', () => {
    it('returns empty array when DB query fails', async () => {
      mockEq.mockResolvedValue({ data: null, error: new Error('DB error') });

      const result = await service.getRevenueAttribution();

      expect(result).toEqual([]);
    });
  });
});
