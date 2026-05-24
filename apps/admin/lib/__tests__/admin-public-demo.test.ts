import { afterEach, describe, expect, it } from 'vitest';
import { isAdminPublicDemoEnabled } from '../admin-public-demo';

describe('isAdminPublicDemoEnabled', () => {
  const prevNode = process.env.NODE_ENV;
  const prevDemo = process.env.NEXT_PUBLIC_ADMIN_PUBLIC_DEMO;

  const setEnv = (key: string, value: string | undefined) => {
    if (value === undefined) {
      delete (process.env as Record<string, unknown>)[key];
    } else {
      Object.defineProperty(process.env, key, {
        value,
        writable: true,
        configurable: true,
      });
    }
  };

  afterEach(() => {
    setEnv('NODE_ENV', prevNode);
    setEnv('NEXT_PUBLIC_ADMIN_PUBLIC_DEMO', prevDemo);
  });

  it('returns false in production even when build flag is true', () => {
    setEnv('NODE_ENV', 'production');
    setEnv('NEXT_PUBLIC_ADMIN_PUBLIC_DEMO', 'true');
    expect(isAdminPublicDemoEnabled()).toBe(false);
  });

  it('returns true in development when build flag is true', () => {
    setEnv('NODE_ENV', 'development');
    setEnv('NEXT_PUBLIC_ADMIN_PUBLIC_DEMO', 'true');
    expect(isAdminPublicDemoEnabled()).toBe(true);
  });

  it('returns false when build flag is false', () => {
    setEnv('NODE_ENV', 'development');
    setEnv('NEXT_PUBLIC_ADMIN_PUBLIC_DEMO', 'false');
    expect(isAdminPublicDemoEnabled()).toBe(false);
  });
});
