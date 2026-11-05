import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import path from 'path';
import crypto from 'crypto';
import { getDb } from '@/db';
import { validateSessionFromCookie, SESSION_COOKIE_NAME } from '@/lib/auth';
import { savePersistentUpload } from '@/lib/persistent-state';

const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.gif',
  '.mp4',
  '.webm',
  '.mov',
]);

const MAX_FILE_SIZE = 35 * 1024 * 1024; // 35MB para permitir fotos em alta resolução, GIFs animados e vídeos curtos

function processFileBuffer(originalName: string, buffer: Buffer): { url: string; fileName: string } {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`Arquivo "${originalName}" excede o tamanho máximo de 35MB.`);
  }

  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Formato "${ext}" não suportado para "${originalName}". Formatos aceitos: PNG, JPG, WebP, GIF, SVG, MP4 ou WebM.`
    );
  }

  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const safeBaseName = path
    .basename(originalName, ext)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '-')
    .slice(0, 30);
  const finalFileName = `${safeBaseName}-${Date.now()}-${randomSuffix}${ext}`;

  savePersistentUpload(finalFileName, buffer);
  return {
    url: `/products/uploads/${finalFileName}`,
    fileName: finalFileName,
  };
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const cookieStore = await cookies();
    const token =
      req.cookies.get(SESSION_COOKIE_NAME)?.value ||
      cookieStore.get(SESSION_COOKIE_NAME)?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const session = await validateSessionFromCookie(db, token);
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    const uploadedUrls: string[] = [];
    const uploadedFiles: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      // Handle both multiple files ("files") and single file ("file")
      const filesFromForm = [
        ...formData.getAll('files'),
        ...formData.getAll('file'),
      ].filter((f): f is File => f instanceof File && f.size > 0);

      if (filesFromForm.length === 0) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
      }

      for (const file of filesFromForm) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const saved = processFileBuffer(file.name, buffer);
        uploadedUrls.push(saved.url);
        uploadedFiles.push(saved.fileName);
      }
    } else {
      const body = await req.json();
      if (!body.fileBase64) {
        return NextResponse.json({ error: 'Dados da imagem não fornecidos.' }, { status: 400 });
      }
      const buffer = Buffer.from(body.fileBase64, 'base64');
      const originalName = body.fileName || 'upload.png';
      const saved = processFileBuffer(originalName, buffer);
      uploadedUrls.push(saved.url);
      uploadedFiles.push(saved.fileName);
    }

    return NextResponse.json({
      success: true,
      url: uploadedUrls[0],
      urls: uploadedUrls,
      fileNames: uploadedFiles,
      count: uploadedUrls.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha no upload do arquivo.' },
      { status: 400 }
    );
  }
}
