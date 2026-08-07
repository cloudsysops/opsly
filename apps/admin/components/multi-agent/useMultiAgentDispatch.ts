'use client';

import { useState, useCallback } from 'react';
import type { ChatDispatchRequest, DispatchResponse, DispatchRequest } from './types';

/**
 * Hook for dispatching tasks to the Multi-Agent Orchestrator
 */
export function useMultiAgentDispatch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<DispatchResponse | null>(null);

  const dispatchFromChat = useCallback(async (message: string, userId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const body: ChatDispatchRequest = {
        message,
        userId,
      };

      const res = await fetch('/api/multi-agent/dispatch-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch tasks');
      }

      setResponse(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const dispatchFromAPI = useCallback(async (request: DispatchRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/multi-agent/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch tasks');
      }

      setResponse(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResponse(null);
  }, []);

  return {
    dispatchFromChat,
    dispatchFromAPI,
    isLoading,
    error,
    response,
    reset,
  };
}
