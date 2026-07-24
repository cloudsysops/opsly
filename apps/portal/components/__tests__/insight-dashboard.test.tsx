/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InsightDashboard } from '../dashboard/insight-dashboard';
import { PORTAL_DEMO_COOKIE } from '@/lib/demo-tenant';
import type { PortalInsightItem } from '@/types';

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  XAxis: () => <div data-testid="xaxis" />,
  YAxis: () => <div data-testid="yaxis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Bar: () => <div data-testid="bar" />,
}));

// Mock API pathways
vi.mock('@/lib/api', () => ({
  getApiBaseUrl: () => 'http://test-api.opsly.com',
}));

vi.mock('@/lib/portal-api-paths', () => ({
  portalTenantInsightsUrl: () => 'http://test-api.opsly.com/api/insights',
}));

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'fake-token' } },
        error: null,
      }),
    },
  })),
}));

const mockInsights: PortalInsightItem[] = [
  {
    id: 'insight-1',
    tenant_id: 'tenant-1',
    insight_type: 'churn_risk',
    title: 'Riesgo de Churn Alto',
    summary: 'Se detectó inactividad prolongada.',
    payload: {},
    confidence: 0.85,
    impact_score: 80,
    status: 'open',
    read_at: null,
    actioned_at: null,
    created_at: '2026-05-01T00:00:00.000Z',
  },
];

describe('InsightDashboard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.cookie = `${PORTAL_DEMO_COOKIE}=; path=/; max-age=0`;
  });

  it('renders insights lists and chart container', () => {
    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);
    expect(screen.getByText('Riesgo de Churn Alto')).toBeInTheDocument();
    expect(screen.getByText('Se detectó inactividad prolongada.')).toBeInTheDocument();
  });

  it('handles read action with mock fetch successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    const readBtn = screen.getByRole('button', { name: 'Marcar leído' });
    await act(async () => {
      fireEvent.click(readBtn);
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(screen.getByText('Insight marcado como leído')).toBeInTheDocument();
  });

  it('handles dismiss action with mock fetch successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    const dismissBtn = screen.getByRole('button', { name: 'Descartar' });
    await act(async () => {
      fireEvent.click(dismissBtn);
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(screen.getByText('Insight descartado')).toBeInTheDocument();
    expect(screen.queryByText('Riesgo de Churn Alto')).not.toBeInTheDocument();
  });

  it('disables buttons during busyAction', async () => {
    // Return a slow promise for fetch to keep busyAction active
    let resolveFetch: any;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal('fetch', () => fetchPromise);

    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    const readBtn = screen.getByRole('button', { name: 'Marcar leído' });
    const dismissBtn = screen.getByRole('button', { name: 'Descartar' });

    await act(async () => {
      fireEvent.click(readBtn);
    });

    expect(readBtn).toBeDisabled();
    expect(dismissBtn).toBeDisabled();
    expect(readBtn).toHaveTextContent('Procesando...');

    await act(async () => {
      resolveFetch({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('supports demo-mode simulation with timeout delay', async () => {
    vi.useFakeTimers();

    // Set demo cookie
    document.cookie = `${PORTAL_DEMO_COOKIE}=1; path=/; SameSite=Lax`;
    vi.stubGlobal('location', { hostname: 'localhost' });

    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    const readBtn = screen.getByRole('button', { name: 'Marcar leído' });
    const dismissBtn = screen.getByRole('button', { name: 'Descartar' });

    await act(async () => {
      fireEvent.click(readBtn);
    });

    // Check that button is in loading state
    expect(readBtn).toBeDisabled();
    expect(dismissBtn).toBeDisabled();
    expect(readBtn).toHaveTextContent('Procesando...');

    // Fast-forward 800ms
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(screen.getByText('Insight marcado como leído')).toBeInTheDocument();
  });
});
