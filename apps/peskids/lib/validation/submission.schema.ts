import { z } from 'zod';

export const createSubmissionSchema = z.object({
  formId: z.string().trim().min(1, 'formId es requerido'),
  data: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0, {
    message: 'data no puede estar vacío',
  }),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
