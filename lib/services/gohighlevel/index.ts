export { GoHighLevelClient } from './client.js';
export type { GoHighLevelClientOptions } from './client.js';
export { GoHighLevelService, getGoHighLevelService } from './service.js';
export {
  GOHIGHLEVEL_DEFAULT_API_URL,
  GOHIGHLEVEL_DEFAULT_API_VERSION,
  isGoHighLevelConfigured,
  isGoHighLevelPeskidsConfigured,
  resolveGoHighLevelEnv,
  resolveGoHighLevelPeskidsEnv,
} from './env-config.js';
export type { GoHighLevelEnvConfig } from './env-config.js';
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
