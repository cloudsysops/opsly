import { isIntcloudsysopsGhlEnabled } from '@intcloudsysops/services/twenty';
import { resolveGoHighLevelEnv } from '@intcloudsysops/services/gohighlevel';
import { findIcsoDiscoveryCalendar } from '@/lib/ghl-setup';

/**
 * Primary: NEXT_PUBLIC_ICSO_DISCOVERY_BOOKING_URL (Twenty / Cal.com / n8n).
 * Legacy: GHL calendar URL when INTCLOUDSYSOPS_GHL_ENABLED=true.
 */
export async function resolveIcsoDiscoveryBookingUrl(): Promise<string | null> {
  const configuredUrl = process.env.NEXT_PUBLIC_ICSO_DISCOVERY_BOOKING_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  if (!isIntcloudsysopsGhlEnabled()) {
    return null;
  }

  try {
    const calendarId = await findIcsoDiscoveryCalendar();
    if (!calendarId) {
      return null;
    }
    const { locationId } = resolveGoHighLevelEnv();
    return `https://app.gohighlevel.com/calendar/${locationId}/${calendarId}`;
  } catch (error) {
    console.warn('[ICSO] Failed to resolve legacy GHL discovery calendar:', error);
    return null;
  }
}
