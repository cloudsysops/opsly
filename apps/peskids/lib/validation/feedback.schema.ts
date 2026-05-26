import { z } from 'zod';

export const feedbackSchema = z.object({
  child_name: z.string().min(2).max(80).optional(),
  student_name: z.string().min(2).max(80).optional(),
  name: z.string().min(2).max(80).optional(),
  body: z.string().min(2).max(1200).optional(),
  suggestion: z.string().min(2).max(1200).optional(),
  feedback: z.string().min(2).max(1200).optional(),
  notes: z.string().min(2).max(1200).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  satisfaction: z.coerce.number().int().min(1).max(5).optional(),
  author_type: z.enum(['parent', 'teacher', 'staff']).default('parent'),
  subject_type: z.enum(['general', 'class', 'student', 'operations']).default('student'),
  visibility: z.enum(['public', 'private']).optional(),
  audience: z.enum(['family', 'teacher', 'admin']).optional(),
  status: z.enum(['new', 'reviewed', 'action_required', 'closed']).default('new'),
  contact_wanted: z.boolean().default(false),
  parent_email: z.string().email().nullable().optional(),
  author_ref_id: z.string().uuid().nullable().optional(),
  subject_ref_id: z.string().uuid().nullable().optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
