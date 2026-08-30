/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge, healthFromReachable } from '../status-badge';

describe('StatusBadge', () => {
  it('renders healthy status with default label and indicator dot', () => {
    const { container } = render(<StatusBadge state="healthy" />);
    expect(screen.getByText('healthy')).toBeInTheDocument();

    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('bg-ops-green');
  });

  it('renders unhealthy status with custom label and indicator dot', () => {
    const { container } = render(<StatusBadge state="unhealthy" label="Desconectado" />);
    expect(screen.getByText('Desconectado')).toBeInTheDocument();

    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('bg-ops-red');
  });

  it('renders unknown status with default label and indicator dot', () => {
    const { container } = render(<StatusBadge state="unknown" />);
    expect(screen.getByText('unknown')).toBeInTheDocument();

    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('bg-ops-gray');
  });

  it('converts reachability boolean to health state correctly', () => {
    expect(healthFromReachable(true)).toBe('healthy');
    expect(healthFromReachable(false)).toBe('unhealthy');
  });
});
