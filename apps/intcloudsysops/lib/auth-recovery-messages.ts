export function recoveryExchangeErrorMessage(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();
  if (lower.includes('pkce') || lower.includes('code verifier')) {
    return 'El enlace caducó o ya fue usado. Solicita uno nuevo desde «¿Olvidaste tu contraseña?».';
  }
  if (lower.includes('otp_expired') || lower.includes('expired')) {
    return 'El enlace caducó. Solicita uno nuevo desde «¿Olvidaste tu contraseña?».';
  }
  return errorMessage;
}
