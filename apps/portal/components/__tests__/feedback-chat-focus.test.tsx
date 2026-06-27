/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeedbackChat } from '../FeedbackChat';

describe('FeedbackChat Focus Management', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('restores focus to toggle button when closed', async () => {
    vi.useFakeTimers();
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    render(<FeedbackChat tenantSlug="test-tenant" userEmail="test@example.com" />);

    const toggleButton = screen.getByRole('button', { name: /abrir feedback/i });

    // Open chat
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    // Fast-forward timers for focus
    await act(async () => {
      vi.runAllTimers();
    });

    const input = screen.getByLabelText(/tu feedback/i);
    expect(document.activeElement).toBe(input);

    // Close chat
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cerrar feedback/i }));
    });

    expect(document.activeElement).toBe(toggleButton);
    vi.useRealTimers();
  });

  it('does not hijack focus on initial mount', () => {
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    const focusSpy = vi.spyOn(window.HTMLElement.prototype, 'focus');

    render(<FeedbackChat tenantSlug="test-tenant" userEmail="test@example.com" />);

    // On initial mount, open is false.
    // The focus restoration logic should NOT run because isInitialMount is true during the first effect run or open is false.
    // Our implementation:
    /*
      useEffect(() => {
        if (open) {
          setTimeout(() => inputRef.current?.focus(), 100);
        } else if (!isInitialMount.current) {
          triggerRef.current?.focus();
        }
      }, [open]);
    */
    // On mount, open=false. isInitialMount.current is true during the first run of this effect (if it runs on mount).

    expect(focusSpy).not.toHaveBeenCalled();
  });
});
