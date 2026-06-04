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

export interface Tag {
  id: string;
  name: string;
  locationId?: string;
}

export interface CreateTagRequest {
  name: string;
}

export interface UpdateTagRequest {
  name?: string;
}

export type CustomFieldModel = 'contact' | 'opportunity' | 'all';

export interface CustomField {
  id: string;
  name: string;
  fieldKey?: string;
  placeholder?: string;
  dataType?: string;
  position?: number;
  picklistOptions?: string[];
  picklistImageOptions?: string[];
  isAllowedCustomOption?: boolean;
  isMultiFileAllowed?: boolean;
  maxFileLimit?: number;
  locationId?: string;
  model?: Exclude<CustomFieldModel, 'all'>;
}

export interface CreateCustomFieldRequest {
  name: string;
  dataType: string;
  placeholder?: string;
  acceptedFormat?: string[];
  isMultipleFile?: boolean;
  maxNumberOfFiles?: number;
  textBoxListOptions?: Array<{ label: string; prefillValue?: string }>;
  position?: number;
  model?: Exclude<CustomFieldModel, 'all'>;
}

export interface CustomFieldValue {
  id?: string;
  key?: string;
  field_value: string | string[] | Record<string, unknown>;
}

export type OpportunityStatus = 'open' | 'won' | 'lost' | 'abandoned' | 'all';

export interface OpportunityContact {
  id?: string;
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
}

export interface Opportunity {
  id: string;
  name?: string;
  monetaryValue?: number;
  pipelineId?: string;
  pipelineStageId?: string;
  assignedTo?: string;
  status?: OpportunityStatus;
  source?: string;
  lastStatusChangeAt?: string;
  lastStageChangeAt?: string;
  lastActionDate?: string;
  indexVersion?: string | number;
  createdAt?: string;
  updatedAt?: string;
  contactId?: string;
  locationId?: string;
  contact?: OpportunityContact;
  lostReasonId?: string;
  customFields?: Array<{ id?: string; fieldValue?: string | string[] | Record<string, unknown> }>;
  followers?: unknown[];
}

export interface CreateOpportunityRequest {
  pipelineId: string;
  name: string;
  status: Exclude<OpportunityStatus, 'all'>;
  contactId: string;
  pipelineStageId?: string;
  monetaryValue?: number;
  assignedTo?: string;
  customFields?: CustomFieldValue[];
  source?: string;
  lostReasonId?: string;
}

export interface UpdateOpportunityRequest {
  pipelineId?: string;
  name?: string;
  status?: Exclude<OpportunityStatus, 'all'>;
  contactId?: string;
  pipelineStageId?: string;
  monetaryValue?: number;
  assignedTo?: string;
  customFields?: CustomFieldValue[];
  source?: string;
  lostReasonId?: string;
}

export interface SearchOpportunitiesFilter {
  limit?: number;
  offset?: number;
  query?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: OpportunityStatus;
  contactId?: string;
  assignedTo?: string;
  [key: string]: unknown;
}

export interface Calendar {
  id: string;
  locationId?: string;
  groupId?: string;
  name?: string;
  isActive?: boolean;
  teamMembers?: Array<{ userId: string; priority?: number }>;
  meetingLocationType?: string;
  [key: string]: unknown;
}

export interface CreateCalendarRequest {
  locationId?: string;
  [key: string]: unknown;
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
