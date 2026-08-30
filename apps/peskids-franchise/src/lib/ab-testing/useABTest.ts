"use client";

import React, { useState, useEffect, useCallback } from "react";

interface Variant {
  id: string;
  name: string;
  weight: number;
  config: Record<string, unknown>;
}

interface UseABTestResult {
  variant: Variant | null;
  variantId: string | null;
  isLoading: boolean;
  error: string | null;
  trackConversion: (value?: number) => Promise<void>;
}

interface UseABTestOptions {
  enabled?: boolean;
  onAssignment?: (variant: Variant) => void;
}

/**
 * React hook for A/B testing
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { variant, isLoading, trackConversion } = useABTest("homepage-hero");
 *
 *   if (isLoading) return <DefaultHero />;
 *
 *   if (variant?.id === "variant-b") {
 *     return <HeroVariantB onCTA={() => trackConversion()} />;
 *   }
 *
 *   return <DefaultHero onCTA={() => trackConversion()} />;
 * }
 * ```
 */
export function useABTest(
  testSlug: string,
  options: UseABTestOptions = {}
): UseABTestResult {
  const { enabled = true, onAssignment } = options;

  const [variant, setVariant] = useState<Variant | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const getAssignment = async () => {
      try {
        const visitorId = localStorage.getItem("stc_visitor_id");

        if (!visitorId) {
          // Wait for visitor tracking to initialize
          const checkInterval = setInterval(() => {
            const vid = localStorage.getItem("stc_visitor_id");
            if (vid) {
              clearInterval(checkInterval);
              fetchAssignment(vid);
            }
          }, 100);

          // Timeout after 3 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            setIsLoading(false);
          }, 3000);

          return;
        }

        await fetchAssignment(visitorId);
      } catch (err) {
        console.error("[useABTest] Error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsLoading(false);
      }
    };

    const fetchAssignment = async (visitorId: string) => {
      const response = await fetch("/api/ab-tests/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testSlug, visitorId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get assignment");
      }

      if (data.variant) {
        setVariant(data.variant);
        setVariantId(data.variantId);
        onAssignment?.(data.variant);
      }

      setIsLoading(false);
    };

    getAssignment();
  }, [testSlug, enabled, onAssignment]);

  const trackConversion = useCallback(
    async (value?: number) => {
      try {
        const visitorId = localStorage.getItem("stc_visitor_id");
        if (!visitorId) return;

        await fetch("/api/ab-tests/assign", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testSlug,
            visitorId,
            conversionValue: value,
          }),
        });
      } catch (err) {
        console.error("[useABTest] Conversion tracking error:", err);
      }
    },
    [testSlug]
  );

  return { variant, variantId, isLoading, error, trackConversion };
}

/**
 * Get variant synchronously from cache (if previously assigned)
 * Useful for server components or when you need immediate access
 */
export function getVariantFromCache(testSlug: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`ab_${testSlug}_variant`);
}

/**
 * Higher-order component for A/B testing
 *
 * Usage:
 * ```tsx
 * const HeroAB = withABTest("homepage-hero", {
 *   control: ControlHero,
 *   "variant-a": HeroVariantA,
 *   "variant-b": HeroVariantB,
 * });
 *
 * // In your page:
 * <HeroAB fallback={<ControlHero />} />
 * ```
 */
export function withABTest<P extends object>(
  testSlug: string,
  variants: Record<string, React.ComponentType<P>>
) {
  return function ABTestComponent(
    props: P & { fallback?: React.ReactNode }
  ) {
    const { variant, isLoading } = useABTest(testSlug);
    const { fallback, ...rest } = props;

    if (isLoading) {
      return fallback || null;
    }

    const SelectedComponent = variant ? variants[variant.id] : variants.control;

    if (!SelectedComponent) {
      return fallback || null;
    }

    return React.createElement(SelectedComponent, rest as P);
  };
}
