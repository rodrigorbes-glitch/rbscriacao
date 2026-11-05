import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDb } from '@/db';
import { validateSessionFromCookie, SESSION_COOKIE_NAME } from '@/lib/auth';
import { savePersistentUpload } from '@/lib/persistent-state';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const MAX_IMAGE_SIZE = 12 * 1024 * 1024; // 12MB

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
    let buffer: Buffer;
    let originalName = 'upload.png';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
      }
      originalName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      const body = await req.json();
      if (!body.fileBase64) {
        return NextResponse.json({ error: 'Dados da imagem não fornecidos.' }, { status: 400 });
      }
      buffer = Buffer.from(body.fileBase64, 'base64');
      if (body.fileName) originalName = body.fileName;
    }

    if (buffer.length > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Arquivo excede o tamanho máximo de 12MB.' }, { status: 400 });
    }

    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'Formato inválido. Use imagens PNG, JPG, JPEG ou WebP.' },
        { status: 400 }
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

    const publicUrl = `/products/uploads/${finalFileName}`;
    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: finalFileName,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha no upload da foto.' },
      { status: 500 }
    );
  }
}
