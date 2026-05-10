export interface Repository<T> {
  find(id: string, tenantId: string): Promise<T | null>;
  findAll(tenantId: string): Promise<T[]>;
  create(data: T, tenantId: string): Promise<T>;
  update(id: string, data: Partial<T>, tenantId: string): Promise<T>;
  delete(id: string, tenantId: string): Promise<void>;
}

export abstract class BaseRepository<T> implements Repository<T> {
  abstract find(id: string, tenantId: string): Promise<T | null>;
  abstract findAll(tenantId: string): Promise<T[]>;
  abstract create(data: T, tenantId: string): Promise<T>;
  abstract update(id: string, data: Partial<T>, tenantId: string): Promise<T>;
  abstract delete(id: string, tenantId: string): Promise<void>;

  // Multi-tenant check helper
  protected async checkTenantAccess(tenantId: string, userId: string): Promise<boolean> {
    // Verify user belongs to tenant
    return true; // Implement real check
  }
}
