import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { extractIp } from '../audit';

describe('Audit IP Extraction', () => {
  it('prioritizes cf-connecting-ip over others', () => {
    const req = new NextRequest('http://localhost', {
      headers: {
        'cf-connecting-ip': '1.1.1.1',
        'x-forwarded-for': '2.2.2.2',
        'x-real-ip': '3.3.3.3',
      },
    });
    expect(extractIp(req)).toBe('1.1.1.1');
  });

  it('falls back to x-forwarded-for if cf-connecting-ip is missing', () => {
    const req = new NextRequest('http://localhost', {
      headers: {
        'x-forwarded-for': '2.2.2.2, 4.4.4.4',
        'x-real-ip': '3.3.3.3',
      },
    });
    expect(extractIp(req)).toBe('2.2.2.2');
  });

  it('falls back to x-real-ip if others are missing', () => {
    const req = new NextRequest('http://localhost', {
      headers: {
        'x-real-ip': '3.3.3.3',
      },
    });
    expect(extractIp(req)).toBe('3.3.3.3');
  });

  it('returns unknown if no headers are present', () => {
    const req = new NextRequest('http://localhost');
    expect(extractIp(req)).toBe('unknown');
  });
});
