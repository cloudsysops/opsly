import { z } from 'zod';
// NOTE: GoHighLevel services removed. This tool is deprecated and should be replaced with WhatsApp integration.
// import { getGoHighLevelService } from '@intcloudsysops/services/gohighlevel/index.js';
import type { ToolDefinition } from '../types/index.js';

const DEPRECATION_ERROR = {
  success: false,
  error: 'GoHighLevel integration has been removed. Please use WhatsApp integration instead.',
};

// Input schemas
const ListContactsInputSchema = z.object({
  tenantId: z.string().min(1),
  status: z.string().optional(),
  source: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});

const GetContactInputSchema = z.object({
  tenantId: z.string().min(1),
  contactId: z.string().min(1),
});

const CreateContactInputSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  source: z.string().optional(),
});

const UpdateContactInputSchema = z.object({
  tenantId: z.string().min(1),
  contactId: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  status: z.string().optional(),
});

const CreateTaskInputSchema = z.object({
  tenantId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium').optional(),
  contactId: z.string().optional(),
});

const UpdateTaskInputSchema = z.object({
  tenantId: z.string().min(1),
  taskId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

const SendMessageInputSchema = z.object({
  tenantId: z.string().min(1),
  contactId: z.string().min(1),
  message: z.string().min(1),
  channel: z.enum(['whatsapp', 'sms', 'email']),
  templateId: z.string().optional(),
});

// Tool definitions
export const listContactsTool: ToolDefinition<z.infer<typeof ListContactsInputSchema>, unknown> = {
  name: 'gohighlevel:list_contacts',
  description:
    'List GoHighLevel contacts/leads with optional filtering. Returns paginated list of contacts.',
  inputSchema: ListContactsInputSchema,
  handler: async () => DEPRECATION_ERROR,
};

export const getContactTool: ToolDefinition<z.infer<typeof GetContactInputSchema>, unknown> = {
  name: 'gohighlevel:get_contact',
  description: 'Fetch a single GoHighLevel contact by ID with full details.',
  inputSchema: GetContactInputSchema,
  handler: async () => DEPRECATION_ERROR,
};

export const createContactTool: ToolDefinition<z.infer<typeof CreateContactInputSchema>, unknown> = {
  name: 'gohighlevel:create_contact',
  description: 'Create a new contact in GoHighLevel CRM.',
  inputSchema: CreateContactInputSchema,
  handler: async () => DEPRECATION_ERROR,
};

export const updateContactTool: ToolDefinition<z.infer<typeof UpdateContactInputSchema>, unknown> = {
  name: 'gohighlevel:update_contact',
  description: 'Update an existing contact in GoHighLevel CRM.',
  inputSchema: UpdateContactInputSchema,
  handler: async () => DEPRECATION_ERROR,
};

export const createTaskTool: ToolDefinition<z.infer<typeof CreateTaskInputSchema>, unknown> = {
  name: 'gohighlevel:create_task',
  description: 'Create a task/follow-up in GoHighLevel for a contact.',
  inputSchema: CreateTaskInputSchema,
  handler: async () => DEPRECATION_ERROR,
};

export const updateTaskTool: ToolDefinition<z.infer<typeof UpdateTaskInputSchema>, unknown> = {
  name: 'gohighlevel:update_task',
  description: 'Update an existing task in GoHighLevel.',
  inputSchema: UpdateTaskInputSchema,
  handler: async () => DEPRECATION_ERROR,
};

export const sendMessageTool: ToolDefinition<z.infer<typeof SendMessageInputSchema>, unknown> = {
  name: 'gohighlevel:send_message',
  description:
    'Send a message to a contact via WhatsApp, SMS, or email through GoHighLevel.',
  inputSchema: SendMessageInputSchema,
  handler: async () => DEPRECATION_ERROR,
};

export const goHighLevelTools = [
  listContactsTool,
  getContactTool,
  createContactTool,
  updateContactTool,
  createTaskTool,
  updateTaskTool,
  sendMessageTool,
];
