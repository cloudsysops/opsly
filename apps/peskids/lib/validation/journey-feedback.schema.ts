import { z } from 'zod';

const scale = z.number().int().min(1).max(5);

/**
 * Short structured teacher feedback. Evidence, not diagnosis.
 * Forbidden: psychological/medical diagnosis, fixed labeling of the child.
 */
export const peskidsTeacherFeedbackSchema = z
  .object({
    student_id: z.string().trim().min(1),
    class_id: z.string().trim().min(1),
    participation: scale,
    skill_progress: scale,
    achievement: z.string().trim().min(1).max(200),
    area_to_reinforce: z.string().trim().min(1).max(200),
    confidence: scale,
    short_observation: z.string().trim().max(280).optional(),
    recommended_next_step: z.string().trim().min(1).max(200),
    family_visible: z.boolean().default(false),
  })
  .strict()
  .refine((value) => !/(diagn[oó]stic|tdah|autis|trastorno|enfermedad)/i.test(
    `${value.achievement} ${value.area_to_reinforce} ${value.short_observation ?? ''} ${value.recommended_next_step}`
  ), {
    message: 'Teacher feedback must not include diagnosis or medical labeling',
  });

export type PeskidsTeacherFeedback = z.infer<typeof peskidsTeacherFeedbackSchema>;

export const peskidsFamilyFeedbackSchema = z
  .object({
    family_id: z.string().trim().min(1),
    student_id: z.string().trim().min(1).optional(),
    satisfaction: scale,
    child_enjoyment: scale,
    observed_improvement: z.boolean(),
    concern: z.string().trim().max(280).optional(),
    contact_request: z.boolean().default(false),
    comment: z.string().trim().max(500).optional(),
  })
  .strict();

export type PeskidsFamilyFeedback = z.infer<typeof peskidsFamilyFeedbackSchema>;

export type FamilyVisibleProgressEntry = {
  occurred_at: string;
  class_id: string;
  attendance: 'present' | 'absent' | 'excused';
  achievement?: string;
  skill_progress?: number;
};

export type InternalTeacherNoteEntry = {
  occurred_at: string;
  class_id: string;
  short_observation: string;
  area_to_reinforce?: string;
};

/**
 * Longitudinal progress. Append-only: never overwrite previous observations.
 */
export type StudentProgressTimeline = {
  student_id: string;
  family_visible: FamilyVisibleProgressEntry[];
  internal_teacher_notes: InternalTeacherNoteEntry[];
};

export function appendProgressEntry<T>(history: readonly T[], next: T): T[] {
  return [...history, next];
}
