/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModeSelector } from '../mode-selector';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

const mockFetchPortalTenant = vi.fn();
const mockPostPortalMode = vi.fn();

vi.mock('@/lib/tenant', () => ({
  fetchPortalTenant: (...args: unknown[]) => mockFetchPortalTenant(...args),
  postPortalMode: (...args: unknown[]) => mockPostPortalMode(...args),
  tenantSlugFromUserMetadata: () => 'test-tenant',
}));

vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'fake-token',
            user: { user_metadata: { tenant_slug: 'test-tenant' } },
          },
        },
        error: null,
      }),
    },
  }),
}));

describe('ModeSelector Component', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders options for all three portal modes', () => {
    render(<ModeSelector />);

    expect(screen.getByText('Yo administro mis agentes')).toBeInTheDocument();
    expect(screen.getByText('Opsly administra mis agentes')).toBeInTheDocument();
    expect(screen.getByText('Modo defensa activa')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /entrar en modo developer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar en modo managed/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /entrar en modo security defense/i })
    ).toBeInTheDocument();
  });

  it('sets demo mode cookie and redirects on click in demo session', async () => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'opsly_portal_demo=1',
    });

    render(<ModeSelector />);

    const managedBtn = screen.getByRole('button', { name: /entrar en modo managed/i });

    await act(async () => {
      fireEvent.click(managedBtn);
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard/managed');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('sets aria-busy and updates status announcer when mode button is clicked during async operation', async () => {
    let resolveTenant: (value: { slug: string }) => void;
    const pendingPromise = new Promise<{ slug: string }>((resolve) => {
      resolveTenant = resolve;
    });
    mockFetchPortalTenant.mockReturnValue(pendingPromise);

    render(<ModeSelector />);

    const devBtn = screen.getByRole('button', { name: /entrar en modo developer/i });

    act(() => {
      fireEvent.click(devBtn);
    });

    expect(devBtn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Guardando modo developer...');

    await act(async () => {
      resolveTenant!({ slug: 'test-tenant' });
      mockPostPortalMode.mockResolvedValue(undefined);
    });
  });
});
