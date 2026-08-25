/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CredentialReveal } from '../credential-reveal';

describe('CredentialReveal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders masked password by default', () => {
    render(<CredentialReveal password="secret-password" />);
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText('secret-password')).not.toBeInTheDocument();
  });

  it('reveals password when clicking reveal button', async () => {
    render(<CredentialReveal password="secret-password" />);
    const revealButton = screen.getByRole('button', { name: /revelar contraseña/i });

    await act(async () => {
        fireEvent.click(revealButton);
    });

    expect(screen.getByText('secret-password')).toBeInTheDocument();
    expect(screen.queryByText('••••••••')).not.toBeInTheDocument();
  });

  it('copies password to clipboard and shows success message', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<CredentialReveal password="secret-password" />);
    const copyButton = screen.getByRole('button', { name: /copiar al portapapeles/i });

    await act(async () => {
        fireEvent.click(copyButton);
    });

    expect(mockWriteText).toHaveBeenCalledWith('secret-password');
    expect(screen.getByText('Copiado')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Contraseña copiada al portapapeles');
  });

  it('reverts copy message after timeout', async () => {
    vi.useFakeTimers();
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<CredentialReveal password="secret-password" />);
    const copyButton = screen.getByRole('button', { name: /copiar al portapapeles/i });

    await act(async () => {
        fireEvent.click(copyButton);
    });

    expect(screen.getByText('Copiado')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Copiado')).not.toBeInTheDocument();
    expect(screen.getByText('Copiar')).toBeInTheDocument();
  });
});
