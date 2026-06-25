import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { extractIp } from '../audit';

describe('extractIp', () => {
  it('should prioritize cf-connecting-ip over other headers', () => {
    const request = new NextRequest('https://example.com', {
      headers: {
        'cf-connecting-ip': '1.1.1.1',
        'x-forwarded-for': '2.2.2.2, 3.3.3.3',
        'x-real-ip': '4.4.4.4',
      },
    });
    expect(extractIp(request)).toBe('1.1.1.1');
  });

  it('should use the first IP in x-forwarded-for if cf-connecting-ip is missing', () => {
    const request = new NextRequest('https://example.com', {
      headers: {
        'x-forwarded-for': '2.2.2.2, 3.3.3.3',
        'x-real-ip': '4.4.4.4',
      },
    });
    expect(extractIp(request)).toBe('2.2.2.2');
  });

  it('should use x-real-ip if other headers are missing', () => {
    const request = new NextRequest('https://example.com', {
      headers: {
        'x-real-ip': '4.4.4.4',
      },
    });
    expect(extractIp(request)).toBe('4.4.4.4');
  });

  it('should return null if no headers are present', () => {
    const request = new NextRequest('https://example.com');
    expect(extractIp(request)).toBe(null);
  });

  it('should work with standard Request objects', () => {
    const request = new Request('https://example.com', {
      headers: {
        'cf-connecting-ip': '1.1.1.1',
      },
    });
    // @ts-expect-error - testing compatibility with standard Request
    expect(extractIp(request)).toBe('1.1.1.1');
  });
});
