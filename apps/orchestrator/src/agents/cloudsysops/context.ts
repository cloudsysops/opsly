/**
 * Construcción de contexto en texto para inyectar en el Sales Agent (sin Supabase aquí;
 * el caller puede poblar desde API/Context Builder cuando existan tablas).
 */

export interface SalesCustomerProfile {
  name: string;
  bookingCount: number;
  avgRating: number;
  lifetimeSpendUsd: number;
  lastBookingDate?: string;
}

export interface AvailabilitySlot {
  date: string;
  time: string;
}

export function buildSalesAgentContextBlock(
  customer: SalesCustomerProfile,
  slots: AvailabilitySlot[]
): string {
  const slotLines =
    slots.length > 0
      ? slots.map((s) => `- ${s.date} ${s.time}`).join('\n')
      : '- (no slots supplied)';
  return [
    'Customer profile:',
    `- Name: ${customer.name}`,
    `- Previous bookings: ${String(customer.bookingCount)}`,
    `- Avg rating: ${String(customer.avgRating)}`,
    `- Lifetime spend: $${String(customer.lifetimeSpendUsd)}`,
    `- Last booking: ${customer.lastBookingDate ?? 'n/a'}`,
    '',
    'Available slots this week:',
    slotLines,
    '',
    'Service area: RI (primary), MA/CT (secondary, +$25 travel).',
  ].join('\n');
}

export interface OpsBookingSnapshot {
  customerName: string;
  serviceType: string;
  repeatCustomer: boolean;
}

export interface PriorServiceSummary {
  recommendations: string;
}

export function buildOpsAgentContextBlock(
  booking: OpsBookingSnapshot,
  prior: PriorServiceSummary[]
): string {
  const priorLine =
    prior.length > 0
      ? prior.map((p) => p.recommendations).join('; ')
      : 'none on record';
  return [
    `Customer: ${booking.customerName}`,
    `Service: ${booking.serviceType}`,
    `Repeat customer: ${booking.repeatCustomer ? 'yes' : 'no'}`,
    `Previous recommendations: ${priorLine}`,
  ].join('\n');
}
