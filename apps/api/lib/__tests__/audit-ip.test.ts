import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { extractIp } from '../audit';

describe('extractIp', () => {
  it('prioritizes cf-connecting-ip', () => {
    const request = new NextRequest('http://localhost', {
      headers: {
        'cf-connecting-ip': '1.1.1.1',
        'x-forwarded-for': '2.2.2.2, 3.3.3.3',
        'x-real-ip': '4.4.4.4',
      },
    });
    expect(extractIp(request)).toBe('1.1.1.1');
  });

  it('uses first x-forwarded-for if cf-connecting-ip is missing', () => {
    const request = new NextRequest('http://localhost', {
      headers: {
        'x-forwarded-for': '2.2.2.2, 3.3.3.3',
        'x-real-ip': '4.4.4.4',
      },
    });
    expect(extractIp(request)).toBe('2.2.2.2');
  });

  it('uses x-real-ip if others are missing', () => {
    const request = new NextRequest('http://localhost', {
      headers: {
        'x-real-ip': '4.4.4.4',
      },
    });
    expect(extractIp(request)).toBe('4.4.4.4');
  });

  it('returns null if no IP headers are present', () => {
    const request = new NextRequest('http://localhost', {
      headers: {},
    });
    expect(extractIp(request)).toBeNull();
  });

  it('handles standard Request objects', () => {
    const request = new Request('http://localhost', {
      headers: {
        'cf-connecting-ip': '1.1.1.1',
      },
    });
    expect(extractIp(request)).toBe('1.1.1.1');
  });

  it('trims whitespace from headers', () => {
    const request = new NextRequest('http://localhost', {
      headers: {
        'cf-connecting-ip': ' 1.1.1.1 ',
      },
    });
    expect(extractIp(request)).toBe('1.1.1.1');
  });
});
