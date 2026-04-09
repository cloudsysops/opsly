/**
 * Validación previa al flujo Supabase (invite OTP / exchangeCode) en `/invite/[token]`.
 * Sin efectos secundarios — apto para Vitest sin mocks de red.
 */

export type InviteActivationValidationError =
  | "password_mismatch"
  | "password_too_short"
  | "missing_email"
  | "missing_token";

const ERROR_MESSAGES_ES: Record<InviteActivationValidationError, string> = {
  password_mismatch: "Las contraseñas no coinciden",
  password_too_short: "Mínimo 8 caracteres",
  missing_email: "Falta el parámetro email en el enlace",
  missing_token: "Token de invitación no válido",
};

export function inviteActivationErrorMessage(
  code: InviteActivationValidationError,
): string {
  return ERROR_MESSAGES_ES[code];
}

export function validateInviteActivationForm(input: {
  password: string;
  confirm: string;
  email: string;
  token: string;
}): InviteActivationValidationError | null {
  if (input.password !== input.confirm) {
    return "password_mismatch";
  }
  if (input.password.length < 8) {
    return "password_too_short";
  }
  if (!input.email || input.email.length === 0) {
    return "missing_email";
  }
  if (!input.token || input.token.length === 0) {
    return "missing_token";
  }
  return null;
}
