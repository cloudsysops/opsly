"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { MAPBOX_TOKEN } from "@/lib/territories/mapbox";

interface SearchResult {
  center: [number, number];
  placeName: string;
  bbox?: [number, number, number, number];
}

interface SearchBarProps {
  onResultSelect: (result: SearchResult) => void;
  className?: string;
}

interface MapboxFeature {
  center: [number, number];
  place_name: string;
  bbox?: [number, number, number, number];
}

export default function SearchBar({ onResultSelect, className }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapboxFeature[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !MAPBOX_TOKEN) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        searchQuery
      )}.json?access_token=${MAPBOX_TOKEN}&country=US&limit=5`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Geocoding request failed");
      const data = await response.json();
      setResults(data.features || []);
      setIsOpen(true);
      setHighlightIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    setHighlightIndex(-1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setResults([]);
      setIsOpen(isFocused && recentSearches.length > 0);
      return;
    }

    debounceRef.current = setTimeout(() => {
      search(value);
    }, 300);
  }

  function handleResultClick(feature: MapboxFeature) {
    const result: SearchResult = {
      center: feature.center,
      placeName: feature.place_name,
      bbox: feature.bbox,
    };

    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => r.placeName !== result.placeName);
      return [result, ...filtered].slice(0, 5);
    });

    setQuery(feature.place_name);
    setIsOpen(false);
    setResults([]);
    setHighlightIndex(-1);
    onResultSelect(result);
  }

  function handleRecentClick(result: SearchResult) {
    setQuery(result.placeName);
    setIsOpen(false);
    setHighlightIndex(-1);
    onResultSelect(result);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setHighlightIndex(-1);
    inputRef.current?.focus();
  }

  // Combine visible items for keyboard nav
  const showRecent = isOpen && !query.trim() && recentSearches.length > 0;
  const showResults = isOpen && query.trim() && results.length > 0;
  const itemCount = showResults ? results.length : showRecent ? recentSearches.length : 0;

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIndex(-1);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && results.length > 0) {
        setIsOpen(true);
      }
      setHighlightIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0) {
        // Select the highlighted item
        if (showResults && results[highlightIndex]) {
          handleResultClick(results[highlightIndex]);
        } else if (showRecent && recentSearches[highlightIndex]) {
          handleRecentClick(recentSearches[highlightIndex]);
        }
      } else if (results.length > 0) {
        handleResultClick(results[0]);
      } else if (query.trim() && MAPBOX_TOKEN) {
        // No results yet — do an immediate geocode and fly to the top result
        setIsLoading(true);
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query
          )}.json?access_token=${MAPBOX_TOKEN}&country=US&limit=1`;
          const response = await fetch(url);
          if (!response.ok) throw new Error("Geocoding failed");
          const data = await response.json();
          if (data.features?.length > 0) {
            handleResultClick(data.features[0]);
          }
        } catch {
          // Silently fail
        } finally {
          setIsLoading(false);
        }
      }
    }
  }

  function handleFocus() {
    setIsFocused(true);
    if (!query.trim() && recentSearches.length > 0) {
      setIsOpen(true);
    } else if (results.length > 0) {
      setIsOpen(true);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
        setHighlightIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search locations..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
          role="combobox"
          aria-expanded={isOpen}
          aria-activedescendant={highlightIndex >= 0 ? `search-item-${highlightIndex}` : undefined}
        />
        {isLoading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-navy" />
          </div>
        )}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {(showResults || showRecent) && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg" role="listbox">
          {showRecent && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-gray-500">
                Recent Searches
              </div>
              {recentSearches.map((result, index) => (
                <button
                  key={`recent-${index}`}
                  id={`search-item-${index}`}
                  type="button"
                  role="option"
                  aria-selected={highlightIndex === index}
                  onClick={() => handleRecentClick(result)}
                  onMouseEnter={() => setHighlightIndex(index)}
                  className={`block w-full truncate px-4 py-2 text-left text-sm text-gray-700 ${
                    highlightIndex === index ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                >
                  {result.placeName}
                </button>
              ))}
            </>
          )}

          {showResults &&
            results.map((feature, index) => (
              <button
                key={`result-${index}`}
                id={`search-item-${index}`}
                type="button"
                role="option"
                aria-selected={highlightIndex === index}
                onClick={() => handleResultClick(feature)}
                onMouseEnter={() => setHighlightIndex(index)}
                className={`block w-full truncate px-4 py-2 text-left text-sm text-gray-700 ${
                  highlightIndex === index ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                {feature.place_name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
