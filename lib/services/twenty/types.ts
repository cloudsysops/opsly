export type TwentyPersonName = {
  firstName: string;
  lastName: string;
};

export type TwentyCreatePersonRequest = {
  name: TwentyPersonName;
  emails?: {
    primaryEmail: string;
  };
  phones?: {
    primaryPhoneNumber?: string;
    primaryPhoneCallingCode?: string;
  };
  jobTitle?: string;
};

export type TwentyPersonRecord = {
  id: string;
  name?: TwentyPersonName;
};

export type TwentyCreateOpportunityRequest = {
  name: string;
  stage?: string;
  pointOfContact?: {
    connect: {
      id: string;
    };
  };
};

export type TwentyUpdateOpportunityRequest = {
  name?: string;
  stage?: string;
};

export type TwentyOpportunityRecord = {
  id: string;
  name?: string;
  stage?: string;
};

/**
 * Twenty's Task status enum. NEEDS LIVE VERIFICATION against a real Twenty
 * instance before relying on this in production — this is Twenty's documented
 * core object model but wasn't checked against a live API from here.
 */
export type TwentyTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type TwentyCreateTaskRequest = {
  title: string;
  body?: string;
  dueAt?: string;
  status?: TwentyTaskStatus;
};

export type TwentyUpdateTaskRequest = Partial<TwentyCreateTaskRequest>;

export type TwentyTaskRecord = {
  id: string;
  title?: string;
  status?: TwentyTaskStatus;
};

/**
 * Twenty relates a Task to a Person/Opportunity/Company via a separate
 * TaskTarget join object rather than a direct foreign key on Task.
 */
export type TwentyCreateTaskTargetRequest = {
  taskId: string;
  personId?: string;
  opportunityId?: string;
};

export type TwentyTaskTargetRecord = {
  id: string;
};

export type TwentyApiEnvelope<T> = {
  data?: T | Record<string, T | undefined>;
  errors?: Array<{ message?: string }>;
  messages?: string[];
};

export type TwentyCreateCompanyRequest = {
  name: string;
  domainName?: {
    primaryLinkUrl: string;
  };
  address?: {
    addressCity?: string;
    addressCountry?: string;
  };
};

export type TwentyUpdateCompanyRequest = Partial<TwentyCreateCompanyRequest>;

export type TwentyCompanyRecord = {
  id: string;
  name?: string;
};

export type TwentyCreateNoteRequest = {
  title: string;
  body?: string;
};

export type TwentyNoteRecord = {
  id: string;
  title?: string;
};

/**
 * Notes relate to Person/Company/Opportunity via a NoteTarget join object,
 * the same pattern Twenty uses for TaskTarget. NEEDS LIVE VERIFICATION
 * against a real Twenty instance — inferred from Task's documented pattern
 * and Twenty's REST docs (Core API generates identical CRUD + relation
 * conventions across built-in objects), not confirmed against a live API
 * from here.
 */
export type TwentyCreateNoteTargetRequest = {
  noteId: string;
  personId?: string;
  companyId?: string;
  opportunityId?: string;
};

export type TwentyNoteTargetRecord = {
  id: string;
};

/**
 * Webhook operation strings, per Twenty's docs: "{action}.{objectPluralApiName}"
 * (e.g. "create.companies"), with "*" as a wildcard for either half
 * ("*.companies" = all actions on companies; "create.*" = all creates;
 * "*" alone = everything). NEEDS LIVE VERIFICATION against a real Twenty
 * instance — cross-referenced from Twenty's public docs/community sources,
 * not confirmed against a live API from here.
 */
export type TwentyWebhookOperation = string;

export type TwentyCreateWebhookRequest = {
  targetUrl: string;
  operations: TwentyWebhookOperation[];
  description?: string;
  secret?: string;
};

export type TwentyWebhookRecord = {
  id: string;
  targetUrl?: string;
  operations?: TwentyWebhookOperation[];
  description?: string;
};

/**
 * Custom objects get REST endpoints named after their plural API name,
 * identical in shape to built-in objects (Twenty's Core API auto-generates
 * these per workspace schema) — so these generic record types intentionally
 * don't assume any specific custom object's fields.
 */
export type TwentyCustomRecord = {
  id: string;
  [field: string]: unknown;
};
