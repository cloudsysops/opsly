import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { extractIp } from '../audit';

describe('extractIp', () => {
  it('should prioritize cf-connecting-ip', () => {
    const headers = new Headers({
      'cf-connecting-ip': '1.1.1.1',
      'x-forwarded-for': '2.2.2.2, 3.3.3.3',
      'x-real-ip': '4.4.4.4',
    });
    const req = new NextRequest(new URL('http://localhost'), { headers });
    expect(extractIp(req)).toBe('1.1.1.1');
  });

  it('should use first IP in x-forwarded-for if cf-connecting-ip is missing', () => {
    const headers = new Headers({
      'x-forwarded-for': '2.2.2.2, 3.3.3.3',
      'x-real-ip': '4.4.4.4',
    });
    const req = new NextRequest(new URL('http://localhost'), { headers });
    expect(extractIp(req)).toBe('2.2.2.2');
  });

  it('should use x-real-ip if both cf and xff are missing', () => {
    const headers = new Headers({
      'x-real-ip': '4.4.4.4',
    });
    const req = new NextRequest(new URL('http://localhost'), { headers });
    expect(extractIp(req)).toBe('4.4.4.4');
  });

  it('should support standard Request objects', () => {
    const headers = new Headers({
      'cf-connecting-ip': '1.1.1.1',
    });
    const req = new Request('http://localhost', { headers });
    expect(extractIp(req)).toBe('1.1.1.1');
  });

  it('should return unknown if no IP headers are present', () => {
    const req = new NextRequest(new URL('http://localhost'));
    expect(extractIp(req)).toBe('unknown');
  });

  it('should trim IP addresses', () => {
    const headers = new Headers({
      'cf-connecting-ip': ' 1.1.1.1 ',
    });
    const req = new Request('http://localhost', { headers });
    expect(extractIp(req)).toBe('1.1.1.1');
  });
});
