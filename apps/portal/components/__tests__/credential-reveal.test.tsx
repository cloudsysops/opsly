/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CredentialReveal } from '../credential-reveal';

describe('CredentialReveal', () => {
  const password = 'secret-password-123';

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock navigator.clipboard.writeText
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('hides the password by default', () => {
    render(<CredentialReveal password={password} />);
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText(password)).not.toBeInTheDocument();
  });

  it('reveals the password when "Revelar" is clicked', () => {
    render(<CredentialReveal password={password} />);
    const revealButton = screen.getByRole('button', { name: /revelar contraseña/i });

    fireEvent.click(revealButton);

    expect(screen.getByText(password)).toBeInTheDocument();
    expect(screen.queryByText('••••••••')).not.toBeInTheDocument();
    expect(screen.getByText('(30s)')).toBeInTheDocument();
  });

  it('hides the password after 30 seconds', () => {
    render(<CredentialReveal password={password} />);
    const revealButton = screen.getByRole('button', { name: /revelar contraseña/i });

    fireEvent.click(revealButton);
    expect(screen.getByText(password)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText(password)).not.toBeInTheDocument();
  });

  it('copies the password and shows "Copiado" state', async () => {
    render(<CredentialReveal password={password} />);
    const copyButton = screen.getByRole('button', { name: /copiar al portapapeles/i });

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(password);
    expect(screen.getByText('Copiado')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('Copiar')).toBeInTheDocument();
  });

  it('renders a dash when password is null', () => {
    render(<CredentialReveal password={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
