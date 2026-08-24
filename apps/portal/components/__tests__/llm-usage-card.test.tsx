/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LlmUsageCard } from '../llm-usage-card';
import type { PortalUsageSnapshot } from '@/types';

describe('LlmUsageCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders section heading and accessibility landmarks correctly', () => {
    const usage: PortalUsageSnapshot = {
      today: null,
      month: null,
    };

    render(<LlmUsageCard usage={usage} />);

    const section = screen.getByRole('region', { name: /uso de ia \(llm\)/i });
    expect(section).toBeInTheDocument();

    const heading = screen.getByRole('heading', { name: /uso de ia \(llm\)/i, level: 2 });
    expect(heading).toHaveAttribute('id', 'llm-usage-heading');
  });

  it('renders empty fallback state when no data is available', () => {
    const usage: PortalUsageSnapshot = {
      today: null,
      month: null,
    };

    render(<LlmUsageCard usage={usage} />);

    expect(
      screen.getByText(/no pudimos cargar las métricas en este momento/i)
    ).toBeInTheDocument();
  });

  it('renders metric cards with correct aria labels and titles when usage data is provided', () => {
    const usage: PortalUsageSnapshot = {
      today: {
        tenant: 'tenant-demo',
        period: 'today',
        requests: 42,
        tokens_input: 1200,
        tokens_output: 350,
        cost_usd: 0.0045,
        cache_hits: 36,
        cache_hit_rate: 85,
      },
      month: {
        tenant: 'tenant-demo',
        period: 'month',
        requests: 1250,
        tokens_input: 45000,
        tokens_output: 12000,
        cost_usd: 0.185,
        cache_hits: 1150,
        cache_hit_rate: 92,
      },
    };

    render(<LlmUsageCard usage={usage} />);

    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('Este mes')).toBeInTheDocument();

    expect(screen.getByLabelText(/tokens de entrada, 350 tokens de salida/i)).toBeInTheDocument();
    expect(screen.getByLabelText('85 por ciento de aciertos en caché')).toBeInTheDocument();

    expect(screen.getByLabelText(/tokens de entrada, 12\.000 tokens de salida/i)).toBeInTheDocument();
    expect(screen.getByLabelText('92 por ciento de aciertos en caché')).toBeInTheDocument();

    expect(screen.getByText(/el coste mensual se factura según uso real/i)).toBeInTheDocument();
  });
});
