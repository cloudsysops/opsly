'use client';

import React, { useState } from 'react';
import { useMultiAgentDispatch } from './useMultiAgentDispatch';
import type { DispatchResponse } from './types';

/**
 * Form component for dispatching tasks via chat message
 * Allows users to enter natural language commands like "PESKIDS-1.1 a PESKIDS-1.4"
 */
export function TaskDispatchForm() {
  const [message, setMessage] = useState('');
  const { dispatchFromChat, isLoading, error, response, reset } = useMultiAgentDispatch();
  const [showResponse, setShowResponse] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      return;
    }

    try {
      await dispatchFromChat(message);
      setMessage('');
      setShowResponse(true);
    } catch (err) {
      console.error('Dispatch failed:', err);
    }
  };

  const handleReset = () => {
    reset();
    setShowResponse(false);
    setMessage('');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Execute Tasks</h3>
        <p className="text-sm text-gray-600 mt-1">
          Enter task IDs to execute. Example: "PESKIDS-1.1 a PESKIDS-1.4"
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Task Command
          </label>
          <textarea
            id="message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="E.g., Ejecuta PESKIDS-1.1 a PESKIDS-1.4"
            disabled={isLoading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            rows={3}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <span className="font-semibold">Error:</span> {error}
            </p>
          </div>
        )}

        {showResponse && response && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 mb-2">
              <span className="font-semibold">✓ Success!</span> {response.message}
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Dispatch ID</span>
                <p className="font-mono text-xs text-gray-900 truncate">{response.dispatchId}</p>
              </div>
              <div>
                <span className="text-gray-600">Estimated Time</span>
                <p className="font-semibold text-gray-900">
                  {Math.round(response.estimatedCompletionTime / 60)} min
                </p>
              </div>
              <div>
                <span className="text-gray-600">Estimated Cost</span>
                <p className="font-semibold text-gray-900">${response.estimatedCost.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Dispatching...
              </span>
            ) : (
              'Execute Tasks'
            )}
          </button>
          {showResponse && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Help Text */}
      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600 font-medium mb-2">📝 Supported formats:</p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <code className="bg-gray-100 px-2 py-1 rounded">PESKIDS-1.1</code> — Single task</li>
          <li>• <code className="bg-gray-100 px-2 py-1 rounded">PESKIDS-1.1 a PESKIDS-1.4</code> — Range</li>
          <li>• <code className="bg-gray-100 px-2 py-1 rounded">ejecuta TASK-ABC</code> — Custom task</li>
        </ul>
      </div>
    </div>
  );
}
