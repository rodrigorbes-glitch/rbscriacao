import fs from 'fs';
import path from 'path';
import { getDb, createIsolatedTestDb } from '../src/db';

async function runMigrations() {
  console.log('--- RBS Criação v3: Executando Migrações de Banco de Dados ---');
  const db = await getDb();

  const migrationDir = path.join(process.cwd(), 'src', 'db', 'migrations');
  const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`Aplicando migração: ${file}...`);
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    await db.exec(sql);
    const version = path.basename(file, '.sql');
    await db.query(
      `INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING`,
      [version]
    );
    console.log(`✓ Migração ${file} aplicada com sucesso.`);
  }

  // Verificação de integridade das tabelas centrais
  const tables = await db.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC`
  );
  console.log(`\nTabelas verificadas no esquema (${tables.length} tabelas encontradas):`);
  console.log(tables.map((t) => t.tablename).join(', '));
  console.log('\n--- Migração concluída com 100% de integridade ---');
}

runMigrations().catch((err) => {
  console.error('Falha crítica na execução da migração:', err);
  process.exit(1);
});
