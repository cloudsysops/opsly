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

  it('renders nothing when no valid props are provided', () => {
    const { container } = render(
      <DeveloperActions n8nUrl={null} n8nUser={null} n8nPassword={null} />
    );
    expect(container.firstChild?.childNodes.length).toBe(0);
  });

  it('renders only URL copy button when n8nUrl is provided', () => {
    render(
      <DeveloperActions n8nUrl="https://n8n.example.com" n8nUser={null} n8nPassword={null} />
    );
    expect(screen.getByRole('button', { name: /copiar url de n8n al portapapeles/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copiar credenciales al portapapeles/i })).not.toBeInTheDocument();
  });

  it('renders only credentials button when n8nUser/n8nPassword are provided', () => {
    render(
      <DeveloperActions n8nUrl={null} n8nUser="admin" n8nPassword="pwd" />
    );
    expect(screen.queryByRole('button', { name: /copiar url de n8n al portapapeles/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar credenciales al portapapeles/i })).toBeInTheDocument();
  });

  it('copies URL to clipboard and transitions button state', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(
      <DeveloperActions n8nUrl="https://n8n.example.com" n8nUser={null} n8nPassword={null} />
    );
    const button = screen.getByRole('button', { name: /copiar url de n8n al portapapeles/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockWriteText).toHaveBeenCalledWith('https://n8n.example.com');
    expect(screen.getByRole('button', { name: /url de n8n copiada/i })).toBeInTheDocument();
    expect(screen.getByText('URL copiada')).toBeInTheDocument();
  });

  it('copies credentials to clipboard and transitions button state', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(
      <DeveloperActions n8nUrl={null} n8nUser="admin" n8nPassword="pwd" />
    );
    const button = screen.getByRole('button', { name: /copiar credenciales al portapapeles/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockWriteText).toHaveBeenCalledWith('admin:pwd');
    expect(screen.getByRole('button', { name: /credenciales copiadas/i })).toBeInTheDocument();
    expect(screen.getByText('Credenciales copiadas')).toBeInTheDocument();
  });

  it('reverts state after 2500ms timeout', async () => {
    vi.useFakeTimers();
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(
      <DeveloperActions n8nUrl="https://n8n.example.com" n8nUser={null} n8nPassword={null} />
    );
    const button = screen.getByRole('button', { name: /copiar url de n8n al portapapeles/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('URL copiada')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.queryByText('URL copiada')).not.toBeInTheDocument();
    expect(screen.getByText('Copiar URL n8n')).toBeInTheDocument();
  });
});
