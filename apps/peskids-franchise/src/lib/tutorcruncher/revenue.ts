import type { TCAppointment, RevenueByService, ServiceType } from './types';

// Categorize appointment by service type based on service name or location
export function categorizeServiceType(appointment: TCAppointment): ServiceType {
  const serviceName = appointment.service?.name?.toLowerCase() || '';
  const locationName =
    appointment.location?.name?.toLowerCase() ||
    appointment.service?.dft_location?.name?.toLowerCase() ||
    '';

  // Check for explicit service type indicators
  if (serviceName.includes('online') || serviceName.includes('virtual')) {
    return 'Online';
  }
  if (serviceName.includes('school') || locationName.includes('school')) {
    return 'School';
  }
  if (
    serviceName.includes('home') ||
    serviceName.includes('in-home') ||
    locationName.includes('home')
  ) {
    return 'Home';
  }
  if (
    serviceName.includes('retail') ||
    serviceName.includes('center') ||
    serviceName.includes('office')
  ) {
    return 'Retail';
  }

  // Default categorization based on location
  if (locationName) {
    if (locationName.includes('online') || locationName.includes('zoom')) {
      return 'Online';
    }
    if (locationName.includes('school') || locationName.includes('academy')) {
      return 'School';
    }
    // If has a location but not online/school, assume retail
    return 'Retail';
  }

  // Fallback to Other
  return 'Other';
}

// Calculate revenue from a single appointment
export function calculateAppointmentRevenue(
  appointment: TCAppointment
): number {
  // Use gross_income if available, otherwise calculate from charge rate
  if (appointment.gross_income !== undefined) {
    return appointment.gross_income;
  }

  // Calculate from individual student charges if available
  if (appointment.rcras && appointment.rcras.length > 0) {
    const duration = calculateDurationHours(
      appointment.start,
      appointment.finish
    );
    return appointment.rcras.reduce((total, rcra) => {
      const rate = rcra.charge_rate || 0;
      return total + rate * duration;
    }, 0);
  }

  // Fallback to charge_rate if available
  if (appointment.charge_rate) {
    const duration = calculateDurationHours(
      appointment.start,
      appointment.finish
    );
    return appointment.charge_rate * duration;
  }

  return 0;
}

// Calculate duration in hours between two ISO timestamps
export function calculateDurationHours(start: string, finish: string): number {
  const startDate = new Date(start);
  const finishDate = new Date(finish);
  const durationMs = finishDate.getTime() - startDate.getTime();
  return durationMs / (1000 * 60 * 60); // Convert to hours
}

// Aggregate revenue by service type from appointments
export function aggregateRevenueByService(
  appointments: TCAppointment[]
): RevenueByService {
  const revenue: RevenueByService = {
    home: 0,
    online: 0,
    retail: 0,
    school: 0,
    other: 0,
    total: 0,
  };

  for (const appointment of appointments) {
    // Only count completed appointments
    if (appointment.status !== 'complete') {
      continue;
    }

    const amount = calculateAppointmentRevenue(appointment);
    const serviceType = categorizeServiceType(appointment);

    switch (serviceType) {
      case 'Home':
        revenue.home += amount;
        break;
      case 'Online':
        revenue.online += amount;
        break;
      case 'Retail':
        revenue.retail += amount;
        break;
      case 'School':
        revenue.school += amount;
        break;
      default:
        revenue.other += amount;
    }
    revenue.total += amount;
  }

  // Round to 2 decimal places
  return {
    home: Math.round(revenue.home * 100) / 100,
    online: Math.round(revenue.online * 100) / 100,
    retail: Math.round(revenue.retail * 100) / 100,
    school: Math.round(revenue.school * 100) / 100,
    other: Math.round(revenue.other * 100) / 100,
    total: Math.round(revenue.total * 100) / 100,
  };
}

// Calculate total hours from appointments
export function calculateTotalHours(appointments: TCAppointment[]): number {
  return appointments
    .filter((a) => a.status === 'complete')
    .reduce(
      (total, a) => total + calculateDurationHours(a.start, a.finish),
      0
    );
}

// Get unique active students from appointments
export function getActiveStudentIds(appointments: TCAppointment[]): Set<number> {
  const studentIds = new Set<number>();
  for (const appointment of appointments) {
    if (appointment.status === 'complete' && appointment.rcras) {
      for (const rcra of appointment.rcras) {
        if (rcra.recipient?.id) {
          studentIds.add(rcra.recipient.id);
        }
      }
    }
  }
  return studentIds;
}

// Get unique active tutors from appointments
export function getActiveTutorIds(appointments: TCAppointment[]): Set<number> {
  const tutorIds = new Set<number>();
  for (const appointment of appointments) {
    if (appointment.status === 'complete' && appointment.tutor?.id) {
      tutorIds.add(appointment.tutor.id);
    }
  }
  return tutorIds;
}
