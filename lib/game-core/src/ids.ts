import { randomUUID } from 'node:crypto';

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function looksLikeEmail(value: string): boolean {
  return value.includes('@');
}

export function looksLikePhone(value: string): boolean {
  const trimmed = value.trim();
  return /^\+?\d[\d\s()-]{8,}$/.test(trimmed);
}
