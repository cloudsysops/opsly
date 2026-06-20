import { describe, it, expect } from 'vitest';
import { extractIp } from '../audit';

describe('extractIp', () => {
  it('should prioritize cf-connecting-ip', () => {
    const request = {
      headers: new Headers({
        'cf-connecting-ip': '1.1.1.1',
        'x-forwarded-for': '2.2.2.2',
        'x-real-ip': '3.3.3.3',
      }),
    } as unknown as Request;

    expect(extractIp(request)).toBe('1.1.1.1');
  });

  it('should prioritize x-forwarded-for over x-real-ip', () => {
    const request = {
      headers: new Headers({
        'x-forwarded-for': '2.2.2.2, 4.4.4.4',
        'x-real-ip': '3.3.3.3',
      }),
    } as unknown as Request;

    expect(extractIp(request)).toBe('2.2.2.2');
  });

  it('should take the first IP from x-forwarded-for', () => {
    const request = {
      headers: new Headers({
        'x-forwarded-for': ' 5.5.5.5 , 6.6.6.6',
      }),
    } as unknown as Request;

    expect(extractIp(request)).toBe('5.5.5.5');
  });

  it('should use x-real-ip if others are missing', () => {
    const request = {
      headers: new Headers({
        'x-real-ip': '3.3.3.3',
      }),
    } as unknown as Request;

    expect(extractIp(request)).toBe('3.3.3.3');
  });

  it('should return unknown if no IP headers are present', () => {
    const request = {
      headers: new Headers({}),
    } as unknown as Request;

    expect(extractIp(request)).toBe('unknown');
  });

  it('should handle whitespace in headers', () => {
    const request = {
      headers: new Headers({
        'cf-connecting-ip': ' 1.1.1.1 ',
      }),
    } as unknown as Request;

    expect(extractIp(request)).toBe('1.1.1.1');
  });
});
