const MIN_ADDRESS_LENGTH = 3;

/**
 * MVP area check without Google Maps: address must mention an allowed state (USPS-style).
 */
export function addressMentionsAllowedState(
  address: string,
  allowedStatesUppercase: readonly string[]
): boolean {
  const trimmed = address.trim();
  if (trimmed.length < MIN_ADDRESS_LENGTH) {
    return false;
  }
  const upper = trimmed.toUpperCase();
  return allowedStatesUppercase.some((st) => {
    const re = new RegExp(`\\b${st}\\b`);
    return re.test(upper);
  });
}
