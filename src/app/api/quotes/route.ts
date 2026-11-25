import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/db';
import { validateSessionFromCookie, SESSION_COOKIE_NAME } from '@/lib/auth';
import {
  validateAndQuarantineFile,
  sanitizePlainText,
  MAX_FILE_SIZE_BYTES,
  MAX_BATCH_SIZE_BYTES,
} from '@/lib/upload-security';
import { getClientIpSafely, checkRateLimit } from '@/lib/rate-limit';

// GET: Strictly protected. Only Admin and verified owners can list quotes.
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionFromCookie(db, token);

    if (!session) {
      return NextResponse.json(
        { error: 'Autenticação necessária para consultar orçamentos.' },
        { status: 401 }
      );
    }

    if (session.role === 'admin' || session.role === 'operator') {
      const quotes = await db.query('SELECT * FROM custom_quotes ORDER BY created_at DESC');
      const revisions = await db.query('SELECT * FROM custom_quote_revisions ORDER BY created_at ASC');
      return NextResponse.json({ quotes, revisions });
    }

    if (session.role === 'customer') {
      // Must match user_id OR email, but only for authenticated and active session
      const quotes = await db.query(
        'SELECT * FROM custom_quotes WHERE user_id = $1 OR client_email = $2 ORDER BY created_at DESC',
        [session.userId, session.email]
      );
      const quoteIds = quotes.map((q: any) => q.id);
      let revisions: any[] = [];
      if (quoteIds.length > 0) {
        revisions = await db.query(
          `SELECT * FROM custom_quote_revisions WHERE quote_id = ANY($1) ORDER BY created_at ASC`,
          [quoteIds]
        );
      }
      return NextResponse.json({ quotes, revisions });
    }

    return NextResponse.json({ error: 'Acesso não autorizado a este recurso.' }, { status: 403 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao listar orçamentos.' },
      { status: 500 }
    );
  }
}

// POST: Public submission with deep file quarantine inspection and rate-limiting
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIpSafely(req);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Limite de solicitações excedido. Aguarde 1 minuto antes de enviar novamente.' },
        { status: 429 }
      );
    }

    const db = await getDb();
    const body = await req.json();

    const clientName = sanitizePlainText(body.clientName, 120);
    const clientEmail = String(body.clientEmail || '').trim().toLowerCase();
    const clientPhone = sanitizePlainText(body.clientPhone, 40);
    const projectTitle = sanitizePlainText(body.projectTitle, 180);
    const description = sanitizePlainText(body.description, 2000);

    if (!clientName || !clientEmail || !projectTitle) {
      return NextResponse.json(
        { error: 'Nome, e-mail e título do projeto são obrigatórios.' },
        { status: 400 }
      );
    }

    // Optional file attachment handling with quarantine
    let fileMeta: {
      fileName: string | null;
      fileSizeBytes: number | null;
      checksum: string | null;
      privatePath: string | null;
      quarantineStatus: string;
    } = {
      fileName: null,
      fileSizeBytes: null,
      checksum: null,
      privatePath: null,
      quarantineStatus: 'none',
    };

    if (body.fileBase64 && body.fileName) {
      const fileBuffer = Buffer.from(body.fileBase64, 'base64');
      const inspect = validateAndQuarantineFile(fileBuffer, body.fileName, Boolean(body.simulateInspectionOutage));

      if (!inspect.valid) {
        return NextResponse.json(
          { error: inspect.error || 'Arquivo recusado na inspeção de quarentena.' },
          { status: 400 }
        );
      }

      fileMeta = {
        fileName: inspect.sanitizedOriginalName,
        fileSizeBytes: inspect.sizeBytes,
        checksum: inspect.sha256,
        privatePath: `/private-storage/quarantine/${inspect.quarantineStatus}/${inspect.storageFileName}`,
        quarantineStatus: inspect.quarantineStatus,
      };
    } else if (body.fileName && process.env.NODE_ENV !== 'production') {
      // Fallback apenas para testes automatizados locais sem base64
      fileMeta = {
        fileName: sanitizePlainText(body.fileName, 80),
        fileSizeBytes: body.fileSizeBytes ? Math.min(Number(body.fileSizeBytes), MAX_FILE_SIZE_BYTES) : null,
        checksum: crypto.createHash('sha256').update(`${body.fileName}:${clientEmail}`).digest('hex'),
        privatePath: `/private-storage/quarantine/pending/mock-${Date.now()}-${sanitizePlainText(body.fileName, 40)}`,
        quarantineStatus: 'pending',
      };
    }

    // Bind authenticated user if session exists
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionFromCookie(db, token);
    const userId = session?.userId || null;

    const quoteId = `quo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const quoteNumber = `ORC-2026-${Math.floor(2000 + Math.random() * 7999)}`;

    await db.query(
      `INSERT INTO custom_quotes (
        id, quote_number, user_id, client_name, client_email, client_phone, company_name,
        project_title, description, intended_use, preferred_material, preferred_color,
        dimensions_description, quantity, deadline_desired, file_name, file_size_bytes,
        file_checksum_sha256, file_private_path, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'submitted')`,
      [
        quoteId,
        quoteNumber,
        userId,
        clientName,
        clientEmail,
        clientPhone,
        sanitizePlainText(body.companyName, 120),
        projectTitle,
        description,
        sanitizePlainText(body.intendedUse, 60) || 'decorativo',
        sanitizePlainText(body.preferredMaterial, 40) || 'PLA',
        sanitizePlainText(body.preferredColor, 40) || 'Preto Fosco',
        sanitizePlainText(body.dimensionsDescription, 120),
        Math.max(1, Number(body.quantity || 1)),
        sanitizePlainText(body.deadlineDesired, 60),
        fileMeta.fileName,
        fileMeta.fileSizeBytes,
        fileMeta.checksum,
        fileMeta.privatePath,
      ]
    );

    await db.query(
      `INSERT INTO custom_quote_revisions (
        id, quote_id, revision_number, author_role, author_name, message
      ) VALUES ($1,$2,1,'client',$3,$4)`,
      [
        `qrev-${Date.now()}`,
        quoteId,
        clientName,
        `Solicitação inicial enviada (${sanitizePlainText(body.preferredMaterial, 40) || 'PLA'} • ${body.quantity || 1} un). ${description}`,
      ]
    );

    return NextResponse.json({
      success: true,
      quoteId,
      quoteNumber,
      checksum: fileMeta.checksum,
      quarantineStatus: fileMeta.quarantineStatus,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao enviar solicitação de orçamento.' },
      { status: 400 }
    );
  }
}

// PATCH: Restricted update of quotes. Only Admin can propose price/days.
export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionFromCookie(db, token);

    if (!session) {
      return NextResponse.json(
        { error: 'Autenticação necessária para atualizar orçamentos.' },
        { status: 401 }
      );
    }

    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas a equipe técnica da RBS pode atualizar preços e prazos de orçamentos.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    await db.query(
      `UPDATE custom_quotes
       SET status = COALESCE($1, status),
           quoted_price_cents = COALESCE($2, quoted_price_cents),
           quoted_manufacturing_days = COALESCE($3, quoted_manufacturing_days),
           admin_internal_notes = COALESCE($4, admin_internal_notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        body.status || null,
        body.quotedPriceCents !== undefined ? Number(body.quotedPriceCents) : null,
        body.quotedManufacturingDays !== undefined ? Number(body.quotedManufacturingDays) : null,
        sanitizePlainText(body.adminInternalNotes, 1000),
        body.quoteId,
      ]
    );

    if (body.message) {
      await db.query(
        `INSERT INTO custom_quote_revisions (
          id, quote_id, revision_number, author_role, author_name, message, proposed_price_cents, proposed_days
        ) VALUES ($1,$2,2,$3,$4,$5,$6,$7)`,
        [
          `qrev-${Date.now()}`,
          body.quoteId,
          'admin',
          session.name,
          sanitizePlainText(body.message, 1000),
          body.quotedPriceCents !== undefined ? Number(body.quotedPriceCents) : null,
          body.quotedManufacturingDays !== undefined ? Number(body.quotedManufacturingDays) : null,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao atualizar orçamento.' },
      { status: 400 }
    );
  }
}
