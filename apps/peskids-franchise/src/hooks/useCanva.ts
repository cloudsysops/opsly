import { useState, useCallback, useEffect } from 'react';
import type { CanvaDesign } from '@/lib/canva';

interface CanvaConnectionStatus {
  connected: boolean;
  displayName?: string;
  canvaUserId?: string;
  connectedAt?: string;
  message?: string;
}

interface CanvaFetchError {
  error: string;
  message: string;
}

// ============ Connection Status Hook ============

interface UseCanvaConnectionReturn {
  status: CanvaConnectionStatus | null;
  isLoading: boolean;
  error: CanvaFetchError | null;
  refresh: () => Promise<void>;
  disconnect: () => Promise<boolean>;
}

export function useCanvaConnection(): UseCanvaConnectionReturn {
  const [status, setStatus] = useState<CanvaConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CanvaFetchError | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/canva?status=true');
      const data = await response.json();

      if (!response.ok) {
        setError({ error: data.error, message: data.message });
        setStatus({ connected: false });
        return;
      }

      setStatus(data);
    } catch (err) {
      setError({
        error: 'Fetch failed',
        message: err instanceof Error ? err.message : 'Failed to check connection',
      });
      setStatus({ connected: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/canva', { method: 'DELETE' });

      if (response.ok) {
        setStatus({ connected: false });
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, isLoading, error, refresh, disconnect };
}

// ============ Design Browser Hook ============

interface CanvaDesignWithEmbed extends CanvaDesign {
  embedUrl: string;
}

interface UseCanvaDesignsReturn {
  designs: CanvaDesignWithEmbed[];
  isLoading: boolean;
  error: CanvaFetchError | null;
  query: string;
  setQuery: (query: string) => void;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => void;
}

export function useCanvaDesigns(): UseCanvaDesignsReturn {
  const [designs, setDesigns] = useState<CanvaDesignWithEmbed[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CanvaFetchError | null>(null);
  const [query, setQueryState] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [continuation, setContinuation] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchDesigns = useCallback(
    async (append: boolean = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ list: 'true' });

        if (debouncedQuery) {
          params.set('query', debouncedQuery);
        }

        if (append && continuation) {
          params.set('continuation', continuation);
        }

        const response = await fetch(`/api/admin/canva?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          setError({ error: data.error, message: data.message });
          if (!append) setDesigns([]);
          return;
        }

        if (append) {
          setDesigns((prev) => [...prev, ...data.designs]);
        } else {
          setDesigns(data.designs);
        }

        setContinuation(data.continuation || null);
        setHasMore(!!data.continuation);
      } catch (err) {
        setError({
          error: 'Fetch failed',
          message: err instanceof Error ? err.message : 'Failed to load designs',
        });
        if (!append) setDesigns([]);
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedQuery, continuation]
  );

  useEffect(() => {
    setContinuation(null);
    setHasMore(false);
    fetchDesigns(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
  }, []);

  const loadMore = useCallback(async () => {
    if (continuation && !isLoading) {
      await fetchDesigns(true);
    }
  }, [continuation, isLoading, fetchDesigns]);

  const refresh = useCallback(() => {
    setContinuation(null);
    setHasMore(false);
    fetchDesigns(false);
  }, [fetchDesigns]);

  return { designs, isLoading, error, query, setQuery, hasMore, loadMore, refresh };
}

// ============ Single Design Hook ============

interface UseCanvaDesignReturn {
  design: CanvaDesignWithEmbed | null;
  isLoading: boolean;
  error: CanvaFetchError | null;
  fetchDesign: (designId: string) => Promise<CanvaDesignWithEmbed | null>;
}

export function useCanvaDesign(): UseCanvaDesignReturn {
  const [design, setDesign] = useState<CanvaDesignWithEmbed | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CanvaFetchError | null>(null);

  const fetchDesign = useCallback(async (designId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/canva?designId=${encodeURIComponent(designId)}`);
      const data = await response.json();

      if (!response.ok) {
        setError({ error: data.error, message: data.message });
        setDesign(null);
        return null;
      }

      setDesign(data);
      return data;
    } catch (err) {
      setError({
        error: 'Fetch failed',
        message: err instanceof Error ? err.message : 'Failed to fetch design',
      });
      setDesign(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { design, isLoading, error, fetchDesign };
}
