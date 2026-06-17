/**
 * LeadConnector (services.leadconnectorhq.com) expects customFields as an array,
 * not a key/value object. Callers may pass Record<string, unknown> for ergonomics;
 * normalize before POST/PUT contact payloads.
 */
export interface GhlCustomFieldInput {
  key?: string;
  id?: string;
  field_value?: string | number | boolean | null;
  value?: string | number | boolean | null;
}

export type GhlCustomFieldsInput = Record<string, unknown> | readonly GhlCustomFieldInput[];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCustomFieldInput(value: unknown): value is GhlCustomFieldInput {
  if (!isPlainObject(value)) {
    return false;
  }
  return 'key' in value || 'id' in value || 'field_value' in value || 'value' in value;
}

function serializeFieldValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return String(value);
}

/**
 * Converts app-level custom field maps to LeadConnector array payloads.
 * Returns undefined when there is nothing to send (omit field on wire).
 */
export function normalizeCustomFieldsForLeadConnector(
  customFields?: GhlCustomFieldsInput
): GhlCustomFieldInput[] | undefined {
  if (customFields === undefined) {
    return undefined;
  }

  if (Array.isArray(customFields)) {
    if (customFields.length === 0) {
      return undefined;
    }
    return customFields.map((field) => {
      if (!isCustomFieldInput(field)) {
        throw new Error('customFields array entries must include key or id');
      }
      if (field.id) {
        const value = field.field_value ?? field.value;
        return value === undefined
          ? { id: field.id }
          : { id: field.id, field_value: serializeFieldValue(value) };
      }
      if (field.key) {
        const value = field.field_value ?? field.value;
        return value === undefined
          ? { key: field.key }
          : { key: field.key, field_value: serializeFieldValue(value) };
      }
      throw new Error('customFields array entries must include key or id');
    });
  }

  const entries = Object.entries(customFields).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );
  if (entries.length === 0) {
    return undefined;
  }

  return entries.map(([key, value]) => ({
    key,
    field_value: serializeFieldValue(value),
  }));
}
