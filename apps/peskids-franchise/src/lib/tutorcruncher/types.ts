// TutorCruncher API Types

// Service type (lesson location/format)
export type ServiceType = 'Home' | 'Online' | 'Retail' | 'School' | 'Other';

// Appointment (lesson) from TutorCruncher
export interface TCAppointment {
  id: number;
  url: string;
  service: {
    id: number;
    url: string;
    name: string;
    dft_location?: {
      id: number;
      name: string;
    };
  };
  topic: string;
  start: string; // ISO datetime
  finish: string; // ISO datetime
  status: 'planned' | 'complete' | 'cancelled' | 'awaiting-report';
  rcras: TCRcra[];
  charge_rate?: number;
  charge_type?: string;
  pay_rate?: number;
  gross_income?: number;
  net_income?: number;
  tutor: {
    id: number;
    url: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  sr?: {
    id: number;
    url: string;
    paying_client: {
      id: number;
      url: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  location?: {
    id: number;
    name: string;
  };
}

// Recipient (student) from appointment
export interface TCRcra {
  recipient: {
    id: number;
    url: string;
    first_name: string;
    last_name: string;
  };
  charge_rate?: number;
  pay_rate?: number;
}

// Client from TutorCruncher
export interface TCClient {
  id: number;
  url: string;
  user: {
    id: number;
    url: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  status: 'live' | 'prospective' | 'inactive';
  date_created: string;
}

// Tutor/Contractor from TutorCruncher
export interface TCContractor {
  id: number;
  url: string;
  user: {
    id: number;
    url: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  status: 'live' | 'prospective' | 'pending' | 'dormant' | 'inactive';
  date_created: string;
  review_rating?: number;
  review_count?: number;
}

// Invoice from TutorCruncher
export interface TCInvoice {
  id: number;
  url: string;
  display_id: string;
  date_sent?: string;
  due_date?: string;
  date_paid?: string;
  status: 'draft' | 'open' | 'paid' | 'void';
  gross: number;
  tax: number;
  net: number;
  client: {
    id: number;
    url: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

// Paginated response from TutorCruncher
export interface TCPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Sync result for a month
export interface TCMonthlySnapshot {
  year: number;
  month: number;
  grossRevenue: number;
  homeRevenue: number;
  onlineRevenue: number;
  retailRevenue: number;
  schoolRevenue: number;
  otherRevenue: number;
  totalLessons: number;
  totalHours: number;
  activeStudents: number;
  activeTutors: number;
  rawData: Record<string, unknown>; // Flexible for different data sources (TC API vs STC DB)
}

// Instance configuration
export interface TCInstance {
  id: string;
  name: string;
  baseUrl: string;
  token: string;
}

// Revenue by service type
export interface RevenueByService {
  home: number;
  online: number;
  retail: number;
  school: number;
  other: number;
  total: number;
}
