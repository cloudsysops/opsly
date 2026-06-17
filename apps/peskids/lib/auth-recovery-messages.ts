export function recoveryExchangeErrorMessage(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();
  if (lower.includes('pkce') || lower.includes('code verifier')) {
    return 'El enlace caducó o se abrió en otro navegador. Solicita uno nuevo desde el mismo dispositivo donde pediste la recuperación.';
  }
  return errorMessage;
}
