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

  it('renders copy buttons when url and credentials are provided', () => {
    render(<DeveloperActions n8nUrl="https://n8n.test" n8nUser="admin" n8nPassword="pwd" />);
    expect(
      screen.getByRole('button', { name: /copiar url n8n al portapapeles/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /copiar credenciales al portapapeles/i })
    ).toBeInTheDocument();
  });

  it('copies url to clipboard and shows success state', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<DeveloperActions n8nUrl="https://n8n.test" n8nUser="admin" n8nPassword="pwd" />);
    const copyUrlBtn = screen.getByRole('button', { name: /copiar url n8n al portapapeles/i });

    await act(async () => {
      fireEvent.click(copyUrlBtn);
    });

    expect(mockWriteText).toHaveBeenCalledWith('https://n8n.test');
    expect(screen.getByText('URL copiada')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /url n8n copiada al portapapeles/i })
    ).toBeInTheDocument();
  });

  it('copies credentials to clipboard and shows success state', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<DeveloperActions n8nUrl="https://n8n.test" n8nUser="admin" n8nPassword="pwd" />);
    const copyCredsBtn = screen.getByRole('button', {
      name: /copiar credenciales al portapapeles/i,
    });

    await act(async () => {
      fireEvent.click(copyCredsBtn);
    });

    expect(mockWriteText).toHaveBeenCalledWith('admin:pwd');
    expect(screen.getByText('Credenciales copiadas')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /credenciales copiadas al portapapeles/i })
    ).toBeInTheDocument();
  });

  it('reverts copied state after timeout', async () => {
    vi.useFakeTimers();
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<DeveloperActions n8nUrl="https://n8n.test" n8nUser="admin" n8nPassword="pwd" />);
    const copyUrlBtn = screen.getByRole('button', { name: /copiar url n8n al portapapeles/i });

    await act(async () => {
      fireEvent.click(copyUrlBtn);
    });

    expect(screen.getByText('URL copiada')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.queryByText('URL copiada')).not.toBeInTheDocument();
    expect(screen.getByText('Copiar URL n8n')).toBeInTheDocument();
  });

  it('handles copy error gracefully', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Failed to copy'));
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<DeveloperActions n8nUrl="https://n8n.test" n8nUser="admin" n8nPassword="pwd" />);
    const copyUrlBtn = screen.getByRole('button', { name: /copiar url n8n al portapapeles/i });

    await act(async () => {
      fireEvent.click(copyUrlBtn);
    });

    expect(screen.getByText('No se pudo copiar')).toBeInTheDocument();
  });
});
