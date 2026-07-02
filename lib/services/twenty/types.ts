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

export type TwentyApiEnvelope<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};
