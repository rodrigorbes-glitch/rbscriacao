import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import {
  hashPassword,
  verifyPassword,
  createSessionInDb,
  validateSessionFromCookie,
  revokeSessionInDb,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionFromCookie(db, token);

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
        partnerId: session.partnerId,
        partnerCode: session.partnerCode,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao consultar sessão.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();

    // 1. Logout Action
    if (body.action === 'logout') {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        const session = await validateSessionFromCookie(db, token);
        if (session) {
          await revokeSessionInDb(db, session.sessionId);
        }
      }
      const response = NextResponse.json({ success: true, message: 'Sessão encerrada com sucesso.' });
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: '',
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
      });
      return response;
    }

    // 2. Customer Registration Action
    if (body.action === 'register') {
      const email = String(body.email || '').trim().toLowerCase();
      const name = String(body.name || '').trim();
      const password = String(body.password || '');
      if (!email || !name || password.length < 8) {
        return NextResponse.json(
          { error: 'Preencha nome, e-mail válido e senha com no mínimo 8 caracteres.' },
          { status: 400 }
        );
      }

      const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Este e-mail já possui cadastro na RBS Criação.' },
          { status: 400 }
        );
      }

      const userId = `usr-${Date.now()}`;
      const passwordHashed = hashPassword(password);
      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, phone, document_cpf_cnpj, is_active, email_verified)
         VALUES ($1, $2, $3, $4, 'customer', $5, $6, TRUE, TRUE)`,
        [
          userId,
          name,
          email,
          passwordHashed,
          body.phone || null,
          body.documentCpfCnpj || null,
        ]
      );

      const user = { id: userId, name, email, role: 'customer' };
      const { token, payload } = await createSessionInDb(db, user);

      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 3600,
      });

      return response;
    }

    // 3. Change Password Action (Authenticated User)
    if (body.action === 'change_password') {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      const session = await validateSessionFromCookie(db, token);
      if (!session) {
        return NextResponse.json(
          { error: 'Você precisa estar autenticado para alterar sua senha.' },
          { status: 401 }
        );
      }

      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');

      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json(
          { error: 'A nova senha deve ter no mínimo 8 caracteres.' },
          { status: 400 }
        );
      }

      const rows = await db.query<{ id: string; password_hash: string }>(
        'SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1',
        [session.userId]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      }

      if (currentPassword) {
        const valid = verifyPassword(currentPassword, rows[0].password_hash);
        if (!valid) {
          return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 });
        }
      }

      const newHash = hashPassword(newPassword);
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newHash, session.userId]
      );

      return NextResponse.json({
        success: true,
        message: 'Senha alterada com sucesso!',
      });
    }

    // 4. Login Action (Standard / Admin / Partner)
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const rows = await db.query<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      role: string;
      phone: string | null;
      is_active: boolean;
    }>('SELECT id, name, email, password_hash, role, phone, is_active FROM users WHERE LOWER(email) = $1 LIMIT 1', [
      email,
    ]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'E-mail ou senha incorretos. Verifique suas credenciais.' },
        { status: 401 }
      );
    }

    const user = rows[0];
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Esta conta está suspensa ou inativa. Entre em contato com a RBS Criação.' },
        { status: 403 }
      );
    }

    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'E-mail ou senha incorretos. Verifique suas credenciais.' },
        { status: 401 }
      );
    }

    // Auto upgrade legacy hashes to scrypt on successful login
    if (user.password_hash.startsWith('rbs_hash:')) {
      const newHash = hashPassword(password);
      await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
        newHash,
        user.id,
      ]);
    }

    const { token, payload } = await createSessionInDb(db, user);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        partnerId: payload.partnerId,
        partnerCode: payload.partnerCode,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 3600,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro na autenticação.' },
      { status: 500 }
    );
  }
}
