import { z } from 'zod';

export const createImprovementMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(3, 'Escribe al menos 3 caracteres')
    .max(2000, 'El mensaje no puede superar 2000 caracteres'),
});

export type CreateImprovementMessageInput = z.infer<typeof createImprovementMessageSchema>;
