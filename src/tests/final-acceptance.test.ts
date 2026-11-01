import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { getDb } from '../db';
import {
  validateAndQuarantineFile,
  sanitizePlainText,
  MAX_FILE_SIZE_BYTES,
  MAX_UNCOMPRESSED_SIZE_BYTES,
  MAX_ARCHIVE_ENTRIES,
} from '../lib/upload-security';
import {
  hashPassword,
  verifyPassword,
  createSessionInDb,
  signSessionToken,
  sanitizeRedirectPath,
  SESSION_COOKIE_NAME,
} from '../lib/auth';
import { NextRequest } from 'next/server';
import { POST as quotesPost, checkRateLimit, resetRateLimitsForTesting } from '../app/api/quotes/route';
import { GET as quoteAttachmentGet } from '../app/api/quotes/[quoteId]/attachment/route';

test('1. Upload e Quarentena: Aceitação e Rejeição de Formatos', () => {
  // 1.1 Válido: STL ASCII
  const validStlAscii = Buffer.from('solid RBS_TEST\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid RBS_TEST');
  const resValidStl = validateAndQuarantineFile(validStlAscii, "peca_d'avila.stl");
  assert.equal(resValidStl.valid, true, 'STL ASCII válido deve ser aprovado');
  assert.equal(resValidStl.quarantineStatus, 'approved');
  assert.equal(resValidStl.extension, '.stl');

  // 1.2 Spoofing: Executável (MZ header) renomeado como .stl
  const fakeStl = Buffer.alloc(100);
  fakeStl[0] = 0x4D; // M
  fakeStl[1] = 0x5A; // Z
  const resFakeStl = validateAndQuarantineFile(fakeStl, 'virus_trojan.stl');
  assert.equal(resFakeStl.valid, false, 'EXE disfarçado de STL deve ser rejeitado');
  assert.equal(resFakeStl.quarantineStatus, 'rejected');

  // 1.3 Arquivo Excedendo Tamanho Máximo (>25MB)
  const hugeBuf = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
  const resHuge = validateAndQuarantineFile(hugeBuf, 'huge_file.stl');
  assert.equal(resHuge.valid, false, 'Arquivo >25MB deve ser rejeitado');
  assert.ok(resHuge.error?.includes('25 MB'));

  // 1.4 Zip-bomb simulado (mais de 50 entradas)
  const zipBomberHeaders = [];
  for (let i = 0; i < 55; i++) {
    const entryHdr = Buffer.alloc(30 + 10);
    entryHdr.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    entryHdr.writeUInt16LE(10, 26); // filename length = 10
    entryHdr.write(`file_${i.toString().padStart(5, '0')}`, 30);
    zipBomberHeaders.push(entryHdr);
  }
  const zipBombBuf = Buffer.concat(zipBomberHeaders);
  const resBomb = validateAndQuarantineFile(zipBombBuf, 'attack.zip');
  assert.equal(resBomb.valid, false, 'Zip com excesso de arquivos deve ser rejeitado');
  assert.ok(resBomb.error?.includes('excede o limite de 50') || resBomb.rejectionReason?.includes('excede o limite'));

  // 1.5 Zip Directory Traversal (../escape.stl)
  const traversalHdr = Buffer.alloc(30 + 14);
  traversalHdr.writeUInt32LE(0x04034b50, 0);
  traversalHdr.writeUInt16LE(14, 26);
  traversalHdr.write('../badfile.stl', 30);
  const resTraversal = validateAndQuarantineFile(traversalHdr, 'traversal.zip');
  assert.equal(resTraversal.valid, false, 'Zip com directory traversal deve ser rejeitado');
  assert.ok(resTraversal.error?.includes('proibidos') || resTraversal.error?.includes('travessia'));
});

test('2. Sanitização de Texto: Preservação de Nomes Próprios, Aspas e Medidas', () => {
  const input = "Peça personalizada para D’Ávila & Cia: dimensão 10\" x 15 cm, rosca 1/4', acabamento <script>alert('xss')</script> impecável.";
  const sanitized = sanitizePlainText(input);

  // Deve preservar o nome com apóstrofo tipográfico ou simples
  assert.ok(sanitized.includes("D’Ávila"), "Deve preservar D’Ávila");
  // Deve preservar medidas em polegadas 10" e 1/4'
  assert.ok(sanitized.includes('10"'), 'Deve preservar 10"');
  assert.ok(sanitized.includes("1/4'"), "Deve preservar 1/4'");
  // Deve remover estritamente tags de script
  assert.ok(!sanitized.includes('<script>'), 'Tags script devem ser eliminadas');
  assert.ok(!sanitized.includes('alert'), 'Conteúdo do script malicioso deve ser purgado');
});

test('3. Rate Limit Estrito: 5 requisições por minuto por IP, 6ª retorna 429', () => {
  resetRateLimitsForTesting();
  const testIp = '187.45.10.22';

  for (let i = 1; i <= 5; i++) {
    const allowed = checkRateLimit(testIp);
    assert.equal(allowed, true, `Requisição ${i} dentro do limite deve ser permitida`);
  }

  const blocked = checkRateLimit(testIp);
  assert.equal(blocked, false, '6ª requisição no mesmo minuto deve ser bloqueada (429)');
});

test('4. Open Redirect: Apenas rotas internas relativas autorizadas', () => {
  assert.equal(sanitizeRedirectPath('/admin'), '/admin');
  assert.equal(sanitizeRedirectPath('/parceiros/portal'), '/parceiros/portal');
  assert.equal(sanitizeRedirectPath('/minha-conta'), '/minha-conta');

  // Tentativas maliciosas sanitizadas para rota base segura '/'
  assert.equal(sanitizeRedirectPath('https://malicious-phishing.com'), '/');
  assert.equal(sanitizeRedirectPath('//attacker.site/steal'), '/');
  assert.equal(sanitizeRedirectPath('javascript:alert(1)'), '/');
  assert.equal(sanitizeRedirectPath(null), '/');
});

test('5. Custódia Segura e Isolamento de Download de Anexos', async () => {
  const db = await getDb();

  // Cria cliente A e cliente B
  const clientA = { id: `usr-a-${Date.now()}`, name: 'Cliente A', email: `clienta-${Date.now()}@rbs.com`, role: 'customer' };
  const clientB = { id: `usr-b-${Date.now()}`, name: 'Cliente B', email: `clientb-${Date.now()}@rbs.com`, role: 'customer' };
  const partnerUser = { id: `usr-p-${Date.now()}`, name: 'Parceiro X', email: `partner-${Date.now()}@rbs.com`, role: 'partner' };

  await db.query(`INSERT INTO users (id, name, email, password_hash, role) VALUES ($1,$2,$3,'scrypt:dummy','customer')`, [clientA.id, clientA.name, clientA.email]);
  await db.query(`INSERT INTO users (id, name, email, password_hash, role) VALUES ($1,$2,$3,'scrypt:dummy','customer')`, [clientB.id, clientB.name, clientB.email]);
  await db.query(`INSERT INTO users (id, name, email, password_hash, role) VALUES ($1,$2,$3,'scrypt:dummy','partner')`, [partnerUser.id, partnerUser.name, partnerUser.email]);

  // Cria sessões
  const sessionA = await createSessionInDb(db, clientA);
  const sessionB = await createSessionInDb(db, clientB);
  const sessionP = await createSessionInDb(db, partnerUser);

  // Orçamento 1: do Cliente A, com arquivo aprovado
  const quoteId1 = `quo-test-1-${Date.now()}`;
  const quoteNum1 = `ORC-TEST-${Date.now()}-1`;
  await db.query(
    `INSERT INTO custom_quotes (
      id, quote_number, user_id, client_name, client_email, client_phone, project_title,
      description, file_name, file_size_bytes, file_checksum_sha256, file_private_path, status
    ) VALUES ($1, $2, $3, $4, $5, '1199999999', 'Projeto Segredo A',
      'Descrição A', 'peca_a.stl', 1234, 'sha256-abc', '/private-storage/quarantine/approved/peca_a.stl', 'submitted')`,
    [quoteId1, quoteNum1, clientA.id, clientA.name, clientA.email]
  );

  // Orçamento 2: do Cliente A, mas com anexo em quarentena (pending)
  const quoteIdPending = `quo-test-pending-${Date.now()}`;
  const quoteNumPending = `ORC-TEST-${Date.now()}-2`;
  await db.query(
    `INSERT INTO custom_quotes (
      id, quote_number, user_id, client_name, client_email, client_phone, project_title,
      description, file_name, file_size_bytes, file_checksum_sha256, file_private_path, status
    ) VALUES ($1, $2, $3, $4, $5, '1199999999', 'Projeto em Análise',
      'Descrição Pendente', 'peca_pend.stl', 1234, 'sha256-pend', '/private-storage/quarantine/pending/peca_pend.stl', 'submitted')`,
    [quoteIdPending, quoteNumPending, clientA.id, clientA.name, clientA.email]
  );

  // 5.1 Cliente A baixa o próprio anexo aprovado -> DEVE SER AUTORIZADO (200)
  const reqA = new NextRequest(`http://localhost:3000/api/quotes/${quoteId1}/attachment`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionA.token}` },
  });
  const resA = await quoteAttachmentGet(reqA, { params: Promise.resolve({ quoteId: quoteId1 }) });
  assert.equal(resA.status, 200, 'Dono do orçamento deve poder acessar seu arquivo aprovado');
  const bodyA = await resA.json();
  assert.equal(bodyA.authorized, true);

  // 5.2 Cliente B tenta baixar anexo do Cliente A -> DEVE RETORNAR 404 (sem vazar existência)
  const reqB = new NextRequest(`http://localhost:3000/api/quotes/${quoteId1}/attachment`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionB.token}` },
  });
  const resB = await quoteAttachmentGet(reqB, { params: Promise.resolve({ quoteId: quoteId1 }) });
  assert.equal(resB.status, 404, 'Cliente terceiro deve receber 404 sem permissão');

  // 5.3 Parceiro tenta baixar anexo de cliente -> DEVE RETORNAR 404
  const reqP = new NextRequest(`http://localhost:3000/api/quotes/${quoteId1}/attachment`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionP.token}` },
  });
  const resP = await quoteAttachmentGet(reqP, { params: Promise.resolve({ quoteId: quoteId1 }) });
  assert.equal(resP.status, 404, 'Parceiro comercial não pode acessar anexo de cliente');

  // 5.4 Arquivo em Quarentena 'pending' -> DEVE RETORNAR 423 (Locked)
  const reqPending = new NextRequest(`http://localhost:3000/api/quotes/${quoteIdPending}/attachment`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionA.token}` },
  });
  const resPending = await quoteAttachmentGet(reqPending, { params: Promise.resolve({ quoteId: quoteIdPending }) });
  assert.equal(resPending.status, 423, 'Arquivo em quarentena deve retornar 423 Bloqueado para download');
  const bodyPending = await resPending.json();
  assert.ok(bodyPending.error.includes('em análise de quarentena'));
});

test('6. Concorrência Crítica na Última Unidade em Consignação', async () => {
  const db = await getDb();

  // Insere um item consignado para a remessa existente csg-001 com saldo de apenas 1 unidade
  const cItemId = `csgi-lock-${Date.now()}`;
  await db.query(
    `INSERT INTO consignment_items (
      id, shipment_id, product_id, variation_id, dispatched_qty, sold_qty, returned_qty, damaged_qty,
      agreed_unit_price_cents, partner_commission_pct
    ) VALUES ($1, 'csg-001', 'prod-vaso-voronoi', 'var-voronoi-terracota', 1, 0, 0, 0, 14900, 20.00)`,
    [cItemId]
  );

  // Executa duas tentativas simultâneas de registrar a venda de 1 unidade utilizando o lock atômico
  const updateSql = `UPDATE consignment_items
     SET sold_qty = sold_qty + 1
     WHERE id = $1 AND (dispatched_qty - sold_qty - returned_qty - COALESCE(damaged_qty, 0)) >= 1
     RETURNING id`;

  const [res1, res2] = await Promise.all([
    db.query(updateSql, [cItemId]),
    db.query(updateSql, [cItemId]),
  ]);

  // Exatamente uma das tentativas deve retornar o id afetado; a outra retorna 0 linhas
  const successCount = (res1.length > 0 ? 1 : 0) + (res2.length > 0 ? 1 : 0);
  assert.equal(successCount, 1, 'Exatamente uma venda deve ter sucesso na disputa concorrente da última unidade');

  // Verifica que o saldo final é exatamente 0 unidades disponíveis e 1 vendida
  const finalRows = await db.query<any>('SELECT dispatched_qty, sold_qty FROM consignment_items WHERE id = $1', [cItemId]);
  assert.equal(finalRows[0].dispatched_qty, 1);
  assert.equal(finalRows[0].sold_qty, 1);
});
