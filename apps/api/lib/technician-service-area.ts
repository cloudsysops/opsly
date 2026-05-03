/**
 * MVP area check without Google Maps: address must mention an allowed state (USPS-style).
 */
export function addressMentionsAllowedState(
  address: string,
  allowedStatesUppercase: readonly string[]
): boolean {
  const trimmed = address.trim();
  if (trimmed.length < 3) {
    return false;
  }
  const upper = trimmed.toUpperCase();
  return allowedStatesUppercase.some((st) => {
    const re = new RegExp(`\\b${st}\\b`);
    return re.test(upper);
  });
}
