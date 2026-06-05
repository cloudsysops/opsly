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
  conversationId?: string;
  replyToMessageId?: string;
}

export interface Conversation {
  id: string;
  contactId?: string;
  locationId?: string;
  status?: string;
  unreadCount?: number;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  contact?: Contact;
  assigneeId?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversationMessage {
  id: string;
  conversationId?: string;
  contactId?: string;
  direction?: 'inbound' | 'outbound';
  channel?: 'sms' | 'whatsapp' | 'email' | 'call' | string;
  body?: string;
  text?: string;
  message?: string;
  subject?: string;
  senderName?: string;
  senderContact?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchConversationsFilter {
  contactId?: string;
  query?: string;
  status?: string;
  page?: number;
  limit?: number;
  pageLimit?: number;
}

export interface SearchConversationsResponse {
  conversations?: Conversation[];
  data?: Conversation[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface SendConversationMessageRequest {
  contactId?: string;
  conversationId?: string;
  replyToMessageId?: string;
  message: string;
  channel: 'whatsapp' | 'sms' | 'email';
  templateId?: string;
  variables?: Record<string, unknown>;
  status?: 'pending' | 'delivered' | 'failed' | 'read';
}

export interface SendConversationMessageResponse {
  id: string;
  status: string;
  conversationId?: string;
  messageId?: string;
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
  status?: string;
  createdAt?: string;
  contact?: Contact;
}

export interface SearchOpportunitiesFilter {
  pipelineId?: string;
  pipelineStageId?: string;
  contactId?: string;
  page?: number;
  limit?: number;
  pageLimit?: number;
}

export interface SearchOpportunitiesResponse {
  opportunities?: Opportunity[];
  data?: Opportunity[];
  total?: number;
  page?: number;
  limit?: number;
}
