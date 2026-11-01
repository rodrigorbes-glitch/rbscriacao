import test from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '../db';
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  createSessionInDb,
  validateSessionFromCookie,
} from '../lib/auth';

test('1. Senhas com scrypt: deve gerar hash seguro e verificar corretamente', () => {
  const rawPass = 'MinhaSenhaSegura@2026';
  const hash = hashPassword(rawPass);

  assert.ok(hash.startsWith('scrypt:v2:'), 'Hash deve usar scrypt:v2 (OWASP N=65536)');
  assert.equal(verifyPassword(rawPass, hash), true, 'Senha correta deve validar');
  assert.equal(verifyPassword('SenhaIncorreta', hash), false, 'Senha incorreta deve falhar');
});

test('2. Assinatura de Sessão HMAC-SHA256: deve rejeitar token adulterado ou expirado', () => {
  const payload = {
    userId: 'usr-test-1',
    name: 'Tester',
    email: 'test@rbscriacao.com',
    role: 'customer' as const,
    partnerId: null,
    partnerCode: null,
    sessionId: 'sess-test-1',
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };

  const token = signSessionToken(payload);
  const verified = verifySessionToken(token);
  assert.ok(verified, 'Token válido deve ser decodificado');
  assert.equal(verified?.userId, 'usr-test-1');

  // Tampering test
  const [data, sig] = token.split('.');
  const tamperedData = Buffer.from(JSON.stringify({ ...payload, role: 'admin' })).toString('base64url');
  const tamperedToken = `${tamperedData}.${sig}`;
  const tamperedVerified = verifySessionToken(tamperedToken);
  assert.equal(tamperedVerified, null, 'Token com payload adulterado deve ser rejeitado');

  // Expired test
  const expiredPayload = { ...payload, expiresAt: Date.now() - 1000 };
  const expiredToken = signSessionToken(expiredPayload);
  const expiredVerified = verifySessionToken(expiredToken);
  assert.equal(expiredVerified, null, 'Token expirado deve ser rejeitado');
});

test('3. Sessão no Banco de Dados: deve vincular parceiro e invalidar após revogação', async () => {
  const db = await getDb();
  const pUser = {
    id: `usr-partner-test-${Date.now()}`,
    name: 'Camila Design',
    email: `camila-${Date.now()}@design.com`,
    role: 'partner',
  };

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)`,
    [pUser.id, pUser.name, pUser.email, hashPassword('Parceiro@2026'), 'partner']
  );

  const prtId = `prt-camila-${Date.now()}`;
  await db.query(
    `INSERT INTO partners (id, user_id, partner_code, name, document_cpf_cnpj, email, phone, city, state, coupon_code)
     VALUES ($1, $2, $3, 'Camila Studio', '00000', $4, '9999', 'RJ', 'RJ', $3)`,
    [prtId, pUser.id, `CAMILA${Date.now().toString().slice(-4)}`, pUser.email]
  );

  const { token, payload } = await createSessionInDb(db, pUser);
  assert.equal(payload.partnerId, prtId, 'Sessão do parceiro deve conter seu partnerId do banco');

  const validSession = await validateSessionFromCookie(db, token);
  assert.ok(validSession, 'Sessão criada deve ser válida');
  assert.equal(validSession?.partnerId, prtId);

  // Revocation test (simulate logout or ban)
  await db.query('DELETE FROM sessions WHERE id = $1', [payload.sessionId]);
  const revokedSession = await validateSessionFromCookie(db, token);
  assert.equal(revokedSession, null, 'Sessão excluída do banco deve ser imediatamente invalidada');
});
