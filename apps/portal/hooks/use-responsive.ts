import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (): void => {
      setMatches(media.matches);
    };
    media.addEventListener('change', listener);
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}

export function useBreakpoint(): {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  current: 'mobile' | 'tablet' | 'desktop' | 'large';
} {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isLargeDesktop = useMediaQuery('(min-width: 1280px)');

  let current: 'mobile' | 'tablet' | 'desktop' | 'large' = 'desktop';
  if (isMobile) {
    current = 'mobile';
  } else if (isTablet) {
    current = 'tablet';
  } else if (isLargeDesktop) {
    current = 'large';
  } else {
    current = 'desktop';
  }

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    current,
  };
}

export function useContainerSize(): { width: number; height: number } {
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const handleResize = (): void => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return size;
}
