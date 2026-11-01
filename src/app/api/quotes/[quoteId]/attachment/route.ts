import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { validateSessionFromCookie, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const { quoteId } = await params;
    const db = await getDb();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionFromCookie(db, token);

    const quoteRows = await db.query<any>(
      'SELECT id, quote_number, user_id, client_email, file_name, file_size_bytes, file_checksum_sha256, file_private_path FROM custom_quotes WHERE id = $1 LIMIT 1',
      [quoteId]
    );

    if (quoteRows.length === 0) {
      return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
    }

    const quote = quoteRows[0];

    // Check authorization: Must be Admin, Operator specifically handling the quote, or verified Owner
    if (!session) {
      return NextResponse.json({ error: 'Acesso não autenticado.' }, { status: 401 });
    }

    // Commercial partners never inherit permissions to view custom client quotes
    if (session.role === 'partner') {
      return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    }

    const isAdmin = session.role === 'admin';
    const isOperator = session.role === 'operator';
    const isOwner = session.userId === quote.user_id || session.email === quote.client_email;

    if (!isAdmin && !isOperator && !isOwner) {
      // 404 to avoid leaking existence of 3rd-party quotes
      return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    }

    // Security Check: If file is in quarantine and marked 'rejected' or 'pending', BLOCK download!
    const isRejected = quote.status === 'rejected' || (quote.file_private_path && quote.file_private_path.includes('rejected'));
    const isPending = quote.file_private_path && quote.file_private_path.includes('pending');

    if (isRejected) {
      return NextResponse.json(
        { error: 'Este arquivo foi reprovado na inspeção de quarentena de segurança e não pode ser transferido.' },
        { status: 403 }
      );
    }

    if (isPending) {
      return NextResponse.json(
        { error: 'Este anexo está em análise de quarentena e ainda não foi liberado para download.' },
        { status: 423 } // Locked
      );
    }

    if (!quote.file_name) {
      return NextResponse.json({ error: 'Este orçamento não possui arquivo anexo.' }, { status: 404 });
    }

    // Return authenticated file metadata & authorized stream representation
    return NextResponse.json({
      authorized: true,
      quoteNumber: quote.quote_number,
      fileName: quote.file_name,
      fileSizeBytes: quote.file_size_bytes,
      checksumSha256: quote.file_checksum_sha256,
      storagePath: quote.file_private_path,
      message: 'Acesso autorizado ao arquivo 3D sob custódia segura da RBS.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao processar download do anexo.' },
      { status: 500 }
    );
  }
}
