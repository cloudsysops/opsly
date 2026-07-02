/**
 * LEGACY (GHL compatibility): SMS/WhatsApp/task channel for leads with ghl_contact_id.
 * Used by LeadFollowupService and TrialSchedulerService when legacy id exists.
 */
import type {
  Conversation,
  ConversationMessage,
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  Task,
  CreateTaskRequest,
  Appointment,
  ListContactsFilter,
  ListResponse,
  Opportunity,
  SearchConversationsFilter,
  SendConversationMessageRequest,
  SendConversationMessageResponse,
  SendMessageRequest,
} from '@intcloudsysops/services/gohighlevel';

export interface PeskidsGoHighLevelThreadClient {
  getContacts(filter?: ListContactsFilter): Promise<ListResponse<Contact>>;
  getContact(contactId: string): Promise<Contact>;
  createContact(data: CreateContactRequest): Promise<Contact>;
  updateContact(contactId: string, data: UpdateContactRequest): Promise<Contact>;
  getTasks(contactId?: string): Promise<Task[]>;
  createTask(data: CreateTaskRequest): Promise<Task>;
  updateTask(taskId: string, data: Partial<CreateTaskRequest>): Promise<Task>;
  getAppointments(contactId?: string): Promise<Appointment[]>;
  updateOpportunityStageForContact(contactId: string, pipelineStageId: string): Promise<Opportunity>;
  listTags(): Promise<Array<{ id: string; name: string }>>;
  addContactTags(contactId: string, tags: string[]): Promise<void>;
  deleteContact(contactId: string): Promise<void>;
  getLastRateLimitInfo(): { remaining: number | null; resetAt: string | null };
  sendMessage(data: SendMessageRequest): Promise<{ id: string; status: string }>;
  searchConversations(
    filter?: SearchConversationsFilter & { locationId?: string }
  ): Promise<{ conversations: Conversation[]; total: number }>;
  getConversation(conversationId: string): Promise<Conversation>;
  getConversationMessages(
    conversationId: string,
    options?: { locationId?: string; limit?: number; page?: number }
  ): Promise<ConversationMessage[]>;
  findConversationByContactId(contactId: string): Promise<Conversation | null>;
  sendConversationMessage(
    data: SendConversationMessageRequest
  ): Promise<SendConversationMessageResponse>;
}
