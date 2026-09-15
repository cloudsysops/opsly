import { z } from 'zod';

export const DATA_BACKUP_MAX_SIZE_BYTES = 5_242_880; // matches peskids-staff-uploads bucket limit

export const dataBackupUploadSchema = z.object({
  name: z.string().trim().min(1).max(180),
  mime_type: z
    .string()
    .trim()
    .regex(
      /^(text\/csv|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/i,
      'Solo se aceptan archivos CSV o Excel'
    ),
  size_bytes: z.number().int().positive().max(DATA_BACKUP_MAX_SIZE_BYTES, 'El archivo supera 5MB'),
  content_base64: z.string().min(8).max(7_000_000),
  note: z.string().trim().max(500).optional(),
});

export type DataBackupUploadInput = z.infer<typeof dataBackupUploadSchema>;
