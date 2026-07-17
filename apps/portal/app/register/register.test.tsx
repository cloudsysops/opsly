/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import RegisterPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/checkout', () => ({
  createCheckoutSession: vi.fn(),
}));

describe('RegisterPage Accessibility & UX', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders the interactive plan buttons with aria-pressed', () => {
    render(<RegisterPage />);

    // The default selected plan is startup
    const startupBtn = screen.getByRole('button', { name: /Startup/ });
    const businessBtn = screen.getByRole('button', { name: /Business/ });

    expect(startupBtn).toHaveAttribute('aria-pressed', 'true');
    expect(businessBtn).toHaveAttribute('aria-pressed', 'false');

    // Click on the business plan button
    fireEvent.click(businessBtn);

    expect(startupBtn).toHaveAttribute('aria-pressed', 'false');
    expect(businessBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('displays field errors with proper aria attributes upon validation failure', async () => {
    render(<RegisterPage />);

    // By default, Startup plan is selected. Let's find the submit button specifically by matching the price.
    const submitBtn = screen.getByRole('button', { name: /Suscribirse por \$49\/mes/i });
    fireEvent.click(submitBtn);

    // Wait for the field errors to be displayed
    await waitFor(() => {
      const emailInput = screen.getByLabelText(/Correo electrónico/i);
      const slugInput = screen.getByLabelText(/Nombre del workspace/i);

      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');

      const emailError = screen.getByText(/El email es obligatorio/i);
      expect(emailError).toHaveAttribute('id', 'email-error');
      expect(emailError).toHaveAttribute('role', 'alert');

      expect(slugInput).toHaveAttribute('aria-invalid', 'true');
      expect(slugInput).toHaveAttribute('aria-describedby', 'slug-error');

      const slugError = screen.getByText(/El nombre del workspace es obligatorio/i);
      expect(slugError).toHaveAttribute('id', 'slug-error');
      expect(slugError).toHaveAttribute('role', 'alert');
    });
  });
});
