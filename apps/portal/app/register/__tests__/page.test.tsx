/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from '../page';
import { createCheckoutSession } from '@/lib/checkout';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/lib/checkout', () => ({
  createCheckoutSession: vi.fn(),
}));

describe('RegisterPage Component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders correct initial state', () => {
    render(<RegisterPage />);

    expect(screen.getByRole('heading', { name: /Lanza tu infraestructura/i })).toBeInTheDocument();

    // Check form inputs and labels
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del workspace')).toBeInTheDocument();

    // Check plan selections (role="radio")
    const plans = screen.getAllByRole('radio');
    expect(plans).toHaveLength(2);

    // Default is Startup
    expect(plans[0]).toHaveAttribute('aria-checked', 'true');
    expect(plans[1]).toHaveAttribute('aria-checked', 'false');
  });

  it('handles plan selection changes', async () => {
    render(<RegisterPage />);
    const plans = screen.getAllByRole('radio');

    await act(async () => {
      fireEvent.click(plans[1]); // Choose Business
    });

    expect(plans[0]).toHaveAttribute('aria-checked', 'false');
    expect(plans[1]).toHaveAttribute('aria-checked', 'true');

    const submitBtn = screen.getByRole('button', { name: /Suscribirse por/i });
    expect(submitBtn).toHaveTextContent('Suscribirse por $149/mes');
  });

  it('validates fields and sets correct ARIA attributes on error', async () => {
    render(<RegisterPage />);
    const submitBtn = screen.getByRole('button', { name: /Suscribirse por/i });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    const emailInput = screen.getByLabelText('Correo electrónico');
    const slugInput = screen.getByLabelText('Nombre del workspace');

    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    expect(screen.getByText('El email es obligatorio')).toBeInTheDocument();

    expect(slugInput).toHaveAttribute('aria-invalid', 'true');
    expect(slugInput).toHaveAttribute('aria-describedby', 'slug-desc');
    expect(screen.getByText('El nombre del workspace es obligatorio')).toBeInTheDocument();
  });

  it('submits form and redirects on success', async () => {
    vi.mocked(createCheckoutSession).mockResolvedValue({ url: 'https://stripe.checkout.test/session-123' });

    render(<RegisterPage />);

    const emailInput = screen.getByLabelText('Correo electrónico');
    const slugInput = screen.getByLabelText('Nombre del workspace');

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(slugInput, { target: { value: 'my-custom-slug' } });
    });

    const submitBtn = screen.getByRole('button', { name: /Suscribirse por/i });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(createCheckoutSession).toHaveBeenCalledWith('user@example.com', 'my-custom-slug', 'startup');
    expect(mockPush).toHaveBeenCalledWith('https://stripe.checkout.test/session-123');
  });
});
