export const FRANCHISE_SCHEMA_NOT_AVAILABLE = 'FRANCHISE_SCHEMA_NOT_AVAILABLE';

export class FranchisePersistenceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'FranchisePersistenceError';
    this.code = code;
    this.status = status;
  }
}

export function schemaMissingError(): FranchisePersistenceError {
  return new FranchisePersistenceError(
    FRANCHISE_SCHEMA_NOT_AVAILABLE,
    'Franchise OS schema is not applied in this environment',
    503
  );
}

export function isUndefinedTable(error: { code?: string; message?: string }): boolean {
  const message = error.message ?? '';
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|schema cache/i.test(message)
  );
}
