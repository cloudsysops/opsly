/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeveloperActions } from '../developer-actions';

describe('DeveloperActions', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders copy buttons when props are provided', () => {
    render(
      <DeveloperActions
        n8nUrl="https://n8n.example.com"
        n8nUser="admin"
        n8nPassword="secretpassword"
      />
    );

    expect(screen.getByRole('button', { name: /copiar url n8n/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar credenciales/i })).toBeInTheDocument();
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('copies URL and updates status message live region', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(
      <DeveloperActions
        n8nUrl="https://n8n.example.com"
        n8nUser="admin"
        n8nPassword="secretpassword"
      />
    );

    const copyUrlButton = screen.getByRole('button', { name: /copiar url n8n/i });

    await act(async () => {
      fireEvent.click(copyUrlButton);
    });

    expect(mockWriteText).toHaveBeenCalledWith('https://n8n.example.com');
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent('URL copiado');
    expect(screen.getByRole('button', { name: /url n8n copiada/i })).toBeInTheDocument();
  });

  it('copies credentials and updates status message live region', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(
      <DeveloperActions
        n8nUrl="https://n8n.example.com"
        n8nUser="admin"
        n8nPassword="secretpassword"
      />
    );

    const copyCredsButton = screen.getByRole('button', { name: /copiar credenciales/i });

    await act(async () => {
      fireEvent.click(copyCredsButton);
    });

    expect(mockWriteText).toHaveBeenCalledWith('admin:secretpassword');
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent('Credenciales copiado');
    expect(screen.getByRole('button', { name: /credenciales copiadas/i })).toBeInTheDocument();
  });
});
