import { describe, expect, it } from 'vitest';
import {
  inviteActivationErrorMessage,
  validateInviteActivationForm,
} from '../invite-activation-validation';

describe('validateInviteActivationForm', () => {
  const ok = {
    password: 'password123',
    confirm: 'password123',
    email: 'a@b.co',
    token: 'tok',
  };

  it('returns null when all fields are valid', () => {
    expect(validateInviteActivationForm(ok)).toBeNull();
  });

  it('returns password_mismatch when confirm differs', () => {
    expect(validateInviteActivationForm({ ...ok, confirm: 'other' })).toBe('password_mismatch');
  });

  it('returns password_too_short when password has fewer than 8 chars', () => {
    expect(
      validateInviteActivationForm({
        ...ok,
        password: 'short',
        confirm: 'short',
      })
    ).toBe('password_too_short');
  });

  it('returns missing_email when email is empty', () => {
    expect(validateInviteActivationForm({ ...ok, email: '' })).toBe('missing_email');
  });

  it('returns missing_token when token is empty', () => {
    expect(validateInviteActivationForm({ ...ok, token: '' })).toBe('missing_token');
  });
});

describe('inviteActivationErrorMessage', () => {
  it('returns Spanish copy for each code', () => {
    expect(inviteActivationErrorMessage('password_mismatch')).toContain('coinciden');
    expect(inviteActivationErrorMessage('password_too_short')).toContain('8');
    expect(inviteActivationErrorMessage('missing_email')).toContain('email');
    expect(inviteActivationErrorMessage('missing_token')).toContain('Token');
  });
});
