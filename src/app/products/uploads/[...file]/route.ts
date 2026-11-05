import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUploadsBackupDir } from '@/lib/persistent-state';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.ogg': 'video/ogg',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const fileSegments = resolvedParams.file || [];
    const filename = path.basename(fileSegments.join('/'));

    if (!filename || filename.includes('..')) {
      return new NextResponse('Arquivo inválido', { status: 400 });
    }

    // Try primary public directory first, then fallback to persistent backup directory
    const publicPath = path.join(process.cwd(), 'public', 'products', 'uploads', filename);
    const backupPath = path.join(getUploadsBackupDir(), filename);

    let targetPath = '';
    if (fs.existsSync(publicPath)) {
      targetPath = publicPath;
    } else if (fs.existsSync(backupPath)) {
      targetPath = backupPath;
    } else {
      return new NextResponse('Arquivo não encontrado', { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const buffer = fs.readFileSync(targetPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    return new NextResponse('Erro ao carregar mídia', { status: 500 });
  }
}
