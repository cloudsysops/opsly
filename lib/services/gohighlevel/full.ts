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
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
  CustomField,
  CreateCustomFieldRequest,
  CustomFieldModel,
  CustomFieldValue,
  Opportunity,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  SearchOpportunitiesFilter,
  OpportunityStatus,
  Calendar,
  CreateCalendarRequest,
  GoHighLevelResponse,
  ListResponse,
} from './types.js';
export type { AIFollowupConfig, AIFollowupResult } from './workflows/ai-lead-followup.js';
