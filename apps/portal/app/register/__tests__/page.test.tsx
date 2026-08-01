/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import RegisterPage from '../page';
import { createCheckoutSession } from '@/lib/checkout';

// Mock useRouter from next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock createCheckoutSession from lib/checkout
vi.mock('@/lib/checkout', () => ({
  createCheckoutSession: vi.fn(),
}));

describe('RegisterPage UX and Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly with title, inputs, and pricing buttons', () => {
    render(<RegisterPage />);

    expect(
      screen.getByRole('heading', {
        name: /Lanza tu infraestructura de automatización en minutos/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre del workspace/i)).toBeInTheDocument();

    // Verify startup plan button is selected (pressed) by default, and business is not
    const startupBtn = screen.getByRole('button', { name: /Startup/i });
    const businessBtn = screen.getByRole('button', { name: /Business/i });

    expect(startupBtn).toHaveAttribute('aria-pressed', 'true');
    expect(businessBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles selected plan on button click', async () => {
    render(<RegisterPage />);

    const startupBtn = screen.getByRole('button', { name: /Startup/i });
    const businessBtn = screen.getByRole('button', { name: /Business/i });

    expect(startupBtn).toHaveAttribute('aria-pressed', 'true');
    expect(businessBtn).toHaveAttribute('aria-pressed', 'false');

    await act(async () => {
      fireEvent.click(businessBtn);
    });

    expect(startupBtn).toHaveAttribute('aria-pressed', 'false');
    expect(businessBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows live description help text for slug field by default', () => {
    render(<RegisterPage />);

    const slugInput = screen.getByLabelText(/Nombre del workspace/i);
    const slugDescription = screen.getByText(
      /3-30 caracteres: solo letras minúsculas, números y guiones/i
    );

    expect(slugInput).toHaveAttribute('aria-describedby', 'slug-description');
    expect(slugDescription).toHaveAttribute('id', 'slug-description');
    expect(slugInput).toHaveAttribute('aria-invalid', 'false');
  });

  it('displays validation errors and sets appropriate ARIA attributes upon submitting empty form', async () => {
    render(<RegisterPage />);

    const submitBtn = screen.getByRole('button', { name: /Suscribirse por/i });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    const emailInput = screen.getByLabelText(/Correo electrónico/i);
    const emailError = screen.getByText(/El email es obligatorio/i);
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    expect(emailError).toHaveAttribute('id', 'email-error');

    const slugInput = screen.getByLabelText(/Nombre del workspace/i);
    const slugError = screen.getByText(/El nombre del workspace es obligatorio/i);
    expect(slugInput).toHaveAttribute('aria-invalid', 'true');
    expect(slugInput).toHaveAttribute('aria-describedby', 'slug-error');
    expect(slugError).toHaveAttribute('id', 'slug-error');
  });

  it('performs checkout creation and redirects upon valid submission', async () => {
    vi.mocked(createCheckoutSession).mockResolvedValue({ url: 'https://stripe.com/checkout' });

    render(<RegisterPage />);

    const emailInput = screen.getByLabelText(/Correo electrónico/i);
    const slugInput = screen.getByLabelText(/Nombre del workspace/i);
    const submitBtn = screen.getByRole('button', { name: /Suscribirse por/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'user@opsly.io' } });
      fireEvent.change(slugInput, { target: { value: 'my-workspace' } });
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(createCheckoutSession).toHaveBeenCalledWith(
      'user@opsly.io',
      'my-workspace',
      'startup'
    );
    expect(mockPush).toHaveBeenCalledWith('https://stripe.com/checkout');
  });
});
