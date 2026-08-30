"use client";

import { useState, useEffect } from "react";
import { AISuggestion, SuggestionPriority } from "@/lib/types/form-schema";

interface AISuggestionsPanelProps {
  moduleId: string;
  onApplySuggestion: (suggestion: AISuggestion) => void;
  onClose: () => void;
}

interface SuggestionData {
  id: string;
  suggestions: AISuggestion[];
  analysisData: {
    totalSubmissions: number;
    completionRate: number;
    averageScore: number;
    commonRedFlags: string[];
    fieldCompletionRates: Record<string, number>;
  };
  generatedAt: string;
}

export function AISuggestionsPanel({
  moduleId,
  onApplySuggestion,
  onClose,
}: AISuggestionsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestSuggestion();
  }, [moduleId]);

  const fetchLatestSuggestion = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/prework/${moduleId}/suggestions`);
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      const data = await res.json();
      setSuggestion(data);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/prework/${moduleId}/suggestions`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate suggestions");
      }
      const data = await res.json();
      setSuggestion(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate suggestions");
    } finally {
      setGenerating(false);
    }
  };

  const dismissSuggestion = async (suggestionId: string, aiSuggestionId: string) => {
    try {
      await fetch(`/api/admin/prework/${moduleId}/suggestions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId: aiSuggestionId, action: "dismiss" }),
      });
      // Remove from local state
      if (suggestion) {
        setSuggestion({
          ...suggestion,
          suggestions: suggestion.suggestions.filter((s) => s.id !== suggestionId),
        });
      }
    } catch (err) {
      console.error("Error dismissing suggestion:", err);
    }
  };

  const priorityColors: Record<SuggestionPriority, string> = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800",
  };

  const typeLabels: Record<string, string> = {
    modify: "Modify Field",
    add: "Add Field",
    remove: "Remove Field",
    reorder: "Reorder Fields",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple" />
          </div>
        ) : suggestion?.suggestions && suggestion.suggestions.length > 0 ? (
          <>
            {/* Analysis Summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
              <h4 className="font-medium text-gray-700 mb-2">Analysis Summary</h4>
              <div className="space-y-1 text-gray-600">
                <p>Total Submissions: {suggestion.analysisData?.totalSubmissions || 0}</p>
                <p>Completion Rate: {suggestion.analysisData?.completionRate || 0}%</p>
                <p>Avg Score: {suggestion.analysisData?.averageScore?.toFixed(1) || "N/A"}</p>
              </div>
              {suggestion.analysisData?.commonRedFlags?.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-gray-700">Common Red Flags:</p>
                  <ul className="list-disc list-inside text-gray-600">
                    {suggestion.analysisData.commonRedFlags.slice(0, 3).map((flag, i) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Suggestions List */}
            <div className="space-y-3">
              {suggestion.suggestions.map((s) => (
                <div key={s.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${priorityColors[s.priority]}`}>
                      {s.priority.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">{typeLabels[s.type]}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{s.reason}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApplySuggestion(s)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-brand-purple text-white rounded hover:bg-brand-purple/90"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => dismissSuggestion(s.id, suggestion.id)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Generated {new Date(suggestion.generatedAt).toLocaleString()}
            </p>
          </>
        ) : (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <p className="text-gray-500 mb-4">No suggestions yet</p>
            <p className="text-sm text-gray-400 mb-4">
              Generate AI suggestions based on submission patterns and evaluation scores.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button
          onClick={generateSuggestions}
          disabled={generating}
          className="w-full py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Generate Suggestions
            </>
          )}
        </button>
      </div>
    </div>
  );
}
