import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { seedDatabase } from './seed';

export interface DatabaseAdapter {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T>;
}

declare global {
  var __rbsDbPromise: Promise<DatabaseAdapter> | undefined;
}

class PGliteAdapter implements DatabaseAdapter {
  private pg: PGlite;
  private mutex: Promise<unknown> = Promise.resolve();

  constructor(pg: PGlite) {
    this.pg = pg;
  }

  private serialize<T>(op: () => Promise<T>): Promise<T> {
    const next = this.mutex.then(op, op);
    this.mutex = next.then(() => undefined, () => undefined);
    return next;
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.serialize(async () => {
      const res = await this.pg.query<T>(sql, params);
      return res.rows;
    });
  }

  async exec(sql: string): Promise<void> {
    return this.serialize(async () => {
      await this.pg.exec(sql);
    });
  }

  async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    return this.serialize(async () => {
      await this.pg.exec('BEGIN');
      try {
        const txAdapter: DatabaseAdapter = {
          query: async <R = Record<string, unknown>>(q: string, p: unknown[] = []) => {
            const r = await this.pg.query<R>(q, p);
            return r.rows;
          },
          exec: async (q: string) => {
            await this.pg.exec(q);
          },
          transaction: async <R>(innerFn: (innerTx: DatabaseAdapter) => Promise<R>) => innerFn(txAdapter),
        };
        const result = await fn(txAdapter);
        await this.pg.exec('COMMIT');
        return result;
      } catch (err) {
        await this.pg.exec('ROLLBACK');
        throw err;
      }
    });
  }
}

class PgPoolAdapter implements DatabaseAdapter {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txAdapter: DatabaseAdapter = {
        query: async <R = Record<string, unknown>>(q: string, p: unknown[] = []) => {
          const r = await client.query(q, p);
          return r.rows as R[];
        },
        exec: async (q: string) => {
          await client.query(q);
        },
        transaction: async <R>(innerFn: (innerTx: DatabaseAdapter) => Promise<R>) => innerFn(txAdapter),
      };
      const result = await fn(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

async function initDatabase(): Promise<DatabaseAdapter> {
  let adapter: DatabaseAdapter;
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
    adapter = new PgPoolAdapter(dbUrl);
  } else if (
    process.env.PGLITE_MEMORY === '1' ||
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    const pg = await PGlite.create();
    adapter = new PGliteAdapter(pg);
  } else {
    const dataDir = path.join(process.cwd(), '.pgdata', 'rbs-v3-pg');
    fs.mkdirSync(path.dirname(dataDir), { recursive: true });
    try {
      const pidFile = path.join(dataDir, 'postmaster.pid');
      if (fs.existsSync(pidFile)) {
        try {
          fs.unlinkSync(pidFile);
        } catch {
          // ignore if locked
        }
      }
      const pg = await PGlite.create(dataDir);
      adapter = new PGliteAdapter(pg);
    } catch {
      // Fallback to in-memory PGlite if another build worker holds the directory lock
      const pg = await PGlite.create();
      adapter = new PGliteAdapter(pg);
    }
  }

  const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', '001_initial_schema.sql');
  const schemaSql = fs.readFileSync(migrationPath, 'utf8');
  await adapter.exec(schemaSql);
  await adapter.query(
    `INSERT INTO schema_migrations (version) VALUES ('001_initial_schema') ON CONFLICT (version) DO NOTHING`
  );

  await seedDatabase(adapter);
  return adapter;
}

export async function getDb(): Promise<DatabaseAdapter> {
  if (!globalThis.__rbsDbPromise) {
    globalThis.__rbsDbPromise = initDatabase();
  }
  return globalThis.__rbsDbPromise;
}

export async function createIsolatedTestDb(): Promise<DatabaseAdapter> {
  const pg = await PGlite.create();
  const adapter = new PGliteAdapter(pg);
  const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', '001_initial_schema.sql');
  const schemaSql = fs.readFileSync(migrationPath, 'utf8');
  await adapter.exec(schemaSql);
  await seedDatabase(adapter);
  return adapter;
}
