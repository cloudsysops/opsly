import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadFile, STORAGE_BUCKETS, generateFilePath } from '@/lib/supabase';

export const dynamic = "force-dynamic";

// POST /api/upload - Generic file upload endpoint
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Send a file in the "file" form field.' },
        { status: 400 }
      );
    }

    // Read the file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = file.name;
    const fileSize = file.size;
    const mimeType = file.type || 'application/octet-stream';

    // Generate a unique path using the admin user id as a namespace
    const path = generateFilePath(session.user.id, fileName, 'documents');

    // Upload to Supabase
    const result = await uploadFile(STORAGE_BUCKETS.DOCUMENTS, path, buffer, mimeType);

    if (result.error) {
      return NextResponse.json(
        { error: `Upload failed: ${result.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: result.url,
      fileName,
      fileSize,
      mimeType,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
