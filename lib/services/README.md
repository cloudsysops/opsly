---
title: '@intcloudsysops/services'
description: 'Data access layer with multi-tenant isolation'
---

# @intcloudsysops/services

Repository pattern and base service layer for consistent data access across all services with built-in multi-tenant isolation.

## Features

- ✅ **Repository Pattern** — Consistent data access interface
- 🔒 **Multi-Tenant Isolation** — Automatic tenantId scoping
- 📄 **Type-Safe Queries** — Full TypeScript support
- 🧪 **Testable** — Mock-friendly interfaces
- ⚡ **Caching Ready** — Hook points for cache integration

## Usage

### Implement a Repository

```typescript
import { BaseRepository } from '@intcloudsysops/services';

interface Agent {
  id: string;
  tenantId: string;
  name: string;
  status: 'active' | 'disabled';
}

class AgentRepository extends BaseRepository<Agent> {
  constructor(db: Database) {
    super(db, 'agents');
  }

  async findActive(tenantId: string): Promise<Agent[]> {
    return this.db.from('agents').select('*').eq('tenant_id', tenantId).eq('status', 'active');
  }
}
```

### Use Repository in Service

```typescript
class AgentService {
  constructor(private agentRepo: AgentRepository) {}

  async getAgent(id: string, tenantId: string): Promise<Agent> {
    const agent = await this.agentRepo.find(id, tenantId);
    if (!agent) throw new NotFoundError('Agent not found');
    return agent;
  }

  async createAgent(data: Omit<Agent, 'id'>, tenantId: string): Promise<Agent> {
    return this.agentRepo.create({ ...data, tenantId }, tenantId);
  }
}
```

### Use in API Route

```typescript
import { AgentRepository } from '@lib/services';

app.post('/api/agents', async (req, res) => {
  const { tenantId } = req.user;
  const agentRepo = new AgentRepository(db);

  const agent = await agentRepo.create(req.body, tenantId);
  res.json({ success: true, agent });
});
```

## Repository Interface

```typescript
interface Repository<T> {
  find(id: string, tenantId: string): Promise<T | null>;
  findAll(tenantId: string): Promise<T[]>;
  create(data: T, tenantId: string): Promise<T>;
  update(id: string, data: Partial<T>, tenantId: string): Promise<T>;
  delete(id: string, tenantId: string): Promise<void>;
}
```

## Multi-Tenant Safety

All queries automatically scoped to tenantId:

```typescript
// This is safe — can't accidentally leak data across tenants
const user = await userRepo.find('u123', 'tenant-abc');
// Only returns user if user.tenantId === 'tenant-abc'
```

## Testing

```typescript
import { MockRepository } from '@intcloudsysops/services';

class MockAgentRepository extends MockRepository<Agent> {}

const mockRepo = new MockAgentRepository([{ id: 'a1', tenantId: 'tenant-abc', name: 'Agent 1' }]);

const service = new AgentService(mockRepo);
const agent = await service.getAgent('a1', 'tenant-abc');
```

## See Also

- `GOVERNANCE.md` — Repository standards, review process
- `__tests__/` — Repository and service examples
