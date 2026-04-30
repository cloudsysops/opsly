import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from 'redis';
import { NamespacedRedis } from '../src/lib/redis-namespace-helper.js';

describe('Context Builder - Redis Namespace', () => {
  let redis: ReturnType<typeof createClient>;
  let ns: NamespacedRedis;

  const TENANT_SLUG = 'test-tenant';
  const SERVICE = 'ctx';

  beforeAll(async () => {
    redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
    });
    await redis.connect();
    ns = new NamespacedRedis(redis, TENANT_SLUG, SERVICE);
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('should set and get session context with namespace', async () => {
    const sessionId = 'session-123';
    const sessionData = JSON.stringify({
      tenant_slug: TENANT_SLUG,
      session_id: sessionId,
      messages: [{ role: 'user' as const, content: 'Hello' }],
    });

    await ns.set(`session:${sessionId}`, sessionData);
    const raw = await ns.get(`session:${sessionId}`);

    expect(raw).toBe(sessionData);
  });

  it('should maintain isolation between tenants', async () => {
    const sessionId = 'session-shared-id';
    const data1 = JSON.stringify({ value: 'data-from-tenant-1' });
    const data2 = JSON.stringify({ value: 'data-from-tenant-2' });

    const ns1 = new NamespacedRedis(redis, 'tenant-1', SERVICE);
    const ns2 = new NamespacedRedis(redis, 'tenant-2', SERVICE);

    await ns1.set(`session:${sessionId}`, data1);
    await ns2.set(`session:${sessionId}`, data2);

    const retrieved1 = await ns1.get(`session:${sessionId}`);
    const retrieved2 = await ns2.get(`session:${sessionId}`);

    expect(retrieved1).toBe(data1);
    expect(retrieved2).toBe(data2);

    // Cleanup
    await ns1.del(`session:${sessionId}`);
    await ns2.del(`session:${sessionId}`);
  });

  it('should save and load RAG data with TTL', async () => {
    const ragId = 'rag-knowledge-123';
    const ragData = JSON.stringify({
      chunks: [
        { id: '1', text: 'Chunk 1' },
        { id: '2', text: 'Chunk 2' },
      ],
    });

    await ns.setEx(`rag:${ragId}`, 3600, ragData);
    const raw = await ns.get(`rag:${ragId}`);

    expect(raw).toBe(ragData);

    // Check TTL
    const ttl = await ns.ttl(`rag:${ragId}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(3600);

    // Cleanup
    await ns.del(`rag:${ragId}`);
  });

  it('should list RAGs with pattern matching', async () => {
    const ragIds = ['rag-001', 'rag-002', 'rag-003'];

    for (const ragId of ragIds) {
      await ns.set(`rag:${ragId}`, JSON.stringify({ id: ragId }));
    }

    const keys = await ns.keys('rag:*');
    expect(keys.length).toBe(3);

    // Cleanup
    for (const ragId of ragIds) {
      await ns.del(`rag:${ragId}`);
    }
  });

  it('should delete correctly', async () => {
    const ragId = 'rag-to-delete';
    await ns.set(`rag:${ragId}`, JSON.stringify({ content: 'test' }));

    let exists = await ns.exists(`rag:${ragId}`);
    expect(exists).toBe(true);

    await ns.del(`rag:${ragId}`);
    const raw = await ns.get(`rag:${ragId}`);
    expect(raw).toBeNull();
  });
});
