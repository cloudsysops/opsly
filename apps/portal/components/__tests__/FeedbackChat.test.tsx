/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackChat } from '../FeedbackChat';

// Mock getApiBaseUrl
vi.mock('@/lib/api', () => ({
  getApiBaseUrl: () => 'http://localhost:3000',
}));

describe('FeedbackChat', () => {
  beforeEach(() => {
    // Mock scrollIntoView which is not available in JSDOM
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const defaultProps = {
    tenantSlug: 'test-tenant',
    userEmail: 'test@example.com',
  };

  it('renders closed by default', () => {
    render(<FeedbackChat {...defaultProps} />);
    const toggleButton = screen.getByRole('button', { name: /abrir feedback/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Feedback & Sugerencias')).not.toBeInTheDocument();
  });

  it('opens and closes when clicking the toggle button', async () => {
    render(<FeedbackChat {...defaultProps} />);
    const toggleButton = screen.getByRole('button', { name: /abrir feedback/i });

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(toggleButton).toHaveAttribute('aria-label', 'Cerrar feedback');
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Feedback & Sugerencias')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(toggleButton).toHaveAttribute('aria-label', 'Abrir feedback');
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Feedback & Sugerencias')).not.toBeInTheDocument();
  });

  it('closes when pressing Escape and restores focus to toggle button', async () => {
    render(<FeedbackChat {...defaultProps} />);
    const toggleButton = screen.getByRole('button', { name: /abrir feedback/i });

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(screen.getByText('Feedback & Sugerencias')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(screen.queryByText('Feedback & Sugerencias')).not.toBeInTheDocument();
    expect(toggleButton).toHaveFocus();
  });

  it('associates the toggle button with the chat window via aria-controls', async () => {
    render(<FeedbackChat {...defaultProps} />);
    const toggleButton = screen.getByRole('button', { name: /abrir feedback/i });
    const controlsId = toggleButton.getAttribute('aria-controls');

    expect(controlsId).toBe('feedback-chat-window');

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    // Check if the chat window has the matching ID
    const chatHeader = screen.getByText('Feedback & Sugerencias');
    const chatWindow = chatHeader.closest('div.fixed');
    expect(chatWindow).toHaveAttribute('id', 'feedback-chat-window');
  });

  it('shows loading state correctly', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Respuesta' })
      }), 100))
    );

    render(<FeedbackChat {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir feedback/i }));
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hola' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /enviar feedback/i }));
    });

    const loadingText = screen.getByText('Analizando...');
    expect(loadingText).toBeInTheDocument();
    // After my fix, it should not be aria-hidden="true"
    expect(loadingText).not.toHaveAttribute('aria-hidden', 'true');
  });
});
