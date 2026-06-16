/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CredentialReveal } from '../credential-reveal';

describe('CredentialReveal', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders masked password by default', () => {
    render(<CredentialReveal password="secret-password" />);
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText('secret-password')).not.toBeInTheDocument();
  });

  it('reveals password when clicking Reveal button', () => {
    render(<CredentialReveal password="secret-password" />);
    const revealButton = screen.getByRole('button', { name: /Revelar contraseña/i });
    fireEvent.click(revealButton);
    expect(screen.getByText('secret-password')).toBeInTheDocument();
  });

  it('copies password to clipboard and shows "Copiado" state', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CredentialReveal password="secret-password" />);
    const copyButton = screen.getByRole('button', { name: /Copiar contraseña/i });

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeTextMock).toHaveBeenCalledWith('secret-password');
    expect(screen.getByText(/Copiado/i)).toBeInTheDocument();
  });

  it('resets "Copiado" state after timeout', async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CredentialReveal password="secret-password" />);
    const copyButton = screen.getByRole('button', { name: /Copiar contraseña/i });

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(screen.getByText(/Copiado/i)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.getByText(/Copiar/i)).toBeInTheDocument();
    expect(screen.queryByText(/Copiado/i)).not.toBeInTheDocument();
  });
});
