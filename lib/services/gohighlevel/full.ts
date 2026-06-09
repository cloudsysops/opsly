/** Full surface (includes AI workflows). Supabase / batch jobs import from here. */
export {
  GoHighLevelClient,
  GoHighLevelService,
  getGoHighLevelService,
} from './index.js';
export { runAILeadFollowupWorkflow, triggerFollowupForContact } from './workflows/ai-lead-followup.js';
export type {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  Task,
  CreateTaskRequest,
  Appointment,
  SendMessageRequest,
  ListContactsFilter,
  GoHighLevelResponse,
  ListResponse,
  Opportunity,
  Conversation,
  ConversationMessage,
  SearchConversationsFilter,
  SearchConversationsResponse,
  SendConversationMessageRequest,
  SendConversationMessageResponse,
} from './types.js';
export type { AIFollowupConfig, AIFollowupResult } from './workflows/ai-lead-followup.js';
