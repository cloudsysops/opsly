"use client";

import { useState, useEffect } from "react";
import { ActivityTimeline } from "../activities/ActivityTimeline";
import { ActivityFilters, FilterType } from "../activities/ActivityFilters";

interface ActivitiesTabProps {
  prospectId: string;
}

export function ActivitiesTab({ prospectId }: ActivitiesTabProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [activities, setActivities] = useState<Array<{
    id: string;
    type: string;
    timestamp: string;
    data: unknown;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/prospects/${prospectId}/activities?filter=${filter}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch activities");
        }

        const data = await response.json();
        setActivities(data.activities || []);
      } catch (err) {
        console.error("Error fetching activities:", err);
        setError("Failed to load activities");
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, [prospectId, filter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <ActivityFilters activeFilter={filter} onFilterChange={setFilter} />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading activities...</span>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => setFilter(filter)}
            className="mt-2 text-brand-purple hover:underline"
          >
            Try again
          </button>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No activities found for this filter.</p>
        </div>
      ) : (
        <ActivityTimeline activities={activities} />
      )}
    </div>
  );
}
