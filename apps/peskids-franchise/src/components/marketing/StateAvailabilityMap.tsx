"use client";

import { useState } from "react";

// States where Acme Franchise is NOT licensed to franchise
const NOT_LICENSED_STATES = [
  "WA", "ND", "MN", "IL", "WI", "NY", "RI", "SD", "IN", "UT", "NE", "KY", "MD", "HI", "LA"
];

// Grid layout matching the reference image exactly
const STATE_GRID = [
  ["AK", null, null, null, null, null, null, null, null, null, null, "ME"],
  [null, null, null, null, null, null, null, null, null, null, "VT", "NH"],
  [null, "WA", "ID", "MT", "ND", "MN", "IL", "WI", "MI", "NY", "MA", "RI"],
  [null, "OR", "NV", "WY", "SD", "IA", "IN", "OH", "PA", "NJ", "CT", null],
  [null, "CA", "UT", "CO", "NE", "MO", "KY", "WV", "VA", "MD", "DE", null],
  [null, null, "AZ", "NM", "KS", "AR", "TN", "NC", "SC", "DC", null, null],
  [null, null, null, "OK", "LA", "MS", "AL", "GA", null, null, null, null],
  ["HI", null, null, "TX", null, null, null, "FL", null, null, null, null],
];

export function StateAvailabilityMap() {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const isLicensed = (state: string | null) => {
    if (!state) return null;
    return !NOT_LICENSED_STATES.includes(state);
  };

  const licensedCount = 50 - NOT_LICENSED_STATES.length + 1; // +1 for DC

  return (
    <div className="relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-cyan/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-brand-purple/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Stats Row */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-10">
          <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3 shadow-lg border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-navy">{licensedCount}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">States Licensed</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3 shadow-lg border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-amber-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-navy">{NOT_LICENSED_STATES.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Coming Soon</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-brand-green shadow-sm" />
            <span className="text-sm font-medium text-gray-700">Available Now</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-brand-orange shadow-sm" />
            <span className="text-sm font-medium text-gray-700">Coming Soon</span>
          </div>
        </div>

        {/* State Grid */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-gray-100">
          <div className="flex flex-col items-center gap-1.5 sm:gap-2">
            {STATE_GRID.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-1.5 sm:gap-2">
                {row.map((state, colIndex) => {
                  if (state === null) {
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14"
                      />
                    );
                  }
                  const licensed = isLicensed(state);
                  const isHovered = hoveredState === state;
                  return (
                    <button
                      key={state}
                      onMouseEnter={() => setHoveredState(state)}
                      onMouseLeave={() => setHoveredState(null)}
                      className={`
                        w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14
                        rounded-lg sm:rounded-xl
                        flex items-center justify-center
                        text-white text-xs sm:text-sm md:text-base font-bold
                        transition-all duration-200 ease-out
                        shadow-md hover:shadow-xl
                        ${licensed
                          ? "bg-brand-green hover:brightness-110"
                          : "bg-brand-orange hover:brightness-110"
                        }
                        ${isHovered ? "scale-110 z-10" : "scale-100"}
                      `}
                      title={licensed ? `${state} - Available for Franchising` : `${state} - Coming Soon`}
                    >
                      {state}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Hover tooltip */}
          {hoveredState && (
            <div className="mt-6 text-center animate-fade-in">
              <p className="text-lg font-semibold text-brand-navy">
                {isLicensed(hoveredState) ? (
                  <>
                    <span className="text-brand-green">✓</span> {hoveredState} is available for franchising!
                  </>
                ) : (
                  <>
                    <span className="text-brand-orange">○</span> {hoveredState} licensing coming soon
                  </>
                )}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
