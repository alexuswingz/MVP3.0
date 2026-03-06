import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = 'public/uploads/action-items';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/** Sanitize filename: keep safe chars and extension, avoid path traversal. */
function sanitizeFileName(name: string): string {
  const base = path.basename(name);
  const ext = path.extname(base);
  const nameWithoutExt = base.slice(0, base.length - ext.length);
  const safe = nameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file';
  return `${safe}${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing or invalid file. Send one file in field "file".' },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const safeName = sanitizeFileName(file.name);
    const fileName = `${id}-${safeName}`;
    const dir = path.join(process.cwd(), UPLOAD_DIR);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // URL is relative to app origin so it works in dev and production
    const url = `/uploads/action-items/${fileName}`;
    return NextResponse.json({ url, name: file.name });
  } catch (err) {
    console.error('Attachment upload error:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
