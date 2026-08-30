"use client";

import { useState, useEffect } from "react";
import { getSourceLabel, getMediumLabel } from "@/lib/attribution/capture";

interface Attribution {
  id: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPage: string | null;
  firstTouchedAt: string;
  touches: {
    id: string;
    touchType: string;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    pageUrl: string | null;
    touchedAt: string;
  }[];
}

interface AttributionPanelProps {
  prospectId: string;
}

export function AttributionPanel({ prospectId }: AttributionPanelProps) {
  const [attribution, setAttribution] = useState<Attribution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTouches, setShowTouches] = useState(false);

  useEffect(() => {
    async function fetchAttribution() {
      try {
        const res = await fetch(`/api/admin/prospects/${prospectId}/attribution`);
        if (res.ok) {
          const data = await res.json();
          setAttribution(data.attribution);
        }
      } catch (err) {
        console.error("Failed to fetch attribution:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAttribution();
  }, [prospectId]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!attribution) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-medium text-gray-900 mb-2">Lead Source</h3>
        <p className="text-sm text-gray-500">No attribution data available</p>
      </div>
    );
  }

  const hasFirstTouch = attribution.utmSource || attribution.utmMedium || attribution.utmCampaign;

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b">
        <h3 className="font-medium text-gray-900">Lead Attribution</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          First touched: {new Date(attribution.firstTouchedAt).toLocaleDateString()}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* First Touch */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            First Touch
          </h4>

          {hasFirstTouch ? (
            <div className="space-y-2">
              {attribution.utmSource && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Source:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {getSourceLabel(attribution.utmSource)}
                  </span>
                </div>
              )}

              {attribution.utmMedium && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Medium:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {getMediumLabel(attribution.utmMedium)}
                  </span>
                </div>
              )}

              {attribution.utmCampaign && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Campaign:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    {attribution.utmCampaign}
                  </span>
                </div>
              )}

              {attribution.utmTerm && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Term:</span>
                  <span className="text-xs text-gray-700">{attribution.utmTerm}</span>
                </div>
              )}

              {attribution.utmContent && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Content:</span>
                  <span className="text-xs text-gray-700">{attribution.utmContent}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Direct visit (no UTM parameters)</p>
          )}
        </div>

        {/* Landing Page */}
        {attribution.landingPage && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Landing Page
            </h4>
            <p className="text-sm text-gray-700 truncate">{attribution.landingPage}</p>
          </div>
        )}

        {/* Referrer */}
        {attribution.referrer && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Referrer
            </h4>
            <p className="text-sm text-gray-700 truncate">{attribution.referrer}</p>
          </div>
        )}

        {/* Touch Points */}
        {attribution.touches.length > 0 && (
          <div>
            <button
              onClick={() => setShowTouches(!showTouches)}
              className="flex items-center gap-1 text-xs text-brand-cyan hover:underline"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showTouches ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {attribution.touches.length} additional touch point{attribution.touches.length !== 1 ? "s" : ""}
            </button>

            {showTouches && (
              <div className="mt-2 space-y-2">
                {attribution.touches.map((touch) => (
                  <div
                    key={touch.id}
                    className="p-2 bg-gray-50 rounded text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 capitalize">
                        {touch.touchType.replace(/_/g, " ")}
                      </span>
                      <span className="text-gray-500">
                        {new Date(touch.touchedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {touch.utmCampaign && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                        {touch.utmCampaign}
                      </span>
                    )}
                    {touch.pageUrl && (
                      <p className="text-gray-500 truncate mt-1">{touch.pageUrl}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
