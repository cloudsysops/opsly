/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KPICard } from '../dashboard/kpi-card';

describe('KPICard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders non-interactive KPI card with title, value, and subtitle', () => {
    render(
      <KPICard
        title="Peticiones IA"
        value={1250}
        subtitle="Últimas 24 horas"
        icon="⚡"
      />
    );

    expect(screen.getByText('Peticiones IA')).toBeInTheDocument();
    expect(screen.getByText(/1.?250/)).toBeInTheDocument();
    expect(screen.getByText('Últimas 24 horas')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders positive trend with accessible screen reader label', () => {
    render(<KPICard title="Conversiones" value="85%" trend={12.5} />);

    const trendElement = screen.getByLabelText('Aumento del 12.5%');
    expect(trendElement).toBeInTheDocument();
    expect(trendElement).toHaveTextContent('↑ 12.5%');
  });

  it('renders negative trend with accessible screen reader label', () => {
    render(<KPICard title="Latencia" value="45ms" trend={-8.2} />);

    const trendElement = screen.getByLabelText('Disminución del 8.2%');
    expect(trendElement).toBeInTheDocument();
    expect(trendElement).toHaveTextContent('↓ 8.2%');
  });

  it('supports interactive onClick with button role and keyboard navigation', () => {
    const handleClick = vi.fn();
    render(
      <KPICard
        title="Costo mensual"
        value="$120.00"
        onClick={handleClick}
      />
    );

    const card = screen.getByRole('button', { name: /costo mensual/i });
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('tabindex', '0');

    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(card, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });
});
