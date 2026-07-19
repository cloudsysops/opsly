/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InsightDashboard } from '../dashboard/insight-dashboard';
import type { PortalInsightItem } from '@/types';

// Mock getApiBaseUrl to return a consistent string
vi.mock('@/lib/api', () => ({
  getApiBaseUrl: () => 'http://test-api.opsly.com',
}));

// Mock Supabase Client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
        error: null,
      }),
    },
  }),
}));

// Mock Recharts ResponsiveContainer to render its children directly
vi.mock('recharts', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: '100%', height: '100%' }}>{children}</div>
    ),
  };
});

const mockInsights: PortalInsightItem[] = [
  {
    id: 'insight-1',
    tenant_id: 'tenant-1',
    insight_type: 'usage_anomaly',
    title: 'Anomalía de uso',
    summary: 'Se detectó un pico en las peticiones.',
    payload: {},
    confidence: 0.95,
    impact_score: 80,
    status: 'open',
    read_at: null,
    actioned_at: null,
    created_at: '2026-05-02T00:00:00.000Z',
  },
];

describe('InsightDashboard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders insights and details correctly', () => {
    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    expect(screen.getByText('Anomalía de uso')).toBeInTheDocument();
    expect(screen.getByText('Se detectó un pico en las peticiones.')).toBeInTheDocument();
    expect(screen.getByText(/Confianza 95%/i)).toBeInTheDocument();
  });

  it('granularly disables buttons and announces status via Announcer when "Marcar leído" is clicked', async () => {
    let resolveRequest: () => void = () => {};
    const fetchPromise = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    const mockFetch = vi.fn().mockImplementation(() =>
      fetchPromise.then(() => ({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }))
    );
    vi.stubGlobal('fetch', mockFetch);

    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    const readBtn = screen.getByRole('button', { name: /marcar leído/i });
    const dismissBtn = screen.getByRole('button', { name: /descartar/i });

    // Announcer should be empty initially
    const announcer = screen.getByRole('status');
    expect(announcer).toHaveTextContent('');

    await act(async () => {
      fireEvent.click(readBtn);
    });

    // Announcer should announce the progress
    expect(announcer).toHaveTextContent('Marcando insight como leído...');

    // Buttons should be disabled during operation
    expect(readBtn).toBeDisabled();
    expect(dismissBtn).toBeDisabled();

    // Complete the fetch request
    await act(async () => {
      resolveRequest();
    });

    // Announcer should announce completion
    expect(announcer).toHaveTextContent('Insight marcado como leído');

    // Buttons are released
    expect(readBtn).toBeDisabled(); // Disabled because the insight is now marked as read
    expect(dismissBtn).not.toBeDisabled(); // Descartar is fully enabled/released
  });

  it('shows empty state when no insights are available', () => {
    render(<InsightDashboard tenantSlug="test-tenant" insights={[]} />);

    expect(screen.getByText(/Aún no hay insights/i)).toBeInTheDocument();
  });
});
