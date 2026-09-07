import { z } from 'zod';

export const createStudentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  grade: z.string().trim().min(1).max(40),
  parent_email: z.string().trim().email().optional(),
  parent_phone: z.string().trim().min(7).max(20).optional(),
  enrollment_date: z.string().date().optional(),
  notes: z.string().trim().max(500).optional(),
}).strict();

export const updateStudentSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  grade: z.string().trim().min(1).max(40).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  parent_email: z.string().trim().email().optional(),
  parent_phone: z.string().trim().min(7).max(20).optional(),
  notes: z.string().trim().max(500).optional(),
}).strict();
