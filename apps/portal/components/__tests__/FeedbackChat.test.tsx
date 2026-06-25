/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeedbackChat } from '../FeedbackChat';

// Mock getApiBaseUrl to return a consistent string
vi.mock('@/lib/api', () => ({
  getApiBaseUrl: () => 'http://test-api.opsly.com',
}));

// Mock scrollIntoView as it's not implemented in JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('FeedbackChat', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('toggles chat window when clicking the trigger button', async () => {
    render(<FeedbackChat tenantSlug="test-tenant" userEmail="test@opsly.com" />);

    const trigger = screen.getByRole('button', { name: /abrir feedback/i });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(trigger);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerrar feedback/i })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cerrar feedback/i }));
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes chat window when pressing Escape key', async () => {
    render(<FeedbackChat tenantSlug="test-tenant" userEmail="test@opsly.com" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir feedback/i }));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('restores focus to trigger button when chat is closed', async () => {
    render(<FeedbackChat tenantSlug="test-tenant" userEmail="test@opsly.com" />);
    const trigger = screen.getByRole('button', { name: /abrir feedback/i });

    await act(async () => {
      fireEvent.click(trigger);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cerrar feedback/i }));
    });

    expect(trigger).toHaveFocus();
  });

  it('does not steal focus on initial mount', () => {
    render(<FeedbackChat tenantSlug="test-tenant" userEmail="test@opsly.com" />);
    const trigger = screen.getByRole('button', { name: /abrir feedback/i });
    expect(trigger).not.toHaveFocus();
  });

  it('shows loading state when sending message', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        json: () => Promise.resolve({ conversation_id: '123', message: 'Respuesta' })
      }), 100))
    );
    vi.stubGlobal('fetch', mockFetch);

    render(<FeedbackChat tenantSlug="test-tenant" userEmail="test@opsly.com" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir feedback/i }));
    });

    const input = screen.getByLabelText(/tu feedback/i);
    const sendButton = screen.getByRole('button', { name: /enviar feedback/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Hola' } });
      fireEvent.click(sendButton);
    });

    expect(screen.getByText(/analizando/i)).toBeInTheDocument();
  });
});
