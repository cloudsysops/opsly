/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InsightDashboard } from '../dashboard/insight-dashboard';
import type { PortalInsightItem } from '@/types';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Bar: () => <div data-testid="bar" />,
}));

vi.mock('@/lib/api', () => ({
  getApiBaseUrl: () => 'https://test-api.opsly.com',
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: () =>
        Promise.resolve({
          data: {
            session: {
              access_token: 'fake-token',
            },
          },
        }),
    },
  }),
}));

const mockInsights: PortalInsightItem[] = [
  {
    id: 'insight-1',
    tenant_id: 'tenant-123',
    insight_type: 'churn_risk',
    title: 'Riesgo Churn Alto',
    summary: 'El uso disminuyó un 50% la última semana.',
    payload: { source: 'test' },
    impact_score: 8,
    confidence: 0.85,
    status: 'open',
    read_at: null,
    actioned_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'insight-2',
    tenant_id: 'tenant-123',
    insight_type: 'usage_anomaly',
    title: 'Pico de Uso Detectado',
    summary: 'Se observó una anomalía en las solicitudes de API.',
    payload: { source: 'test' },
    impact_score: 5,
    confidence: 0.9,
    status: 'open',
    read_at: null,
    actioned_at: null,
    created_at: new Date().toISOString(),
  },
];

describe('InsightDashboard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders correctly with a list of insights', () => {
    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    expect(screen.getByText('Inteligencia predictiva')).toBeInTheDocument();
    expect(screen.getByText('Riesgo Churn Alto')).toBeInTheDocument();
    expect(screen.getByText('El uso disminuyó un 50% la última semana.')).toBeInTheDocument();
    expect(screen.getByText('Pico de Uso Detectado')).toBeInTheDocument();
  });

  it('handles empty insights state', () => {
    render(<InsightDashboard tenantSlug="test-tenant" insights={[]} />);

    expect(
      screen.getByText(
        'Aún no hay insights. Tras registrar uso de IA, el job diario puede generar alertas de tendencia y anomalías.'
      )
    ).toBeInTheDocument();
  });

  it('marks an insight as read and updates the announcement', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    render(<InsightDashboard tenantSlug="test-tenant" insights={[mockInsights[0]]} />);

    const readBtn = screen.getByRole('button', { name: /marcar "Riesgo Churn Alto" como leído/i });

    await act(async () => {
      fireEvent.click(readBtn);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://test-api.opsly.com/api/portal/tenant/test-tenant/insights',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ insight_id: 'insight-1', action: 'read' }),
      })
    );

    expect(screen.getByText('Insight marcado como leído con éxito')).toBeInTheDocument();
    expect(screen.getByText(/· Leído/i)).toBeInTheDocument();
  });

  it('dismisses an insight and updates the announcement', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    render(<InsightDashboard tenantSlug="test-tenant" insights={[mockInsights[0]]} />);

    const dismissBtn = screen.getByRole('button', { name: /descartar "Riesgo Churn Alto"/i });

    await act(async () => {
      fireEvent.click(dismissBtn);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://test-api.opsly.com/api/portal/tenant/test-tenant/insights',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ insight_id: 'insight-1', action: 'dismiss' }),
      })
    );

    expect(screen.queryByText('Riesgo Churn Alto')).not.toBeInTheDocument();
    expect(screen.getByText('Insight descartado con éxito')).toBeInTheDocument();
  });
});
