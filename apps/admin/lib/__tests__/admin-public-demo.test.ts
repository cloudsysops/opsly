import { afterEach, describe, expect, it } from 'vitest';
import { isAdminPublicDemoEnabled } from '../admin-public-demo';

describe('isAdminPublicDemoEnabled', () => {
  const prevNode = process.env.NODE_ENV;
  const prevDemo = process.env.NEXT_PUBLIC_ADMIN_PUBLIC_DEMO;

  afterEach(() => {
    process.env.NODE_ENV = prevNode;
    if (prevDemo === undefined) {
      delete process.env.NEXT_PUBLIC_ADMIN_PUBLIC_DEMO;
    } else {
      process.env.NEXT_PUBLIC_ADMIN_PUBLIC_DEMO = prevDemo;
    }
  });

  it('returns false in production even when build flag is true', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_ADMIN_PUBLIC_DEMO = 'true';
    expect(isAdminPublicDemoEnabled()).toBe(false);
  });

  it('returns true in development when build flag is true', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_ADMIN_PUBLIC_DEMO = 'true';
    expect(isAdminPublicDemoEnabled()).toBe(true);
  });

  it('returns false when build flag is false', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_ADMIN_PUBLIC_DEMO = 'false';
    expect(isAdminPublicDemoEnabled()).toBe(false);
  });
});
