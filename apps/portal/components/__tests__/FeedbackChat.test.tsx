/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeedbackChat } from '../FeedbackChat';

// Mock fetch for the feedback API
global.fetch = vi.fn();

describe('FeedbackChat', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // Mock scrollIntoView
  window.HTMLElement.prototype.scrollIntoView = vi.fn();

  it('toggles the chat window when clicking the button', async () => {
    render(<FeedbackChat tenantSlug="test-tenant" userEmail="test@example.com" />);

    const toggleButton = screen.getByRole('button', { name: /abrir feedback/i });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cerrar feedback/i }));
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the chat window and restores focus when pressing Escape', async () => {
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
    expect(document.activeElement).toBe(toggleButton);
  });

  it('shows accessible loading state', async () => {
    vi.useFakeTimers();
    (global.fetch as any).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        json: () => Promise.resolve({ message: 'Thanks' })
      }), 100))
    );

    render(<FeedbackChat tenantSlug="test-tenant" userEmail="test@example.com" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir feedback/i }));
    });

    const input = screen.getByLabelText(/tu feedback/i);
    fireEvent.change(input, { target: { value: 'Great app!' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /enviar feedback/i }));
    });

    // The loading state should be present and NOT aria-hidden
    const loadingContainer = screen.getByText('Analizando...').parentElement;
    expect(loadingContainer).not.toHaveAttribute('aria-hidden');

    // The spinner should be aria-hidden
    const spinner = loadingContainer?.querySelector('svg');
    expect(spinner).toHaveAttribute('aria-hidden', 'true');

    await act(async () => {
      vi.runAllTimers();
    });
  });
});
