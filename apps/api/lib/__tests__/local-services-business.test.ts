import { describe, expect, it } from 'vitest';

import {
  createLocalServicesBusinessResource,
  isLocalServicesBusinessResource,
  parseLocalServicesListQuery,
} from '../local-services-business';

describe('local-services-business', () => {
  it('isLocalServicesBusinessResource narrows known ids', () => {
    expect(isLocalServicesBusinessResource('services')).toBe(true);
    expect(isLocalServicesBusinessResource('unknown')).toBe(false);
  });

  it('parseLocalServicesListQuery applies defaults and caps', () => {
    const req = new Request('http://localhost/api/local-services/services');
    const q = parseLocalServicesListQuery(req);
    expect(q.limit).toBe(20);
    expect(q.offset).toBe(0);
  });

  it('parseLocalServicesListQuery respects limit and offset', () => {
    const req = new Request('http://localhost/api/local-services/services?limit=5&offset=10');
    const q = parseLocalServicesListQuery(req);
    expect(q.limit).toBe(5);
    expect(q.offset).toBe(10);
  });

  it('createLocalServicesBusinessResource rejects non-object body', () => {
    const res = createLocalServicesBusinessResource('customers', []);
    expect(res.status).toBe(400);
  });

  it('createLocalServicesBusinessResource returns 501 for object body', async () => {
    const res = createLocalServicesBusinessResource('bookings', { name: 'x' });
    expect(res.status).toBe(501);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('NOT_IMPLEMENTED');
  });
});
