/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CredentialReveal } from '../credential-reveal';

describe('CredentialReveal', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders masked password by default', () => {
    render(<CredentialReveal password="secret-password" />);
    expect(screen.getByText('••••••••')).toBeDefined();
    expect(screen.queryByText('secret-password')).toBeNull();
  });

  it('reveals password when clicking Reveal button', async () => {
    render(<CredentialReveal password="secret-password" />);
    const revealButton = screen.getByLabelText('Revelar contraseña');

    fireEvent.click(revealButton);

    expect(screen.getByText('secret-password')).toBeDefined();
    expect(screen.getByLabelText('Ocultar contraseña')).toBeDefined();
  });

  it('copies password to clipboard when clicking Copy button', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });

    render(<CredentialReveal password="secret-password" />);
    const copyButton = screen.getByLabelText('Copiar al portapapeles');

    await fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith('secret-password');
    expect(await screen.findByText('Copiado')).toBeDefined();
    expect(screen.getByLabelText('Copiado al portapapeles')).toBeDefined();
  });

  it('renders em-dash when password is null', () => {
    render(<CredentialReveal password={null} />);
    expect(screen.getByText('—')).toBeDefined();
  });
});
