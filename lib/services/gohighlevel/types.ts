export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  status?: string;
  customFields?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateContactRequest {
  name?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateContactRequest {
  name?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  customFields?: Record<string, unknown>;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  assignedTo?: string;
  status?: 'open' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  contactId?: string;
  createdAt?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate?: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
  contactId?: string;
}

export interface Appointment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  contactId?: string;
  status?: string;
  resourceId?: string;
  notes?: string;
  createdAt?: string;
}

export interface SendMessageRequest {
  contactId: string;
  message: string;
  channel: 'whatsapp' | 'sms' | 'email';
  templateId?: string;
  variables?: Record<string, unknown>;
}

export interface ListContactsFilter {
  status?: string;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface GoHighLevelResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface Opportunity {
  id: string;
  contactId?: string;
  pipelineStageId?: string;
  pipelineId?: string;
  name?: string;
}
