"use client";

import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

/**
 * Small confetti celebration for regular task completion
 */
export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const fire = useCallback(() => {
    // Basic confetti burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#2D2F8E", "#6A469D", "#50C8DF", "#34B256", "#FACC29", "#F79A30"],
    });

    // Call onComplete after animation
    if (onComplete) {
      setTimeout(onComplete, 2000);
    }
  }, [onComplete]);

  useEffect(() => {
    if (trigger) {
      fire();
    }
  }, [trigger, fire]);

  return null; // This component just triggers the effect
}

/**
 * Hook for triggering confetti programmatically
 */
export function useConfetti() {
  const fireConfetti = useCallback((options?: confetti.Options) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#2D2F8E", "#6A469D", "#50C8DF", "#34B256", "#FACC29", "#F79A30"],
      ...options,
    });
  }, []);

  return { fireConfetti };
}
