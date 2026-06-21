/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CredentialReveal } from '../credential-reveal';

describe('CredentialReveal', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders masked password initially', () => {
    render(<CredentialReveal password="my-secret-password" />);
    expect(screen.getByText('••••••••')).toBeDefined();
    expect(screen.queryByText('my-secret-password')).toBeNull();
  });

  it('shows password when reveal button is clicked', async () => {
    render(<CredentialReveal password="my-secret-password" />);
    const revealButton = screen.getByRole('button', { name: /revelar contraseña/i });

    await fireEvent.click(revealButton);

    expect(screen.getByText('my-secret-password')).toBeDefined();
    expect(screen.queryByText('••••••••')).toBeNull();
  });

  it('toggles visibility when clicked multiple times', async () => {
    render(<CredentialReveal password="my-secret-password" />);
    const button = screen.getByRole('button', { name: /revelar contraseña/i });

    // Reveal
    await fireEvent.click(button);
    expect(screen.getByText('my-secret-password')).toBeDefined();

    // Hide
    const hideButton = screen.getByRole('button', { name: /ocultar contraseña/i });
    await fireEvent.click(hideButton);
    expect(screen.getByText('••••••••')).toBeDefined();
  });

  it('copies password to clipboard and shows success state', async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CredentialReveal password="my-secret-password" />);
    const copyButton = screen.getByRole('button', { name: /copiar contraseña/i });

    await act(async () => {
      await fireEvent.click(copyButton);
    });

    expect(writeTextMock).toHaveBeenCalledWith('my-secret-password');
    expect(screen.getByText('Copiado')).toBeDefined();

    // Should reset after 2 seconds
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Copiado')).toBeNull();
    expect(screen.getByText('Copiar')).toBeDefined();
  });

  it('automatically hides after 30 seconds', async () => {
    vi.useFakeTimers();
    render(<CredentialReveal password="my-secret-password" />);

    const revealButton = screen.getByRole('button', { name: /revelar contraseña/i });
    await fireEvent.click(revealButton);

    expect(screen.getByText('my-secret-password')).toBeDefined();

    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByText('••••••••')).toBeDefined();
    expect(screen.queryByText('my-secret-password')).toBeNull();
  });
});
