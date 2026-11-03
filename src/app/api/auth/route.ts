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

    // 4. Admin Set/Reset User Password
    if (body.action === 'admin_set_password') {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      const session = await validateSessionFromCookie(db, token);
      if (!session || session.role !== 'admin') {
        return NextResponse.json(
          { error: 'Apenas administradores podem redefinir senhas de outros usuários.' },
          { status: 403 }
        );
      }

      const targetUserId = String(body.targetUserId || '').trim();
      const newPassword = String(body.newPassword || '');

      if (!targetUserId || !newPassword || newPassword.length < 8) {
        return NextResponse.json(
          { error: 'ID do usuário e nova senha (mínimo de 8 caracteres) são obrigatórios.' },
          { status: 400 }
        );
      }

      const target = await db.query<{ id: string; name: string; email: string }>(
        'SELECT id, name, email FROM users WHERE id = $1 LIMIT 1',
        [targetUserId]
      );
      if (target.length === 0) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      }

      const newHash = hashPassword(newPassword);
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newHash, targetUserId]
      );

      // Revoke any existing active sessions for this user so they must log in with the new password
      await db.query('DELETE FROM sessions WHERE user_id = $1', [targetUserId]);

      // Audit log
      await db.query(
        `INSERT INTO audit_logs (id, actor_user_id, actor_name, actor_role, action, entity_type, entity_id, after_json)
         VALUES ($1, $2, $3, $4, 'admin_reset_password', 'users', $5, $6)`,
        [
          `aud-${Date.now()}`,
          session.userId,
          session.name,
          session.role,
          targetUserId,
          JSON.stringify({ targetEmail: target[0].email, targetName: target[0].name })
        ]
      );

      return NextResponse.json({
        success: true,
        message: `Senha de ${target[0].name} redefinida com sucesso!`,
      });
    }

    // 5. Admin Create Team/Access User
    if (body.action === 'admin_create_user') {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      const session = await validateSessionFromCookie(db, token);
      if (!session || session.role !== 'admin') {
        return NextResponse.json(
          { error: 'Apenas administradores podem cadastrar novos acessos.' },
          { status: 403 }
        );
      }

      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const role = String(body.role || 'operator').trim();
      const password = String(body.password || '');
      const phone = body.phone ? String(body.phone).trim() : null;

      if (!name || !email || !password || password.length < 8) {
        return NextResponse.json(
          { error: 'Nome, e-mail e senha inicial (mínimo de 8 caracteres) são obrigatórios.' },
          { status: 400 }
        );
      }

      if (!['admin', 'operator', 'partner', 'customer'].includes(role)) {
        return NextResponse.json(
          { error: 'Perfil de acesso inválido.' },
          { status: 400 }
        );
      }

      const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Este e-mail já está cadastrado no sistema.' },
          { status: 400 }
        );
      }

      const newUserId = `usr-${Date.now()}`;
      const passwordHashed = hashPassword(password);
      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, phone, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)`,
        [newUserId, name, email, passwordHashed, role, phone]
      );

      // Audit log
      await db.query(
        `INSERT INTO audit_logs (id, actor_user_id, actor_name, actor_role, action, entity_type, entity_id, after_json)
         VALUES ($1, $2, $3, $4, 'admin_create_user', 'users', $5, $6)`,
        [
          `aud-${Date.now()}`,
          session.userId,
          session.name,
          session.role,
          newUserId,
          JSON.stringify({ name, email, role })
        ]
      );

      return NextResponse.json({
        success: true,
        message: `Usuário ${name} criado com sucesso!`,
        user: { id: newUserId, name, email, role, phone, is_active: true }
      });
    }

    // 6. Admin Delete User
    if (body.action === 'admin_delete_user') {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      const session = await validateSessionFromCookie(db, token);
      if (!session || session.role !== 'admin') {
        return NextResponse.json(
          { error: 'Apenas administradores podem excluir usuários.' },
          { status: 403 }
        );
      }

      const targetUserId = String(body.targetUserId || '').trim();
      if (!targetUserId) {
        return NextResponse.json({ error: 'ID do usuário não informado.' }, { status: 400 });
      }

      if (targetUserId === session.userId) {
        return NextResponse.json(
          { error: 'Você não pode excluir sua própria conta conectada.' },
          { status: 400 }
        );
      }

      const target = await db.query<{ id: string; name: string; email: string; role: string }>(
        'SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1',
        [targetUserId]
      );
      if (target.length === 0) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      }

      // If target is admin, make sure there is at least one other active admin
      if (target[0].role === 'admin') {
        const adminCount = await db.query<{ count: string | number }>(
          "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = TRUE AND id != $1",
          [targetUserId]
        );
        if (Number(adminCount[0]?.count || 0) < 1) {
          return NextResponse.json(
            { error: 'Não é possível excluir o último administrador do sistema.' },
            { status: 400 }
          );
        }
      }

      // Revoke sessions
      await db.query('DELETE FROM sessions WHERE user_id = $1', [targetUserId]);

      // Delete user
      await db.query('DELETE FROM users WHERE id = $1', [targetUserId]);

      // Audit log
      await db.query(
        `INSERT INTO audit_logs (id, actor_user_id, actor_name, actor_role, action, entity_type, entity_id, before_json)
         VALUES ($1, $2, $3, $4, 'admin_delete_user', 'users', $5, $6)`,
        [
          `aud-${Date.now()}`,
          session.userId,
          session.name,
          session.role,
          targetUserId,
          JSON.stringify({ name: target[0].name, email: target[0].email, role: target[0].role })
        ]
      );

      return NextResponse.json({
        success: true,
        message: `Usuário ${target[0].name} (${target[0].email}) foi excluído com sucesso.`
      });
    }

    // 7. Login Action (Standard / Admin / Partner)
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
