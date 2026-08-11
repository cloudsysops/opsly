/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
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

describe('RegisterPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders register form, title, and initial startup plan as active', () => {
    render(createElement(RegisterPage));

    // Check title and description
    expect(screen.getByRole('heading', { name: /Lanza tu infraestructura/i })).toBeInTheDocument();

    // Check initial plan buttons and their ARIA attributes
    const startupButton = screen.getByRole('button', { name: /Startup/i });
    const businessButton = screen.getByRole('button', { name: /Business/i });

    expect(startupButton).toHaveAttribute('aria-pressed', 'true');
    expect(businessButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles selected plan on click', async () => {
    render(createElement(RegisterPage));

    const startupButton = screen.getByRole('button', { name: /Startup/i });
    const businessButton = screen.getByRole('button', { name: /Business/i });

    expect(startupButton).toHaveAttribute('aria-pressed', 'true');
    expect(businessButton).toHaveAttribute('aria-pressed', 'false');

    await act(async () => {
      fireEvent.click(businessButton);
    });

    expect(startupButton).toHaveAttribute('aria-pressed', 'false');
    expect(businessButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('displays field errors with appropriate ARIA accessibility attributes when form is invalid', async () => {
    render(createElement(RegisterPage));

    const submitButton = screen.getByRole('button', { name: /Suscribirse por/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Inputs should have aria-invalid set to true
    const emailInput = screen.getByLabelText(/Correo electrónico/i);
    const slugInput = screen.getByLabelText(/Nombre del workspace/i);

    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(slugInput).toHaveAttribute('aria-invalid', 'true');

    // Describedby attributes should reference the error IDs
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    expect(slugInput).toHaveAttribute('aria-describedby', 'slug-error');

    // Error messages should be visible
    expect(screen.getByText('El email es obligatorio')).toHaveAttribute('id', 'email-error');
    expect(screen.getByText('El nombre del workspace es obligatorio')).toHaveAttribute('id', 'slug-error');
  });

  it('submits form successfully and redirects on valid input', async () => {
    vi.mocked(createCheckoutSession).mockResolvedValue({ url: 'https://checkout.stripe.com/test' });

    render(createElement(RegisterPage));

    const emailInput = screen.getByLabelText(/Correo electrónico/i);
    const slugInput = screen.getByLabelText(/Nombre del workspace/i);
    const submitButton = screen.getByRole('button', { name: /Suscribirse por/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@opsly.com' } });
      fireEvent.change(slugInput, { target: { value: 'my-workspace' } });
    });

    // Initially description/invalid attrs should be updated/cleared
    expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    expect(slugInput).toHaveAttribute('aria-invalid', 'false');
    expect(slugInput).toHaveAttribute('aria-describedby', 'slug-helper');

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(createCheckoutSession).toHaveBeenCalledWith('test@opsly.com', 'my-workspace', 'startup');
    expect(mockPush).toHaveBeenCalledWith('https://checkout.stripe.com/test');
  });
});
