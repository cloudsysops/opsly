/**
 * Response-shape tests for PII minimisation.
 *
 * These assert the omitted fields are ABSENT, not present-but-null: a
 * `parent_email: null` still tells a caller the field exists and would be
 * repopulated by a careless refactor.
 */
import { describe, expect, it } from 'vitest';
import {
  FAMILY_MESSAGE_COLUMNS,
  isPostgrestFilterSafe,
  maySeeGuardianContact,
  toClassRosterEntry,
  toFamilyMessageView,
} from '../pii-projections';

const FULL_MESSAGE_ROW = {
  id: 'm1',
  tenant_id: 'peskids',
  franchise_id: 'llano',
  source: 'web',
  sender_name: 'María',
  sender_contact: 'maria@example.com',
  message_text: 'Hola',
  external_id: 'wacrm:9876',
  direction: 'inbound',
  parent_message_id: 'm0',
  status: 'pending',
  ai_generated: true,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-02T00:00:00.000Z',
};

describe('toFamilyMessageView', () => {
  const view = toFamilyMessageView(FULL_MESSAGE_ROW);
  const keys = Object.keys(view);

  it('returns exactly the allow-listed keys', () => {
    expect(keys.sort()).toEqual([...FAMILY_MESSAGE_COLUMNS].sort());
  });

  for (const omitted of [
    'tenant_id',
    'franchise_id',
    'sender_contact',
    'external_id',
    'parent_message_id',
    'ai_generated',
    'updated_at',
  ]) {
    it(`omits ${omitted} entirely (absent, not null)`, () => {
      expect(keys).not.toContain(omitted);
      expect(omitted in view).toBe(false);
    });
  }

  it('does not leak the contact address anywhere in the serialized payload', () => {
    expect(JSON.stringify(view)).not.toContain('maria@example.com');
    expect(JSON.stringify(view)).not.toContain('wacrm:9876');
  });

  it('keeps the fields the family conversation actually needs', () => {
    expect(view.message_text).toBe('Hola');
    expect(view.direction).toBe('inbound');
    expect(view.created_at).toBe('2026-09-01T00:00:00.000Z');
  });
});

describe('toClassRosterEntry', () => {
  const row = {
    id: 'e1',
    class_id: 'c1',
    student_id: 's1',
    status: 'confirmed',
    payment_status: 'paid',
    attendance: null,
    joined_at: '2026-09-01T00:00:00.000Z',
    student_name: 'Ana',
    parent_email: 'guardian@example.com',
  };

  it('OMITS the guardian email for an audience that may not see it', () => {
    const entry = toClassRosterEntry(row, { includeGuardianContact: false });
    expect('parent_email' in entry).toBe(false);
    expect(JSON.stringify(entry)).not.toContain('guardian@example.com');
  });

  it('includes it for an audience that may', () => {
    const entry = toClassRosterEntry(row, { includeGuardianContact: true });
    expect(entry.parent_email).toBe('guardian@example.com');
  });

  it('still exposes what attendance-taking needs', () => {
    const entry = toClassRosterEntry(row, { includeGuardianContact: false });
    expect(entry.student_name).toBe('Ana');
    expect(entry.status).toBe('confirmed');
  });
});

describe('maySeeGuardianContact', () => {
  it('allows operational staff', () => {
    for (const role of ['owner', 'admin', 'support']) {
      expect(maySeeGuardianContact(role, {} as NodeJS.ProcessEnv)).toBe(true);
    }
  });

  it('DENIES teachers by default', () => {
    expect(maySeeGuardianContact('teacher', {} as NodeJS.ProcessEnv)).toBe(false);
  });

  it('allows teachers only when the tenant explicitly opts in', () => {
    expect(
      maySeeGuardianContact('teacher', {
        PESKIDS_TEACHER_FAMILY_CONTACT_ENABLED: 'true',
      } as unknown as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it('denies unknown or missing roles', () => {
    expect(maySeeGuardianContact(undefined, {} as NodeJS.ProcessEnv)).toBe(false);
    expect(maySeeGuardianContact('intern', {} as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe('isPostgrestFilterSafe', () => {
  it('accepts an ordinary email', () => {
    expect(isPostgrestFilterSafe('maria@example.com')).toBe(true);
  });

  it('rejects values that could rewrite a PostgREST or= filter', () => {
    expect(isPostgrestFilterSafe('a,b@example.com')).toBe(false);
    expect(isPostgrestFilterSafe('a(b)@example.com')).toBe(false);
    expect(isPostgrestFilterSafe('a"b@example.com')).toBe(false);
    expect(isPostgrestFilterSafe('a\\b@example.com')).toBe(false);
    expect(isPostgrestFilterSafe('*@example.com')).toBe(false);
  });
});
