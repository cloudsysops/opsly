/**
 * PII minimisation: explicit per-audience response projections.
 *
 * Peskids holds data about children — names, dates of birth, guardian emails and
 * phone numbers, medical/safety notes. The default across the app used to be
 * `select('*')` plus "return the row", which meant an endpoint's PII exposure
 * changed silently every time a column was added.
 *
 * These builders are the opposite: an allow-list per audience. A new column is
 * invisible until someone adds it here on purpose, and the response-shape tests
 * assert the omitted fields are genuinely absent (not present-but-null, which
 * still tells a caller the field exists).
 */

/** Columns a family may see on their own conversation thread. */
export const FAMILY_MESSAGE_COLUMNS = [
  'id',
  'source',
  'sender_name',
  'message_text',
  'direction',
  'status',
  'created_at',
] as const;

export type FamilyMessageView = {
  id: string;
  source: string;
  sender_name: string | null;
  message_text: string;
  direction: string;
  status: string | null;
  created_at: string;
};

type MessageRowLike = {
  id: string;
  source: string;
  sender_name: string | null;
  message_text: string;
  direction: string;
  status: string | null;
  created_at: string;
};

/**
 * Deliberately drops: tenant_id, franchise_id (internal topology),
 * sender_contact (the caller's own address — echoing it adds nothing and widens
 * the blast radius of a mis-scoped query), external_id and parent_message_id
 * (provider/internal ids), ai_generated, updated_at.
 */
export function toFamilyMessageView(row: MessageRowLike): FamilyMessageView {
  return {
    id: row.id,
    source: row.source,
    sender_name: row.sender_name,
    message_text: row.message_text,
    direction: row.direction,
    status: row.status,
    created_at: row.created_at,
  };
}

export type ClassRosterEntry = {
  id: string;
  class_id: string;
  student_id: string;
  status: string;
  payment_status: string;
  attendance: string | null;
  joined_at: string | null;
  student_name?: string;
  /** Present only when the audience is allowed guardian contact details. */
  parent_email?: string | null;
};

type RosterRowLike = ClassRosterEntry & { parent_email?: string | null };

/**
 * Class roster projection.
 *
 * `includeGuardianContact` is false for the teacher audience by default: taking
 * attendance does not require a guardian's email address. Operational staff
 * (owner/admin/support), who do the actual family follow-up, keep it.
 */
export function toClassRosterEntry(
  row: RosterRowLike,
  options: { includeGuardianContact: boolean }
): ClassRosterEntry {
  const base: ClassRosterEntry = {
    id: row.id,
    class_id: row.class_id,
    student_id: row.student_id,
    status: row.status,
    payment_status: row.payment_status,
    attendance: row.attendance ?? null,
    joined_at: row.joined_at ?? null,
    student_name: row.student_name,
  };

  // Note the shape: when contact is not allowed the key is absent entirely,
  // never `parent_email: null`.
  if (options.includeGuardianContact) {
    base.parent_email = row.parent_email ?? null;
  }
  return base;
}

/**
 * Whether this audience may see guardian contact details on a class roster.
 *
 * Teachers are excluded unless the tenant explicitly opts in — a product
 * decision, so it is a flag rather than a hard-coded answer, and it is off by
 * default (fail closed).
 */
export function maySeeGuardianContact(
  role: string | undefined,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const normalized = (role ?? '').trim().toLowerCase();
  if (normalized === 'owner' || normalized === 'admin' || normalized === 'support') {
    return true;
  }
  if (normalized === 'teacher') {
    return (env.PESKIDS_TEACHER_FAMILY_CONTACT_ENABLED ?? '').trim().toLowerCase() === 'true';
  }
  return false;
}

/**
 * PostgREST `or=` filters are built by string concatenation, so a value
 * containing a comma, parenthesis, quote or backslash can change the meaning of
 * the filter. Values that could do so are rejected rather than escaped.
 */
export function isPostgrestFilterSafe(value: string): boolean {
  return !/[,()"\\*]/.test(value);
}
