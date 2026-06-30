/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InsightDashboard } from '../dashboard/insight-dashboard';
import type { PortalInsightItem } from '@/types';

// Mock getApiBaseUrl
vi.mock('@/lib/api', () => ({
  getApiBaseUrl: () => 'http://test-api.opsly.com',
}));

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'fake-token' } },
        error: null,
      }),
    },
  }),
}));

const mockInsights: PortalInsightItem[] = [
  {
    id: 'insight-1',
    tenant_id: 'tenant-1',
    insight_type: 'churn_risk',
    title: 'Riesgo de fuga',
    summary: 'El usuario no ha entrado en 30 días',
    impact_score: 80,
    confidence: 0.9,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    read_at: null,
    metadata: {},
  },
];

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

describe('InsightDashboard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders insights and handles "Marcar leído"', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    expect(screen.getByText('Riesgo de fuga')).toBeInTheDocument();

    const readButton = screen.getByRole('button', { name: /marcar leído/i });

    await act(async () => {
      fireEvent.click(readButton);
    });

    expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/insights'),
        expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ insight_id: 'insight-1', action: 'read' }),
        })
    );
  });

  it('shows loading state and disables buttons during action', async () => {
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    const mockFetch = vi.fn().mockReturnValue(fetchPromise);
    vi.stubGlobal('fetch', mockFetch);

    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    const readButton = screen.getByRole('button', { name: /marcar leído/i });
    const dismissButton = screen.getByRole('button', { name: /descartar/i });

    // Trigger action
    let patchPromise: Promise<void>;
    await act(async () => {
       patchPromise = (async () => {
         fireEvent.click(readButton);
       })();
    });

    // Check loading state
    expect(readButton).toBeDisabled();
    expect(dismissButton).toBeDisabled();
    expect(readButton.getAttribute('aria-busy')).toBe('true');

    // Resolve fetch
    await act(async () => {
      resolveFetch!({
        ok: true,
        json: () => Promise.resolve({}),
      });
      await Promise.resolve();
    });

    await act(async () => {
        await patchPromise!;
    });

    // After "read", the read button remains disabled because it's already read
    // The name should change to "Leído"
    expect(screen.getByRole('button', { name: /leído/i })).toBeDisabled();
    // But the dismiss button should be enabled again (it was only disabled because of busyAction)
    expect(dismissButton).not.toBeDisabled();
    expect(readButton.getAttribute('aria-busy')).toBe('false');
  });
});
