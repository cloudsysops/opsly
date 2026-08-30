/**
 * Supabase Storage Client
 *
 * Lazy-loaded Supabase client for file storage operations.
 * Used for document management system.
 *
 * Environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for server-side operations
 *
 * Storage buckets:
 *   - documents: Franchise documents (FDD, agreements, manuals, etc.)
 *   - uploads: User uploads (certificates, compliance docs, etc.)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy-loaded Supabase client singleton
let supabaseClient: SupabaseClient | null = null;

/**
 * Get the Supabase client instance.
 * Returns null if environment variables are not configured.
 */
export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "Supabase not configured: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

// Storage bucket names
export const STORAGE_BUCKETS = {
  DOCUMENTS: "documents",
  UPLOADS: "uploads",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/**
 * Upload a file to Supabase storage.
 *
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket (e.g., "franchisee-123/doc.pdf")
 * @param file - The file buffer or Blob to upload
 * @param contentType - The MIME type of the file
 * @returns The public URL of the uploaded file, or null on error
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: Buffer | Blob,
  contentType: string
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return { url: null, error: "Supabase not configured" };
  }

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: false, // Don't overwrite existing files
  });

  if (error) {
    console.error("Supabase upload error:", error);
    return { url: null, error: error.message };
  }

  // Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return { url: publicUrl, error: null };
}

/**
 * Upload a new version of an existing file.
 * Uses upsert to replace the file at the given path.
 */
export async function uploadFileVersion(
  bucket: StorageBucket,
  path: string,
  file: Buffer | Blob,
  contentType: string
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return { url: null, error: "Supabase not configured" };
  }

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: true, // Overwrite existing file
  });

  if (error) {
    console.error("Supabase upload version error:", error);
    return { url: null, error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return { url: publicUrl, error: null };
}

/**
 * Delete a file from Supabase storage.
 */
export async function deleteFile(
  bucket: StorageBucket,
  path: string
): Promise<{ success: true; error: null } | { success: false; error: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return { success: false, error: "Supabase not configured" };
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error("Supabase delete error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Get a signed URL for temporary access to a private file.
 *
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - Seconds until the URL expires (default: 1 hour)
 */
export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return { url: null, error: "Supabase not configured" };
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("Supabase signed URL error:", error);
    return { url: null, error: error?.message || "Failed to create signed URL" };
  }

  return { url: data.signedUrl, error: null };
}

/**
 * List files in a bucket path.
 */
export async function listFiles(
  bucket: StorageBucket,
  path: string = "",
  options?: { limit?: number; offset?: number }
): Promise<
  | { files: { name: string; id: string; created_at: string }[]; error: null }
  | { files: null; error: string }
> {
  const supabase = getSupabase();

  if (!supabase) {
    return { files: null, error: "Supabase not configured" };
  }

  const { data, error } = await supabase.storage.from(bucket).list(path, {
    limit: options?.limit || 100,
    offset: options?.offset || 0,
  });

  if (error) {
    console.error("Supabase list error:", error);
    return { files: null, error: error.message };
  }

  return {
    files: data.map((f) => ({
      name: f.name,
      id: f.id || "",
      created_at: f.created_at || "",
    })),
    error: null,
  };
}

/**
 * Generate a unique file path for storage.
 *
 * @param franchiseeId - The franchisee account ID
 * @param fileName - The original file name
 * @param prefix - Optional prefix (e.g., "documents", "certificates")
 */
export function generateFilePath(
  franchiseeId: string,
  fileName: string,
  prefix?: string
): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const basePath = prefix
    ? `${franchiseeId}/${prefix}/${timestamp}-${sanitizedName}`
    : `${franchiseeId}/${timestamp}-${sanitizedName}`;

  return basePath;
}

/**
 * Get the public URL for a file in storage.
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string | null {
  const supabase = getSupabase();

  if (!supabase) {
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}
