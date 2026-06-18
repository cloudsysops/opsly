/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { CredentialReveal } from '../credential-reveal';
import '@testing-library/jest-dom';

describe('CredentialReveal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders masked password initially', () => {
    render(<CredentialReveal password="my-secret-password" />);
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText('my-secret-password')).not.toBeInTheDocument();
  });

  it('reveals password when clicking reveal button', async () => {
    render(<CredentialReveal password="my-secret-password" />);
    const revealBtn = screen.getByRole('button', { name: /revelar contraseña/i });

    await fireEvent.click(revealBtn);

    expect(screen.getByText('my-secret-password')).toBeInTheDocument();
    expect(screen.getByText('(30s)')).toBeInTheDocument();
  });

  it('copies password to clipboard and shows feedback', async () => {
    render(<CredentialReveal password="my-secret-password" />);
    const copyBtn = screen.getByRole('button', { name: /copiar contraseña/i });

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('my-secret-password');
    expect(screen.getByText('Copiado')).toBeInTheDocument();
    expect(copyBtn).toBeDisabled();

    // Fast-forward 2 seconds
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Copiado')).not.toBeInTheDocument();
    expect(screen.getByText('Copiar')).toBeInTheDocument();
    expect(copyBtn).not.toBeDisabled();
  });
});
