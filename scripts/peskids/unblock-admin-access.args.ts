export type PasswordMode = 'preserve' | 'from-env' | 'reset-temp';

export interface UnblockAdminArgs {
  email: string;
  passwordMode: PasswordMode;
}

const DEFAULT_EMAIL = 'peskids.admin@gmail.com';

/**
 * Password policy (existing users):
 * - default / --keep-password → metadata + membership only (never rotate password)
 * - --set-password-from-env → PESKIDS_ADMIN_PASSWORD
 * - --reset-temp-password → one-off random password (explicit opt-in)
 */
export function parseUnblockAdminArgs(argv: string[]): UnblockAdminArgs {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
  const emailArg = argv.find((arg) => arg.includes('@'))?.trim().toLowerCase();

  if (flags.has('--set-password-from-env') && flags.has('--reset-temp-password')) {
    throw new Error('Use only one of --set-password-from-env or --reset-temp-password');
  }
  if (
    flags.has('--set-password-from-env') &&
    (flags.has('--keep-password') || flags.has('--preserve-password'))
  ) {
    throw new Error('--set-password-from-env conflicts with --keep-password');
  }

  let passwordMode: PasswordMode = 'preserve';
  if (flags.has('--set-password-from-env')) {
    passwordMode = 'from-env';
  } else if (flags.has('--reset-temp-password')) {
    passwordMode = 'reset-temp';
  }
  // --keep-password is backward-compatible alias for default preserve mode.

  return {
    email: emailArg && emailArg.includes('@') ? emailArg : DEFAULT_EMAIL,
    passwordMode,
  };
}
