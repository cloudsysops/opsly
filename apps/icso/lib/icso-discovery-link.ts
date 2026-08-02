/**
 * Discovery booking URL for post-lead CTA.
 * Set NEXT_PUBLIC_ICSO_DISCOVERY_BOOKING_URL (Twenty / Cal.com / n8n).
 */
export async function resolveIcsoDiscoveryBookingUrl(): Promise<string | null> {
  const configuredUrl = process.env.NEXT_PUBLIC_ICSO_DISCOVERY_BOOKING_URL?.trim();
  return configuredUrl || null;
}
