/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RegisterPage from '../page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
    };
  },
}));

// Mock @/lib/checkout
vi.mock('@/lib/checkout', () => ({
  createCheckoutSession: vi.fn(),
}));

describe('RegisterPage', () => {
  it('renders correct initial plan selection states and toggles aria-pressed correctly', () => {
    render(<RegisterPage />);

    // By default, 'startup' plan should be selected, so it should have aria-pressed="true"
    const startupButton = screen.getByRole('button', { name: /Startup/ });
    const businessButton = screen.getByRole('button', { name: /Business/ });

    expect(startupButton).toHaveAttribute('aria-pressed', 'true');
    expect(businessButton).toHaveAttribute('aria-pressed', 'false');

    // Click on the Business plan button
    fireEvent.click(businessButton);

    expect(startupButton).toHaveAttribute('aria-pressed', 'false');
    expect(businessButton).toHaveAttribute('aria-pressed', 'true');
  });
});
