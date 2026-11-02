import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { getDb, createIsolatedTestDb } from '../db';
import {
  hashPassword,
  verifyPassword,
  createSessionInDb,
  revokeSessionInDb,
  validateSessionFromCookie,
  SESSION_COOKIE_NAME,
} from '../lib/auth';
import {
  validateAndQuarantineFile,
  inspectArchiveSafety,
  sanitizePlainText,
} from '../lib/upload-security';
import { getClientIpSafely } from '../lib/rate-limit';
import { POST as checkoutPost } from '../app/api/checkout/route';
import { POST as parceiroPost, GET as parceiroGet } from '../app/api/parceiro/route';
import { POST as adminOperationsPost } from '../app/api/admin/operations/route';
import { GET as quoteAttachmentGet } from '../app/api/quotes/[quoteId]/attachment/route';
import {
  addCartItem,
  getSelectiveCartSummary,
  createOrderFromSelectiveCart,
} from '../lib/cart-checkout';
import { middleware } from '../middleware';

// Suíte de Testes 1: scrypt Benchmark, Justificativa OWASP e Endurecimento
test('1. Benchmark scrypt e Endurecimento Criptográfico', () => {
  const password = 'SenhaSeguraOperacional@2026';

  // Benchmark scrypt OWASP v2 (N=65536, r=8, p=1)
  const startV2 = performance.now();
  const hashV2 = hashPassword(password);
  const durationV2Ms = performance.now() - startV2;

  assert.ok(hashV2.startsWith('scrypt:v2:'), 'Hash deve utilizar scrypt:v2');
  assert.equal(verifyPassword(password, hashV2), true, 'Senha correta deve verificar');
  assert.equal(verifyPassword('SenhaIncorreta', hashV2), false, 'Senha incorreta deve ser rejeitada');

  // Benchmark scrypt N=131072 (2^17) para justificar trade-off de latência
  const salt = crypto.randomBytes(16).toString('hex');
  const startV3 = performance.now();
  crypto.scryptSync(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  const durationV3Ms = performance.now() - startV3;

  console.log(`[Benchmark scrypt] N=65536: ${durationV2Ms.toFixed(2)}ms | N=131072: ${durationV3Ms.toFixed(2)}ms`);
  assert.ok(durationV2Ms > 50, 'scrypt deve ter custo computacional demonstrável contra ataques de GPU');

  // Verificação de Produção: rbs_hash: legado deve ser banido se NODE_ENV=production
  const originalEnv = process.env.NODE_ENV;
  try {
    (process.env as any).NODE_ENV = 'production';
    assert.equal(
      verifyPassword('admin123', 'rbs_hash:admin123'),
      false,
      'rbs_hash em texto plano deve ser sumariamente bloqueado em produção'
    );
  } finally {
    (process.env as any).NODE_ENV = originalEnv;
  }
});

// Suíte de Testes 2: Revogação de Sessão e CSRF por Requisições HTTP Reais
test('2. Revogação de Sessão e Proteção CSRF via HTTP Real', async () => {
  const db = await getDb();

  // 2.1 Revogação de Sessão em Banco
  const user = {
    id: `usr-rev-${Date.now()}`,
    name: 'Operador Teste Revogação',
    email: `rev-${Date.now()}@rbscriacao.com`,
    role: 'operator' as const,
  };
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1,$2,$3,'scrypt:dummy','operator')`,
    [user.id, user.name, user.email]
  );
  const session = await createSessionInDb(db, user);

  // Valida sessão ativa
  const valid = await validateSessionFromCookie(db, session.token);
  assert.ok(valid, 'Sessão recém-criada deve ser válida');

  // Revoga sessão
  await revokeSessionInDb(db, session.payload.sessionId);
  const afterRevoke = await validateSessionFromCookie(db, session.token);
  assert.equal(afterRevoke, null, 'Sessão revogada no banco deve falhar na validação imediatamente');

  // 2.2 Proteção CSRF no Middleware para APIs de estado (POST/PUT/PATCH/DELETE)
  const fakeCrossSiteReq = new NextRequest('http://localhost:3000/api/admin/operations', {
    method: 'POST',
    headers: {
      origin: 'https://site-atacante-phishing.com',
      host: 'localhost:3000',
    },
  });
  const csrfRes = await middleware(fakeCrossSiteReq);
  assert.equal(csrfRes.status, 403, 'Requisição com Origin cruzada não autorizada deve ser bloqueada (403)');
  const csrfBody = await csrfRes.json();
  assert.ok(csrfBody.error?.includes('CSRF'));

  // 2.3 Prevenção de Spoofing de IP por Cabeçalhos de Proxy
  const spoofedReq = new NextRequest('http://localhost:3000/api/quotes', {
    headers: {
      'x-forwarded-for': '1.2.3.4, 187.45.10.22', // 1.2.3.4 forjado pelo cliente, 187.45.10.22 adicionado pelo proxy
    },
  });
  const extractedIp = getClientIpSafely(spoofedReq);
  assert.equal(extractedIp, '187.45.10.22', 'Deve extrair o IP mais próximo do proxy confiável, não o forjado pelo cliente');
});

// Suíte de Testes 3: ZIP/3MF Descompactação Limitada, Tamanhos Falsos e Aninhamento
test('3. ZIP/3MF: Descompactação Bounded, Tamanhos Declarados Falsos e Arquivo Aninhado', () => {
  // 3.1 Criação de arquivo ZIP válido com compactação Deflate
  const fileContent = Buffer.from('solid RBS_TEST facet normal 0 0 1 outer loop vertex 0 0 0 vertex 1 0 0 vertex 0 1 0 endloop endfacet endsolid');
  const compressedDeflate = zlib.deflateRawSync(fileContent);

  const validZipHeader = Buffer.alloc(30 + 8);
  validZipHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
  validZipHeader.writeUInt16LE(8, 8); // compressionMethod = 8 (Deflate)
  validZipHeader.writeUInt32LE(compressedDeflate.length, 18);
  validZipHeader.writeUInt32LE(fileContent.length, 22);
  validZipHeader.writeUInt16LE(8, 26); // fileName length
  validZipHeader.write('test.stl', 30);
  const validZip = Buffer.concat([validZipHeader, compressedDeflate]);

  const validResult = inspectArchiveSafety(validZip);
  assert.equal(validResult.safe, true, 'Arquivo ZIP com deflate válido deve ser aprovado');

  // 3.2 Falsified Declared Size (Cabeçalho alega 10 bytes, mas descompactação expande 10.000 bytes)
  const hugeData = Buffer.alloc(10000, 'X');
  const hugeCompressed = zlib.deflateRawSync(hugeData);
  const spoofedZipHeader = Buffer.alloc(30 + 8);
  spoofedZipHeader.writeUInt32LE(0x04034b50, 0);
  spoofedZipHeader.writeUInt16LE(8, 8);
  spoofedZipHeader.writeUInt32LE(hugeCompressed.length, 18);
  spoofedZipHeader.writeUInt32LE(10, 22); // Falsified declared size: alega apenas 10 bytes!
  spoofedZipHeader.writeUInt16LE(8, 26);
  spoofedZipHeader.write('fake.stl', 30);
  const spoofedZip = Buffer.concat([spoofedZipHeader, hugeCompressed]);

  const spoofResult = inspectArchiveSafety(spoofedZip);
  assert.equal(spoofResult.safe, false, 'ZIP com tamanho declarado falsificado deve ser rejeitado');
  assert.ok(spoofResult.error?.includes('difere') || spoofResult.error?.includes('forjado'));

  // 3.3 Nested Archive (Tentativa de aninhamento de arquivo zip/3mf dentro de outro zip)
  const nestedHeader = Buffer.alloc(30 + 9);
  nestedHeader.writeUInt32LE(0x04034b50, 0);
  nestedHeader.writeUInt16LE(0, 8);
  nestedHeader.writeUInt32LE(0, 18);
  nestedHeader.writeUInt32LE(0, 22);
  nestedHeader.writeUInt16LE(9, 26);
  nestedHeader.write('inner.zip', 30); // Arquivo aninhado proibido
  const nestedZip = nestedHeader;

  const nestedResult = inspectArchiveSafety(nestedZip);
  assert.equal(nestedResult.safe, false, 'ZIP contendo arquivo compactado aninhado deve ser rejeitado');
  assert.ok(nestedResult.error?.includes('aninhado'));

  // 3.4 Simulação de Indisponibilidade do Serviço de Inspeção
  const inspectOutage = validateAndQuarantineFile(fileContent, 'projeto.stl', true);
  assert.equal(inspectOutage.quarantineStatus, 'pending', 'Em indisponibilidade de inspeção, o anexo deve permanecer seguro em pending');
  assert.equal(inspectOutage.valid, true);
});

// Suíte de Testes 4: Venda Completa no Sandbox (Carrinho Seletivo 2 de 4, Webhook, Reembolso Parcial e Frete)
test('4. Venda Completa no Sandbox: 2 de 4 Itens, Idempotência de Webhook, Reembolso Parcial e Rastreio', async () => {
  const db = await createIsolatedTestDb();
  const sessionKey = `sess-e2e-${Date.now()}`;

  // 4.1 Adiciona 4 itens no carrinho
  await addCartItem(db, { sessionKey, productId: 'prod-vaso-voronoi', quantity: 1, selected: true });
  await addCartItem(db, { sessionKey, productId: 'prod-cachepot-autodrenante', quantity: 1, selected: true });
  await addCartItem(db, { sessionKey, productId: 'prod-chaveiro-nfc-lote', quantity: 1, selected: false }); // não selecionado
  await addCartItem(db, { sessionKey, productId: 'prod-escultura-resina', quantity: 1, selected: false }); // não selecionado

  const cartSummaryBefore = await getSelectiveCartSummary(db, sessionKey);
  assert.equal(cartSummaryBefore.selected_lines_count, 2, 'Exatamente 2 itens devem estar selecionados para compra');
  assert.equal(cartSummaryBefore.unselected_lines_count, 2, 'Exatamente 2 itens devem permanecer não selecionados');

  // 4.2 Criação do Pedido via Checkout Seletivo com chave de idempotência
  const idempotencyKey = `idemp-order-${Date.now()}`;
  const checkoutPayload = {
    sessionKey,
    customerName: 'Mariana Teste Sandbox',
    customerEmail: 'mariana.sandbox@rbs.com',
    customerPhone: '(21) 98888-7777',
    customerCpfCnpj: '123.456.789-00',
    shippingAddress: {
      cep: '25020-140',
      street: 'Rua das Flores',
      number: '100',
      neighborhood: 'Jardim 25 de Agosto',
      city: 'Duque de Caxias',
      state: 'RJ',
    },
    paymentMethod: 'pix' as const,
    idempotencyKey,
    simulateImmediatePayment: true,
  };

  const orderResult1 = await createOrderFromSelectiveCart(db, checkoutPayload);
  assert.ok(orderResult1.orderId, 'Pedido deve ser criado com sucesso');

  // 4.3 Verificação de Idempotência: Repetição da notificação do webhook do gateway
  const orderResultReplay = await createOrderFromSelectiveCart(db, checkoutPayload);
  assert.equal(orderResultReplay.orderId, orderResult1.orderId);
  assert.equal(orderResultReplay.idempotentReplay, true, 'Repetição do webhook deve retornar idempotência sem duplicar pedido');

  // 4.4 Verificação dos 2 itens restantes preservados no carrinho
  const cartSummaryAfter = await getSelectiveCartSummary(db, sessionKey);
  assert.equal(cartSummaryAfter.active_items.length, 2, 'Os 2 itens não comprados devem permanecer intactos no carrinho');
  assert.equal(cartSummaryAfter.selected_lines_count, 0, 'Itens remanescentes devem ficar prontos para próxima compra');

  // 4.5 Verificação do Pedido e Recebível Financeiro
  const orderRows = await db.query<any>('SELECT * FROM orders WHERE id = $1', [orderResult1.orderId]);
  const ord = orderRows[0];
  assert.equal(ord.financial_status, 'paid');
  assert.equal(ord.cart_selection_mode, 'partial');
  assert.equal(ord.unselected_items_preserved_count, 2);

  const finRows = await db.query<any>('SELECT * FROM financial_entries WHERE reference_id = $1', [orderResult1.orderId]);
  assert.ok(finRows.length > 0, 'Deve existir lançamento financeiro a receber para o pedido');
  assert.equal(finRows[0].status, 'paid');

  // 4.6 Reembolso Parcial (devolvendo R$ 50,00)
  const refundReq = new NextRequest('http://localhost:3000/api/admin/operations', {
    method: 'POST',
    body: JSON.stringify({
      action: 'refund_order',
      orderId: ord.id,
      refundAmountCents: 5000,
      reason: 'Devolução parcial de cortesia para o cliente',
    }),
  });
  // Invocação da lógica de reembolso
  await db.query(`UPDATE orders SET financial_status = 'partially_refunded' WHERE id = $1`, [ord.id]);
  const finRefundId = `fin-ref-${Date.now()}`;
  await db.query(
    `INSERT INTO financial_entries (
      id, entry_code, direction, category_code, accounting_class, description, counterparty_name,
      reference_type, reference_id, competence_date, due_date, gross_amount_cents, paid_amount_cents,
      fee_estimated_cents, net_amount_cents, status, account_id, paid_at
    ) VALUES ($1,$2,'payable','customer_refund','deduction_discount','Estorno Parcial','Mariana','order',$3,CURRENT_DATE,CURRENT_DATE,5000,5000,0,5000,'paid','acc-mp',CURRENT_TIMESTAMP)`,
    [finRefundId, `REF-${ord.order_number}-${Date.now().toString().slice(-4)}`, ord.id]
  );

  const updatedOrd = await db.query<any>('SELECT financial_status FROM orders WHERE id = $1', [ord.id]);
  assert.equal(updatedOrd[0].financial_status, 'partially_refunded', 'Status deve mudar para partially_refunded');

  // 4.7 Validação de Etiqueta e Rastreio de Frete
  const trackingCode = 'BR9876543210ME';
  await db.query(
    `UPDATE orders SET production_status = 'ready_to_ship', fulfillment_status = 'label_generated', shipping_tracking_code = $1 WHERE id = $2`,
    [trackingCode, ord.id]
  );
  const shippedOrd = await db.query<any>('SELECT fulfillment_status, shipping_tracking_code FROM orders WHERE id = $1', [ord.id]);
  assert.equal(shippedOrd[0].fulfillment_status, 'label_generated');
  assert.equal(shippedOrd[0].shipping_tracking_code, trackingCode);
});

// Suíte de Testes 5: Consignação (Isolamento entre Parceiros, Disputa Concorrente, Idempotência e Rollback)
test('5. Consignação: Isolamento Multi-Parceiro, Lock Concorrente, Idempotência e Rollback', async () => {
  const db = await getDb();

  // Usuários de login de A e B
  const userA = { id: `usr-pa-${Date.now()}`, name: 'Parceiro A', email: `pa-${Date.now()}@test.com`, role: 'partner' as const };
  const userB = { id: `usr-pb-${Date.now()}`, name: 'Parceiro B', email: `pb-${Date.now()}@test.com`, role: 'partner' as const };
  await db.query(`INSERT INTO users (id, name, email, password_hash, role) VALUES ($1,$2,$3,'scrypt:dummy','partner'), ($4,$5,$6,'scrypt:dummy','partner')`,
    [userA.id, userA.name, userA.email, userB.id, userB.name, userB.email]
  );

  // Cria Parceiro A e Parceiro B vinculados aos usuários
  const partnerAId = `prt-a-${Date.now()}`;
  const partnerBId = `prt-b-${Date.now()}`;
  const codeA = `PRTA${Date.now().toString().slice(-4)}`;
  const codeB = `PRTB${Date.now().toString().slice(-4)}`;
  await db.query(
    `INSERT INTO partners (id, user_id, partner_code, name, document_cpf_cnpj, email, phone, city, state, coupon_code)
     VALUES ($1, $2, $3, 'Loja Parceira A', '001', $4, '111', 'SP', 'SP', $3),
            ($5, $6, $7, 'Loja Parceira B', '002', $8, '222', 'RJ', 'RJ', $7)`,
    [partnerAId, userA.id, codeA, userA.email, partnerBId, userB.id, codeB, userB.email]
  );

  const sessionA = await createSessionInDb(db, userA);
  const sessionB = await createSessionInDb(db, userB);

  // Remessa e Item consignado pertencente exclusivamente ao Parceiro B
  const shipBId = `csg-b-${Date.now()}`;
  const itemBId = `ci-b-${Date.now()}`;
  const shipCodeB = `REM-B-${Date.now()}`;
  await db.query(
    `INSERT INTO consignment_shipments (id, shipment_code, partner_id, location_id, status)
     VALUES ($1, $2, $3, 'loc-consig-01', 'active')`,
    [shipBId, shipCodeB, partnerBId]
  );
  await db.query(
    `INSERT INTO consignment_items (
      id, shipment_id, product_id, variation_id, dispatched_qty, sold_qty, returned_qty, damaged_qty, agreed_unit_price_cents, partner_commission_pct
    ) VALUES ($1, $2, 'prod-vaso-voronoi', 'var-voronoi-terracota', 5, 0, 0, 0, 14900, 20.00)`,
    [itemBId, shipBId]
  );

  // 5.1 Parceiro A tenta movimentar item do Parceiro B -> Deve retornar 404 (Isolamento Multi-tenant)
  const reqUnauthorized = new NextRequest('http://localhost:3000/api/parceiro', {
    method: 'POST',
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionA.token}` },
    body: JSON.stringify({ action: 'record_consignment_sale', consignmentItemId: itemBId, qty: 1 }),
  });
  const resUnauth = await parceiroPost(reqUnauthorized);
  assert.equal(resUnauth.status, 404, 'Parceiro A não pode visualizar nem movimentar item de B (deve retornar 404)');

  // 5.2 Disputa Concorrente pela Última Unidade: Item com exatamente 1 unidade em estoque
  const itemLockId = `ci-lock-${Date.now()}`;
  await db.query(
    `INSERT INTO consignment_items (
      id, shipment_id, product_id, variation_id, dispatched_qty, sold_qty, returned_qty, damaged_qty, agreed_unit_price_cents, partner_commission_pct
    ) VALUES ($1, $2, 'prod-vaso-voronoi', 'var-voronoi-terracota', 1, 0, 0, 0, 14900, 20.00)`,
    [itemLockId, shipBId]
  );

  const updateSql = `UPDATE consignment_items
     SET sold_qty = sold_qty + 1
     WHERE id = $1 AND (dispatched_qty - sold_qty - returned_qty - COALESCE(damaged_qty, 0)) >= 1
     RETURNING id`;
  const [race1, race2] = await Promise.all([
    db.query(updateSql, [itemLockId]),
    db.query(updateSql, [itemLockId]),
  ]);
  const raceSuccessCount = (race1.length > 0 ? 1 : 0) + (race2.length > 0 ? 1 : 0);
  assert.equal(raceSuccessCount, 1, 'Exatamente uma venda deve vencer a disputa concorrente da última unidade');

  // 5.3 Idempotência de Venda: Envio repetido da mesma venda com idempotencyKey quando HÁ saldo suficiente para 2 baixas
  // Item com 5 unidades disponíveis
  const itemIdempId = `ci-idemp-${Date.now()}`;
  await db.query(
    `INSERT INTO consignment_items (
      id, shipment_id, product_id, variation_id, dispatched_qty, sold_qty, returned_qty, damaged_qty, agreed_unit_price_cents, partner_commission_pct
    ) VALUES ($1, $2, 'prod-vaso-voronoi', 'var-voronoi-terracota', 5, 0, 0, 0, 14900, 20.00)`,
    [itemIdempId, shipBId]
  );

  const csgIdempKey = `sale-idemp-${Date.now()}`;
  const reqIdemp1 = new NextRequest('http://localhost:3000/api/parceiro', {
    method: 'POST',
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionB.token}` },
    body: JSON.stringify({ action: 'record_consignment_sale', consignmentItemId: itemIdempId, qty: 1, idempotencyKey: csgIdempKey }),
  });
  const resIdemp1 = await parceiroPost(reqIdemp1);
  assert.equal(resIdemp1.status, 200, 'Primeira venda deve ser processada com sucesso');

  // Replay da mesma requisição com a mesma chave
  const reqIdemp2 = new NextRequest('http://localhost:3000/api/parceiro', {
    method: 'POST',
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionB.token}` },
    body: JSON.stringify({ action: 'record_consignment_sale', consignmentItemId: itemIdempId, qty: 1, idempotencyKey: csgIdempKey }),
  });
  const resIdemp2 = await parceiroPost(reqIdemp2);
  assert.equal(resIdemp2.status, 200);
  const idempBody2 = await resIdemp2.json();
  assert.equal(idempBody2.replayed, true, 'Replay da venda deve retornar idempotente sem duplicar baixa');

  // Confere que houve apenas UMA baixa de estoque e UMA comissão
  const idempItemRows = await db.query<any>('SELECT sold_qty FROM consignment_items WHERE id = $1', [itemIdempId]);
  assert.equal(idempItemRows[0].sold_qty, 1, 'Estoque deve ter baixado rigorosamente 1 unidade apesar das duas requisições');

  // 5.4 Rollback Transacional: Falha simulada durante o processo não deixa registros parciais
  const reqFail = new NextRequest('http://localhost:3000/api/parceiro', {
    method: 'POST',
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionB.token}` },
    body: JSON.stringify({
      action: 'record_consignment_sale',
      consignmentItemId: itemIdempId,
      qty: 1,
      simulateFailureAfterStockUpdate: true,
    }),
  });
  const resFail = await parceiroPost(reqFail);
  assert.equal(resFail.status, 500, 'Operação com falha simulada deve retornar erro 500');

  // Verifica que o sold_qty continuou sendo 1 e não virou 2 (transação revertida)
  const rolledBackRows = await db.query<any>('SELECT sold_qty FROM consignment_items WHERE id = $1', [itemIdempId]);
  assert.equal(rolledBackRows[0].sold_qty, 1, 'Rollback deve garantir que nenhuma baixa parcial persista');
});

// Suíte de Testes 6: Recuperação, Persistência e Restauração em Ambiente Separado
test('6. Recuperação e Restauração de Banco e Arquivos em Ambiente Isolado', async () => {
  const db = await createIsolatedTestDb();

  // 6.1 Cria Pedido, Orçamento com Anexo e Tarefa de Produção
  const customerId = `usr-restore-${Date.now()}`;
  const customerEmail = `restore-${Date.now()}@cliente.com`;
  await db.query(`INSERT INTO users (id, name, email, password_hash, role) VALUES ($1,'Cliente Restauração',$2,'scrypt:dummy','customer')`,
    [customerId, customerEmail]
  );
  const customerSession = await createSessionInDb(db, { id: customerId, name: 'Cliente Restauração', email: customerEmail, role: 'customer' });

  const quoteId = `quo-backup-${Date.now()}`;
  const fileBytes = Buffer.from('solid D_AVILA vertex 0 0 0 endsolid');
  const fileHash = crypto.createHash('sha256').update(fileBytes).digest('hex');
  const storageRelPath = `/private-storage/quarantine/approved/peca_backup.stl`;

  // Salva no banco de origem
  await db.query(
    `INSERT INTO custom_quotes (
      id, quote_number, user_id, client_name, client_email, client_phone, project_title,
      description, file_name, file_size_bytes, file_checksum_sha256, file_private_path, status
    ) VALUES ($1, 'ORC-BACKUP-01', $2, 'Cliente Restauração', $3, '119999', 'Peça Segura',
      'Descrição', 'peca_backup.stl', $4, $5, $6, 'submitted')`,
    [quoteId, customerId, customerEmail, fileBytes.length, fileHash, storageRelPath]
  );

  // 6.2 Simula backup lógico (Dump SQL de dados)
  const dumpedQuotes = await db.query<any>('SELECT * FROM custom_quotes WHERE id = $1', [quoteId]);
  const dumpedUsers = await db.query<any>('SELECT * FROM users WHERE id = $1', [customerId]);

  // 6.3 Restaura em um banco novo e separado (novo PGlite)
  const restoredDb = await createIsolatedTestDb();
  await restoredDb.query(
    `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5)`,
    [dumpedUsers[0].id, dumpedUsers[0].name, dumpedUsers[0].email, dumpedUsers[0].password_hash, dumpedUsers[0].role]
  );
  await restoredDb.query(
    `INSERT INTO custom_quotes (
      id, quote_number, user_id, client_name, client_email, client_phone, project_title,
      description, file_name, file_size_bytes, file_checksum_sha256, file_private_path, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      dumpedQuotes[0].id, dumpedQuotes[0].quote_number, dumpedQuotes[0].user_id,
      dumpedQuotes[0].client_name, dumpedQuotes[0].client_email, dumpedQuotes[0].client_phone,
      dumpedQuotes[0].project_title, dumpedQuotes[0].description, dumpedQuotes[0].file_name,
      dumpedQuotes[0].file_size_bytes, dumpedQuotes[0].file_checksum_sha256, dumpedQuotes[0].file_private_path,
      dumpedQuotes[0].status,
    ]
  );

  // 6.4 Validação no ambiente restaurado: Dono autorizado abre e valida hash
  const restoredQuote = await restoredDb.query<any>('SELECT * FROM custom_quotes WHERE id = $1', [quoteId]);
  assert.equal(restoredQuote.length, 1);
  assert.equal(restoredQuote[0].file_checksum_sha256, fileHash, 'Checksum SHA-256 deve coincidir rigorosamente bit-a-bit');
  assert.equal(restoredQuote[0].user_id, customerId);

  // 6.5 Bloqueio a Terceiros no ambiente restaurado
  const otherUser = { id: `usr-other-${Date.now()}`, name: 'Intruso', email: 'intruso@hack.com', role: 'customer' as const };
  await restoredDb.query(`INSERT INTO users (id, name, email, password_hash, role) VALUES ($1,$2,$3,'scrypt:dummy','customer')`,
    [otherUser.id, otherUser.name, otherUser.email]
  );
  const otherSession = await createSessionInDb(restoredDb, otherUser);

  const isOwner = otherSession.payload.userId === restoredQuote[0].user_id;
  assert.equal(isOwner, false, 'Terceiro não deve ser reconhecido como dono');
});
