export class UniverseError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'UniverseError';
    this.code = code;
  }
}

export class UniverseUnknownCharacterError extends UniverseError {
  constructor(ref: string) {
    super('UNKNOWN_CHARACTER', `Unknown universe character: ${ref}`);
    this.name = 'UniverseUnknownCharacterError';
  }
}

export class UniverseUnknownWorldError extends UniverseError {
  constructor(ref: string) {
    super('UNKNOWN_WORLD', `Unknown universe world: ${ref}`);
    this.name = 'UniverseUnknownWorldError';
  }
}

export class UniverseCanonMutationError extends UniverseError {
  constructor(detail: string) {
    super('CANON_IMMUTABLE', `Tenant adaptation cannot mutate global canon: ${detail}`);
    this.name = 'UniverseCanonMutationError';
  }
}
