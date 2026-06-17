import { describe, expect, it } from 'vitest';
import { normalizeCustomFieldsForLeadConnector } from '../custom-fields.js';

describe('normalizeCustomFieldsForLeadConnector', () => {
  it('returns undefined for undefined input', () => {
    expect(normalizeCustomFieldsForLeadConnector(undefined)).toBeUndefined();
  });

  it('returns undefined for empty object', () => {
    expect(normalizeCustomFieldsForLeadConnector({})).toBeUndefined();
  });

  it('converts a field map to key/field_value array entries', () => {
    expect(
      normalizeCustomFieldsForLeadConnector({
        child_name: 'Mateo',
        grade_interested: '5-7',
      })
    ).toEqual([
      { key: 'child_name', field_value: 'Mateo' },
      { key: 'grade_interested', field_value: '5-7' },
    ]);
  });

  it('omits null, undefined, and empty string values', () => {
    expect(
      normalizeCustomFieldsForLeadConnector({
        child_name: 'Mateo',
        child_age: null,
        interest: '',
        grade_interested: undefined,
      })
    ).toEqual([{ key: 'child_name', field_value: 'Mateo' }]);
  });

  it('passes through id-based array entries using field_value', () => {
    expect(
      normalizeCustomFieldsForLeadConnector([
        { id: 'field-1', value: 'Mateo' },
        { id: 'field-2', field_value: 8 },
      ])
    ).toEqual([
      { id: 'field-1', field_value: 'Mateo' },
      { id: 'field-2', field_value: 8 },
    ]);
  });

  it('returns undefined for empty array', () => {
    expect(normalizeCustomFieldsForLeadConnector([])).toBeUndefined();
  });
});
