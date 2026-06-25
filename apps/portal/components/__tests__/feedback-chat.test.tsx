/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeedbackChat } from '../FeedbackChat';

describe('FeedbackChat', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('toggles chat window and updates ARIA attributes', async () => {
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    render(<FeedbackChat tenantSlug="test-tenant" userEmail="test@example.com" />);

    const toggleButton = screen.getByRole('button', { name: /abrir feedback/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(toggleButton).toHaveAttribute('aria-controls', 'feedback-chat-window');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(toggleButton.getAttribute('aria-label')).toMatch(/cerrar feedback/i);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('id', 'feedback-chat-window');
    expect(dialog).toHaveAttribute('aria-labelledby', 'feedback-chat-title');

    const title = screen.getByRole('heading', { name: /feedback & sugerencias/i });
    expect(title).toHaveAttribute('id', 'feedback-chat-title');
  });

  it('closes chat window when pressing Escape key', async () => {
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    render(<FeedbackChat tenantSlug="test-tenant" userEmail="test@example.com" />);

    const toggleButton = screen.getByRole('button', { name: /abrir feedback/i });
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows loading state that is accessible', async () => {
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    // Mock fetch for sendMessage
    global.fetch = vi.fn().mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Response' })
      }), 100))
    );

    render(<FeedbackChat tenantSlug="test-tenant" userEmail="test@example.com" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir feedback/i }));
    });

    const input = screen.getByPlaceholderText(/escribe tu feedback/i);
    const sendButton = screen.getByRole('button', { name: /enviar feedback/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
    });

    const loadingIndicator = screen.getByText('Analizando...');
    expect(loadingIndicator.parentElement).not.toHaveAttribute('aria-hidden', 'true');

    // Cleanup fetch mock
    delete (global as any).fetch;
  });
});
