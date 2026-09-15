import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import type { DataBackupUploadInput } from '@/lib/validation/data-backup.schema';

export type DataBackupRecord = Database['public']['Tables']['admin_data_backups']['Row'];

const BUCKET = 'peskids-staff-uploads';

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 120);
}

export async function saveDataBackup(
  input: DataBackupUploadInput,
  uploadedByEmail: string | null
): Promise<DataBackupRecord> {
  const admin = supabaseServer();
  const path = `peskids/db-backups/${Date.now()}-${safeFileName(input.name)}`;
  const binary = Buffer.from(input.content_base64, 'base64');

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, binary, { contentType: input.mime_type, upsert: false });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error } = await admin
    .from('admin_data_backups')
    .insert({
      uploaded_by_email: uploadedByEmail,
      file_name: input.name,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      storage_path: path,
      note: input.note ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as DataBackupRecord;
}

export async function listDataBackups(): Promise<DataBackupRecord[]> {
  const admin = supabaseServer();
  const { data, error } = await admin
    .from('admin_data_backups')
    .select('id, file_name, mime_type, size_bytes, uploaded_by_email, note, created_at')
    .eq('tenant_id', 'peskids')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : 'Failed to list backups');
  }

  return (data ?? []) as DataBackupRecord[];
}
