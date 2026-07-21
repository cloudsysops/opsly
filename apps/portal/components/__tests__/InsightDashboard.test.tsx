/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InsightDashboard } from '../dashboard/insight-dashboard';
import { createClient } from '@/lib/supabase/client';
import type { PortalInsightItem } from '@/types';

vi.mock('@/lib/api', () => ({
  getApiBaseUrl: () => 'https://api.opsly.test',
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock recharts because SVG charting components can throw errors in jsdom environment
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: any }) => <div data-testid="chart">{children}</div>,
  BarChart: ({ children }: { children: any }) => <div data-testid="bar-chart">{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Bar: () => null,
}));

const mockInsights: PortalInsightItem[] = [
  {
    id: 'insight-1',
    tenant_id: 'tenant-123',
    insight_type: 'churn_risk',
    title: 'Posible desinterés detectado',
    summary: 'El uso de n8n ha disminuido un 40% esta semana.',
    payload: {},
    confidence: 0.85,
    impact_score: 8,
    status: 'active',
    read_at: null,
    actioned_at: null,
    created_at: new Date().toISOString(),
  },
];

describe('InsightDashboard Micro-UX & Accessibility', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders insights and supports operations with loader spinner and announcements', async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      data: { session: { access_token: 'valid-token' } },
      error: null,
    });

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getSession: mockGetSession,
      },
    } as any);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    expect(screen.getByText('Posible desinterés detectado')).toBeInTheDocument();
    expect(screen.getByText('El uso de n8n ha disminuido un 40% esta semana.')).toBeInTheDocument();

    const readButton = screen.getByRole('button', { name: /marcar leído/i });
    expect(readButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(readButton);
    });

    // Verify it updates announcer with process/complete statuses
    const announcer = screen.getByRole('status');
    expect(announcer).toBeInTheDocument();
    expect(announcer.textContent).toContain('correctamente');

    // Verify API was called
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows empty state description when there are no insights', () => {
    render(<InsightDashboard tenantSlug="test-tenant" insights={[]} />);
    expect(screen.getByText(/Aún no hay insights/i)).toBeInTheDocument();
  });
});
