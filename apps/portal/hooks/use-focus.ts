import { useCallback, useRef, useState, type RefObject } from 'react';

export function useFocus<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  isFocused: boolean;
  focus: () => void;
  blur: () => void;
  onFocus: () => void;
  onBlur: () => void;
} {
  const ref = useRef<T | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const focus = useCallback(() => {
    ref.current?.focus();
  }, []);

  const blur = useCallback(() => {
    ref.current?.blur();
  }, []);

  return {
    ref,
    isFocused,
    focus,
    blur,
    onFocus: () => {
      setIsFocused(true);
    },
    onBlur: () => {
      setIsFocused(false);
    },
  };
}

export function useFocusRing(): {
  isFocused: boolean;
  focusProps: { onFocus: () => void; onBlur: () => void };
  focusClasses: string;
} {
  const [isFocused, setIsFocused] = useState(false);

  return {
    isFocused,
    focusProps: {
      onFocus: () => {
        setIsFocused(true);
      },
      onBlur: () => {
        setIsFocused(false);
      },
    },
    focusClasses: isFocused
      ? 'ring-2 ring-ops-green/80 ring-offset-2 ring-offset-ops-bg outline-none'
      : '',
  };
}
