import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { getDb } from '../db';
import {
  saveStateSnapshot,
  restoreStateSnapshot,
  getStateBackupPath,
  getPersistentBaseDir,
} from '../lib/persistent-state';
import { hashPassword, createSessionInDb } from '../lib/auth';

test('Persistência: Brand Settings, Usuários, Senhas e Snapshot no Disco', async () => {
  const db = await getDb();

  // 1. Alterar Configurações de Marca / Contato
  const testBrand = {
    name: 'RBS Criação Autoral',
    whatsapp: '(21) 99111-2233',
    phone: '(21) 99111-2233',
    email: 'rodrigorbes@gmail.com',
    instagram: '@rbscriacao.oficial',
    instagramUrl: 'https://instagram.com/rbscriacao.oficial',
    facebook: '@rbscriacao',
    facebookUrl: 'https://facebook.com/rbscriacao',
    shippingText: 'Envio Expresso para todo o Brasil',
  };

  await db.query(
    `INSERT INTO store_settings (key, value_json, updated_at)
     VALUES ('brand', $1, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET
       value_json = EXCLUDED.value_json,
       updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(testBrand)]
  );

  // 2. Criar Novo Usuário e Alterar Senha
  const testUserId = `usr-test-persist-${Date.now()}`;
  const testPassword = 'NovaSenhaSegura@2026';
  const hashed = hashPassword(testPassword);

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, phone, is_active, email_verified)
     VALUES ($1, $2, $3, $4, 'operator', '(21) 99999-8888', TRUE, TRUE)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [testUserId, 'Operador Persistente', `operador-${Date.now()}@teste.com`, hashed]
  );

  // 3. Cadastrar Novo Produto com Imagens
  const testProdId = `prod-persist-${Date.now()}`;
  await db.query(
    `INSERT INTO products (
      id, sku, slug, name, short_description, description, price_cents, cost_cents, stock_qty, images_json, care_instructions, layer_notice
    ) VALUES (
      $1, $2, $3, $4, 'Desc', 'Desc completa', 14990, 4500, 15, '["/products/uploads/test.png"]', 'Cuidados', 'Camadas'
    ) ON CONFLICT (id) DO UPDATE SET price_cents = EXCLUDED.price_cents`,
    [testProdId, `SKU-P-${Date.now().toString().slice(-4)}`, `slug-persist-${Date.now()}`, 'Vaso Escultural Teste']
  );

  // 4. Salvar Snapshot no Disco
  await saveStateSnapshot(db);
  const backupFile = getStateBackupPath();
  assert.ok(fs.existsSync(backupFile), 'Arquivo de snapshot persistente deve existir');

  const content = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  assert.ok(content.storeSettings?.brand, 'Snapshot deve conter configurações de marca');
  const parsedBrand = JSON.parse(content.storeSettings.brand);
  assert.equal(parsedBrand.whatsapp, '(21) 99111-2233');
  assert.equal(parsedBrand.email, 'rodrigorbes@gmail.com');

  // 5. Simular Reinicialização Limpa do Banco e Restauração via Snapshot
  // Limpar store_settings temporariamente
  await db.query(`DELETE FROM store_settings WHERE key = 'brand'`);
  const cleared = await db.query(`SELECT * FROM store_settings WHERE key = 'brand'`);
  assert.equal(cleared.length, 0, 'Configuração foi removida para teste de restauração');

  // Executar restauração
  await restoreStateSnapshot(db);

  // Verificar se recuperou com sucesso
  const restoredRows = await db.query<{ value_json: string }>(
    `SELECT value_json FROM store_settings WHERE key = 'brand'`
  );
  assert.ok(restoredRows.length > 0, 'Configuração de marca deve ser restaurada do snapshot');
  const restoredBrand = JSON.parse(restoredRows[0].value_json);
  assert.equal(restoredBrand.whatsapp, '(21) 99111-2233');
  assert.equal(restoredBrand.email, 'rodrigorbes@gmail.com');

  // Verificar se o produto persistiu
  const restoredProd = await db.query<{ name: string; price_cents: number }>(
    `SELECT name, price_cents FROM products WHERE id = $1`,
    [testProdId]
  );
  assert.ok(restoredProd.length > 0, 'Produto deve persistir na restauração');
  assert.equal(restoredProd[0].price_cents, 14990);
});
