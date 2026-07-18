/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InsightDashboard } from '../dashboard/insight-dashboard';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="recharts-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="barchart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="xaxis" />,
  YAxis: () => <div data-testid="yaxis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const mockSession = {
  data: {
    session: {
      access_token: 'mocked-token',
    },
  },
  error: null,
};

const mockGetSession = vi.fn().mockResolvedValue(mockSession);

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}));

vi.mock('@/lib/api', () => ({
  getApiBaseUrl: () => 'http://test-api.opsly.com',
}));

vi.mock('@/lib/portal-api-paths', () => ({
  portalTenantInsightsUrl: (base: string, slug: string) => `${base}/tenants/${slug}/insights`,
}));

const mockInsights = [
  {
    id: 'insight-1',
    insight_type: 'churn_risk',
    title: 'Riesgo de Churn Alto',
    summary: 'El usuario no ha interactuado en 30 días',
    confidence: 0.85,
    impact_score: 8,
    read_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'insight-2',
    insight_type: 'revenue_forecast',
    title: 'Predicción de aumento de gasto',
    summary: 'Se espera un incremento del 20% el próximo mes',
    confidence: 0.9,
    impact_score: 5,
    read_at: null,
    created_at: new Date().toISOString(),
  },
];

describe('InsightDashboard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders correctly with insights list and chart', () => {
    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    expect(screen.getByText('Inteligencia predictiva')).toBeInTheDocument();
    expect(screen.getByText('Riesgo de Churn Alto')).toBeInTheDocument();
    expect(screen.getByText('Predicción de aumento de gasto')).toBeInTheDocument();
  });

  it('handles marking insight as read with busy states, spinner, and announcer updates', async () => {
    let resolvePatchPromise: any;
    const patchPromise = new Promise((resolve) => {
      resolvePatchPromise = resolve;
    });

    const mockFetch = vi.fn().mockImplementation(() =>
      patchPromise.then(() => ({
        ok: true,
      }))
    );
    vi.stubGlobal('fetch', mockFetch);

    render(<InsightDashboard tenantSlug="test-tenant" insights={[mockInsights[0]]} />);

    const readBtn = screen.getByRole('button', { name: 'Marcar leído' });
    const dismissBtn = screen.getByRole('button', { name: 'Descartar' });

    await act(async () => {
      fireEvent.click(readBtn);
    });

    // Button should show spinner & loading text
    expect(screen.getByText('Marcando leído…')).toBeInTheDocument();

    // Verify other buttons on this card are disabled
    expect(readBtn).toBeDisabled();
    expect(dismissBtn).toBeDisabled();

    await act(async () => {
      resolvePatchPromise();
      await patchPromise;
    });

    // After resolution, loading state is gone, and announcer gets called
    expect(screen.queryByText('Marcando leído…')).not.toBeInTheDocument();
    expect(screen.getByText('Insight marcado como leído correctamente')).toBeInTheDocument();
  });

  it('handles dismissing insight with busy states, spinner, and announcer updates', async () => {
    let resolvePatchPromise: any;
    const patchPromise = new Promise((resolve) => {
      resolvePatchPromise = resolve;
    });

    const mockFetch = vi.fn().mockImplementation(() =>
      patchPromise.then(() => ({
        ok: true,
      }))
    );
    vi.stubGlobal('fetch', mockFetch);

    render(<InsightDashboard tenantSlug="test-tenant" insights={[mockInsights[0]]} />);

    const dismissBtn = screen.getByRole('button', { name: 'Descartar' });

    await act(async () => {
      fireEvent.click(dismissBtn);
    });

    // Button should show spinner & loading text
    expect(screen.getByText('Descartando…')).toBeInTheDocument();

    await act(async () => {
      resolvePatchPromise();
      await patchPromise;
    });

    // The insight card is removed upon successful dismissal
    expect(screen.queryByText('Riesgo de Churn Alto')).not.toBeInTheDocument();
    expect(screen.getByText('Insight descartado correctamente')).toBeInTheDocument();
  });
});
