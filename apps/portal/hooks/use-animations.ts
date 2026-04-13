import { useCallback, useState } from "react";

export function useFadeIn(duration = 300): {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  style: { opacity: number; transition: string };
} {
  const [isVisible, setIsVisible] = useState(false);

  const show = useCallback(() => {
    setIsVisible(true);
  }, []);
  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    show,
    hide,
    style: {
      opacity: isVisible ? 1 : 0,
      transition: `opacity ${duration}ms ease-in-out`,
    },
  };
}

export function useSlideIn(
  direction: "up" | "down" | "left" | "right" = "up",
  duration = 300,
): {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  style: { opacity: number; transform: string; transition: string };
} {
  const [isVisible, setIsVisible] = useState(false);

  const show = useCallback(() => {
    setIsVisible(true);
  }, []);
  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  const transforms: Record<"up" | "down" | "left" | "right", string> = {
    up: "translateY(20px)",
    down: "translateY(-20px)",
    left: "translateX(20px)",
    right: "translateX(-20px)",
  };

  return {
    isVisible,
    show,
    hide,
    style: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "none" : transforms[direction],
      transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
    },
  };
}

export function useStagger(childrenCount: number, staggerDelay = 50): Array<{ style: { animationDelay: string } }> {
  return Array.from({ length: childrenCount }, (_, i) => ({
    style: {
      animationDelay: `${i * staggerDelay}ms`,
    },
  }));
}
