/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusBadge, healthFromReachable } from '../status-badge';

describe('StatusBadge', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders healthy state with default label and aria-hidden dot', () => {
    const { container } = render(<StatusBadge state="healthy" />);
    expect(screen.getByText('healthy')).toBeInTheDocument();

    const dot = container.querySelector('span > span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('bg-ops-green');
  });

  it('renders unhealthy state with default label and aria-hidden dot', () => {
    const { container } = render(<StatusBadge state="unhealthy" />);
    expect(screen.getByText('unhealthy')).toBeInTheDocument();

    const dot = container.querySelector('span > span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('bg-ops-red');
  });

  it('renders unknown state with default label and aria-hidden dot', () => {
    const { container } = render(<StatusBadge state="unknown" />);
    expect(screen.getByText('unknown')).toBeInTheDocument();

    const dot = container.querySelector('span > span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('bg-ops-gray');
  });

  it('renders custom label when provided', () => {
    render(<StatusBadge state="healthy" label="Operational" />);
    expect(screen.getByText('Operational')).toBeInTheDocument();
  });

  it('correctly maps reachable boolean in healthFromReachable helper', () => {
    expect(healthFromReachable(true)).toBe('healthy');
    expect(healthFromReachable(false)).toBe('unhealthy');
  });
});
