"use client";

import { useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";

interface FireworksProps {
  trigger: boolean;
  onComplete?: () => void;
}

/**
 * Big fireworks celebration for milestone completion
 */
export function Fireworks({ trigger, onComplete }: FireworksProps) {
  const animationRef = useRef<number | null>(null);

  const fire = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      colors: ["#2D2F8E", "#6A469D", "#50C8DF", "#34B256", "#FACC29", "#F79A30"],
    };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        if (onComplete) {
          onComplete();
        }
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    // Also add some big bursts
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ["#FACC29", "#F79A30"],
        startVelocity: 45,
      });
    }, 500);

    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#2D2F8E", "#6A469D"],
      });
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#50C8DF", "#34B256"],
      });
    }, 1000);
  }, [onComplete]);

  useEffect(() => {
    if (trigger) {
      fire();
    }
  }, [trigger, fire]);

  return null;
}

/**
 * Hook for triggering fireworks programmatically
 */
export function useFireworks() {
  const fireFireworks = useCallback((durationMs = 3000) => {
    const animationEnd = Date.now() + durationMs;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      colors: ["#2D2F8E", "#6A469D", "#50C8DF", "#34B256", "#FACC29", "#F79A30"],
    };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / durationMs);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    // Big center burst
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ["#FACC29", "#F79A30"],
        startVelocity: 45,
      });
    }, 300);
  }, []);

  return { fireFireworks };
}
