import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as consentPOST } from '../consent/route';
import { POST as dsarPOST } from '../dsar/route';
import { GET as dsarGET } from '../dsar/[token]/route';
import { extractClientIp } from '../../../../lib/rate-limit-ip';

// Mock Redis to simulate rate limiting
const { mockSendCommand } = vi.hoisted(() => ({
  mockSendCommand: vi.fn(),
}));

vi.mock('redis', () => ({
  createClient: vi.fn().mockReturnValue({
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    isOpen: true,
    sendCommand: mockSendCommand,
  }),
}));

describe('Governance Security Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  describe('IP Extraction & Spoofing Prevention', () => {
    it('prioritizes cf-connecting-ip over other headers', () => {
      const req = new NextRequest('http://localhost', {
        headers: {
          'cf-connecting-ip': '1.1.1.1',
          'x-forwarded-for': '2.2.2.2, 3.3.3.3',
          'x-real-ip': '4.4.4.4',
        },
      });
      expect(extractClientIp(req)).toBe('1.1.1.1');
    });

    it('falls back to x-forwarded-for if cf-connecting-ip is missing', () => {
      const req = new NextRequest('http://localhost', {
        headers: {
          'x-forwarded-for': '2.2.2.2, 3.3.3.3',
          'x-real-ip': '4.4.4.4',
        },
      });
      expect(extractClientIp(req)).toBe('2.2.2.2');
    });

    it('falls back to x-real-ip if others are missing', () => {
      const req = new NextRequest('http://localhost', {
        headers: {
          'x-real-ip': '4.4.4.4',
        },
      });
      expect(extractClientIp(req)).toBe('4.4.4.4');
    });
  });

  describe('Rate Limiting', () => {
    it('POST /api/governance/consent returns 429 when rate limited', async () => {
      // Mock Redis returning [31, 60] (over limit of 30)
      mockSendCommand.mockResolvedValue([31, 60]);

      const req = new NextRequest('http://localhost/api/governance/consent', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '1.1.1.1' },
        body: JSON.stringify({}),
      });

      const res = await consentPOST(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toBe('Too many requests');
    });

    it('POST /api/governance/dsar returns 429 when rate limited', async () => {
      mockSendCommand.mockResolvedValue([31, 60]);

      const req = new NextRequest('http://localhost/api/governance/dsar', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '1.1.1.1' },
        body: JSON.stringify({}),
      });

      const res = await dsarPOST(req);
      expect(res.status).toBe(429);
    });

    it('GET /api/governance/dsar/[token] returns 429 when rate limited', async () => {
      mockSendCommand.mockResolvedValue([31, 60]);

      const req = new NextRequest('http://localhost/api/governance/dsar/test-token', {
        headers: { 'cf-connecting-ip': '1.1.1.1' },
      });

      const res = await dsarGET(req, { params: Promise.resolve({ token: 'test-token' }) });
      expect(res.status).toBe(429);
    });
  });
});
