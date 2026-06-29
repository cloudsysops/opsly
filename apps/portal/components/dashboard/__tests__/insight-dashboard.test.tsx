/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InsightDashboard, insightLabel } from '../insight-dashboard';

// Mock Recharts to avoid issues with ResponsiveContainer and SVG
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: any }) => <div>{children}</div>,
  BarChart: ({ children }: { children: any }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Bar: () => null,
}));

describe('InsightDashboard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockInsights = [
    {
      id: 'insight-1',
      insight_type: 'churn_risk',
      title: 'Risk of Churn',
      summary: 'High risk detected',
      impact_score: 80,
      confidence: 0.9,
      read_at: null,
    },
    {
      id: 'insight-2',
      insight_type: 'unknown_type',
      title: 'Unknown Insight',
      summary: 'Summary here',
      impact_score: 50,
      confidence: 0.7,
      read_at: '2025-01-01T00:00:00Z',
    },
  ];

  it('renders insights and uses Title Case for unknown types', () => {
    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    expect(screen.getByText('Risk of Churn')).toBeInTheDocument();
    expect(screen.getByText('Unknown Insight')).toBeInTheDocument();

    // Directly test the exported insightLabel utility
    expect(insightLabel('unknown_type')).toBe('Unknown Type');
    expect(insightLabel('another_one')).toBe('Another One');
    expect(insightLabel('churn_risk')).toBe('Riesgo de desinterés');
  });

  it('renders buttons with correct accessibility attributes', () => {
    render(<InsightDashboard tenantSlug="test-tenant" insights={mockInsights} />);

    const readButtons = screen.getAllByRole('button', { name: /marcar como leído/i });
    expect(readButtons[0]).toHaveAttribute('title', 'Marcar como leído');

    const dismissButtons = screen.getAllByRole('button', { name: /descartar insight/i });
    expect(dismissButtons[0]).toHaveAttribute('title', 'Descartar insight');
  });
});
