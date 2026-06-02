import { z } from 'zod';

export const reservaClaseGratuitaSchema = z.object({
  // Lead/Parent info
  nombre_completo: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  telefono: z.string().min(7, 'Phone must be at least 7 characters'),

  // Student/Child info
  nombre_estudiante: z.string().min(2, 'Student name must be at least 2 characters'),
  grado_o_edad: z.string().min(1, 'Grade or age is required'),

  // Trial class selection
  ubicacion: z.enum(['llanogrande', 'domicilio'], {
    errorMap: () => ({ message: 'Location must be llanogrande or domicilio' }),
  }),

  // Lead source tracking
  fuente_origen: z.enum(
    ['instagram', 'facebook', 'website', 'referencia', 'otro'],
    { errorMap: () => ({ message: 'Lead source is required' }) }
  ),

  // Optional fields
  barrio: z.string().optional(),
  notas: z.string().max(500).optional(),
});

export type ReservaClaseGratuitaInput = z.infer<typeof reservaClaseGratuitaSchema>;

export const bookingResponseSchema = z.object({
  ok: z.boolean(),
  data: z.object({
    id: z.string().uuid(),
    lead_id: z.string().uuid(),
    student_id: z.string().uuid().nullable(),
    reservation_id: z.string().uuid().nullable(),
    status: z.enum(['confirmed', 'pending', 'error']),
    message: z.string(),
  }).optional(),
  error: z.string().optional(),
  request_id: z.string(),
});

export type BookingResponse = z.infer<typeof bookingResponseSchema>;
