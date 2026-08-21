/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusBadge, healthFromReachable } from '../status-badge';

describe('StatusBadge', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders default healthy status badge with indicator dot', () => {
    const { container } = render(<StatusBadge state="healthy" />);
    expect(screen.getByText('healthy')).toBeInTheDocument();

    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('rounded-full', 'bg-current');
  });

  it('renders default unhealthy status badge', () => {
    render(<StatusBadge state="unhealthy" />);
    expect(screen.getByText('unhealthy')).toBeInTheDocument();
  });

  it('renders default unknown status badge', () => {
    render(<StatusBadge state="unknown" />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  it('renders custom label when provided', () => {
    render(<StatusBadge state="healthy" label="⚡ Implementando" />);
    expect(screen.getByText('⚡ Implementando')).toBeInTheDocument();
  });

  it('correctly calculates health state from reachability', () => {
    expect(healthFromReachable(true)).toBe('healthy');
    expect(healthFromReachable(false)).toBe('unhealthy');
  });
});
