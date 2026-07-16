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
