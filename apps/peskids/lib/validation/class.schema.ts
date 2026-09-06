import { z } from 'zod';

export const swimLocationSchema = z.enum(['llanogrande', 'domicilio']);

export const createClassSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    level: z.number().int().min(1).max(6),
    professor_user_id: z.string().uuid(),
    pool_id: z.string().uuid(),
    location: swimLocationSchema,
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    capacity: z.number().int().positive(),
    price_cents: z.number().int().nonnegative(),
    currency: z.string().trim().min(3).max(3).default('cop'),
  })
  .refine((data) => new Date(data.ends_at).getTime() > new Date(data.starts_at).getTime(), {
    message: 'ends_at must be after starts_at',
    path: ['ends_at'],
  });

export const updateClassSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  level: z.number().int().min(1).max(6).optional(),
  professor_user_id: z.string().uuid().optional(),
  pool_id: z.string().uuid().optional(),
  location: swimLocationSchema.optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  capacity: z.number().int().positive().optional(),
  price_cents: z.number().int().nonnegative().optional(),
  status: z.enum(['scheduled', 'cancelled', 'completed']).optional(),
  cancelled_reason: z.string().trim().max(500).optional(),
  session_notes: z.string().trim().max(500).optional(),
});

export const teacherUpdateClassSchema = z
  .object({
    starts_at: z.string().datetime().optional(),
    ends_at: z.string().datetime().optional(),
    session_notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  })
  .refine(
    (data) => {
      if (data.starts_at && data.ends_at) {
        return new Date(data.ends_at).getTime() > new Date(data.starts_at).getTime();
      }
      return true;
    },
    { message: 'ends_at must be after starts_at', path: ['ends_at'] }
  );

export const createEnrollmentSchema = z.object({
  class_id: z.string().uuid(),
  student_id: z.string().uuid(),
});

export const attendanceUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        enrollment_id: z.string().uuid(),
        attendance: z.enum(['present', 'absent', 'excused']),
        behavior_tags: z
          .array(z.enum(['happy', 'engaged', 'calm', 'shy', 'tired', 'needs_support', 'other']))
          .max(4)
          .optional(),
        teacher_note: z.string().trim().max(500).optional(),
      })
    )
    .min(1),
});

export const checkoutSchema = z
  .object({
    enrollment_id: z.string().uuid(),
    provider: z.enum(['stripe', 'wompi']).optional().default('stripe'),
  })
  .strict();
