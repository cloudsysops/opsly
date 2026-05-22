export { GoHighLevelClient } from './client.js';
export { GoHighLevelService, getGoHighLevelService } from './service.js';
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
} from './types.js';
export type { AIFollowupConfig, AIFollowupResult } from './workflows/ai-lead-followup.js';
