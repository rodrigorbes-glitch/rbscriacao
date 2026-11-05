import fs from 'fs';
import path from 'path';
import type { DatabaseAdapter } from '@/db';

export function getPersistentBaseDir(): string {
  if (process.env.RBS_DATA_DIR) {
    return process.env.RBS_DATA_DIR;
  }
  // On Hostinger and Linux servers, process.env.HOME is /home/u<account_id>
  // Files stored here are permanent and survive all deployments, git updates, and app restarts.
  if (process.platform === 'linux' && process.env.HOME && fs.existsSync(process.env.HOME)) {
    const homeStorage = path.join(process.env.HOME, '.rbs_storage');
    try {
      fs.mkdirSync(homeStorage, { recursive: true });
      return homeStorage;
    } catch {
      // Fallback if permission fails
    }
  }
  // Local development / fallback
  const localDir = path.join(process.cwd(), '.pgdata');
  try {
    fs.mkdirSync(localDir, { recursive: true });
  } catch {}
  return localDir;
}

export function getUploadsBackupDir(): string {
  const base = getPersistentBaseDir();
  const uploadsDir = path.join(base, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch {}
  }
  return uploadsDir;
}

export function getStateBackupPath(): string {
  return path.join(getPersistentBaseDir(), 'rbs_state_backup.json');
}

/**
 * Copies persistent uploads into public/products/uploads so Next.js can serve them directly
 */
export function syncUploadsToPublic(): void {
  try {
    const backupDir = getUploadsBackupDir();
    const publicUploadDir = path.join(process.cwd(), 'public', 'products', 'uploads');
    fs.mkdirSync(publicUploadDir, { recursive: true });

    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      for (const file of files) {
        const src = path.join(backupDir, file);
        const dest = path.join(publicUploadDir, file);
        if (!fs.existsSync(dest) && fs.statSync(src).isFile()) {
          try {
            fs.copyFileSync(src, dest);
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn('[PersistentState] syncUploadsToPublic warning:', err);
  }
}

/**
 * Saves an uploaded file to both public/products/uploads and the persistent backup folder
 */
export function savePersistentUpload(fileName: string, buffer: Buffer): void {
  try {
    const publicUploadDir = path.join(process.cwd(), 'public', 'products', 'uploads');
    fs.mkdirSync(publicUploadDir, { recursive: true });
    fs.writeFileSync(path.join(publicUploadDir, fileName), buffer);

    const backupDir = getUploadsBackupDir();
    fs.writeFileSync(path.join(backupDir, fileName), buffer);
  } catch (err) {
    console.warn('[PersistentState] savePersistentUpload warning:', err);
  }
}

interface PersistentSnapshot {
  updatedAt: string;
  storeSettings?: Record<string, string>;
  users?: Array<{
    id: string;
    name: string;
    email: string;
    password_hash: string;
    role: string;
    phone: string | null;
    is_active: boolean;
  }>;
  products?: Array<any>;
}

/**
 * Captures all critical state (settings, users, passwords, custom products) into a JSON backup file
 */
export async function saveStateSnapshot(db: DatabaseAdapter): Promise<void> {
  try {
    const [settingsRows, userRows, productRows] = await Promise.all([
      db.query<{ key: string; value_json: string }>('SELECT key, value_json FROM store_settings'),
      db.query<any>('SELECT id, name, email, password_hash, role, phone, is_active FROM users'),
      db.query<any>('SELECT * FROM products'),
    ]);

    const settingsMap: Record<string, string> = {};
    for (const r of settingsRows) {
      settingsMap[r.key] = r.value_json;
    }

    const snapshot: PersistentSnapshot = {
      updatedAt: new Date().toISOString(),
      storeSettings: settingsMap,
      users: userRows,
      products: productRows,
    };

    const filePath = getStateBackupPath();
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.warn('[PersistentState] saveStateSnapshot warning:', err);
  }
}

/**
 * Restores state snapshot from disk into database (runs during initialization)
 */
export async function restoreStateSnapshot(db: DatabaseAdapter): Promise<void> {
  try {
    const filePath = getStateBackupPath();
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const snapshot: PersistentSnapshot = JSON.parse(content);

    // 1. Restore Store Settings
    if (snapshot.storeSettings) {
      for (const [key, value_json] of Object.entries(snapshot.storeSettings)) {
        await db.query(
          `INSERT INTO store_settings (key, value_json, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET
             value_json = EXCLUDED.value_json,
             updated_at = CURRENT_TIMESTAMP`,
          [key, value_json]
        );
      }
    }

    // 2. Restore Users and Passwords
    if (Array.isArray(snapshot.users) && snapshot.users.length > 0) {
      for (const u of snapshot.users) {
        await db.query(
          `INSERT INTO users (id, name, email, password_hash, role, phone, is_active, email_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
           ON CONFLICT (email) DO UPDATE SET
             password_hash = EXCLUDED.password_hash,
             name = EXCLUDED.name,
             phone = EXCLUDED.phone,
             role = EXCLUDED.role,
             is_active = EXCLUDED.is_active`,
          [u.id, u.name, u.email, u.password_hash, u.role, u.phone, u.is_active ?? true]
        );
      }
    }

    // 3. Restore Products and Balances
    if (Array.isArray(snapshot.products) && snapshot.products.length > 0) {
      for (const p of snapshot.products) {
        await db.query(
          `INSERT INTO products (
            id, sku, slug, name, subtitle, short_description, description,
            category_id, collection_id, material, finish, availability_type, lead_time_days,
            dimensions_mm, dimensional_tolerance, weight_grams, package_weight_grams,
            package_dimensions_cm, filament_grams_per_unit, support_purge_grams_per_unit,
            print_time_minutes, price_cents, compare_at_price_cents, cost_cents,
            stock_qty, allow_customization, customization_instructions, max_custom_chars,
            care_instructions, layer_notice, license_origin, model_3d_glb_url,
            images_json, featured, is_b2b_eligible, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,
            COALESCE($36, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            sku = EXCLUDED.sku,
            price_cents = EXCLUDED.price_cents,
            cost_cents = EXCLUDED.cost_cents,
            stock_qty = EXCLUDED.stock_qty,
            filament_grams_per_unit = EXCLUDED.filament_grams_per_unit,
            images_json = EXCLUDED.images_json,
            featured = EXCLUDED.featured,
            updated_at = CURRENT_TIMESTAMP`,
          [
            p.id,
            p.sku,
            p.slug,
            p.name,
            p.subtitle,
            p.short_description || p.name,
            p.description || p.name,
            p.category_id,
            p.collection_id,
            p.material || 'PLA',
            p.finish || 'Fosco Camadas Suaves',
            p.availability_type || 'ready_stock',
            Number(p.lead_time_days || 1),
            p.dimensions_mm || '120 x 120 x 180 mm',
            p.dimensional_tolerance || '± 0,3 mm',
            Number(p.weight_grams || 180),
            Number(p.package_weight_grams || 260),
            p.package_dimensions_cm || '18x18x22',
            Number(p.filament_grams_per_unit || 165),
            Number(p.support_purge_grams_per_unit || 15),
            Number(p.print_time_minutes || 210),
            Number(p.price_cents),
            p.compare_at_price_cents ? Number(p.compare_at_price_cents) : null,
            Number(p.cost_cents || 0),
            Number(p.stock_qty || 0),
            Boolean(p.allow_customization),
            p.customization_instructions,
            p.max_custom_chars ? Number(p.max_custom_chars) : 30,
            p.care_instructions || 'Uso interno.',
            p.layer_notice || 'Manufatura aditiva.',
            p.license_origin || 'Design Autoral RBS Criação',
            p.model_3d_glb_url,
            p.images_json || '[]',
            Boolean(p.featured),
            Boolean(p.is_b2b_eligible),
            p.created_at ? new Date(p.created_at) : null,
          ]
        );

        // Ensure inventory balance exists
        await db.query(
          `INSERT INTO inventory_balances (id, product_id, variation_id, location_id, on_hand_qty, reserved_qty, min_stock_qty)
           VALUES ($1, $2, NULL, 'loc-expedition', $3, 0, 2)
           ON CONFLICT (id) DO UPDATE SET on_hand_qty = EXCLUDED.on_hand_qty`,
          [`bal-exp-${p.id}`, p.id, Number(p.stock_qty || 0)]
        );
      }
    }
  } catch (err) {
    console.warn('[PersistentState] restoreStateSnapshot warning:', err);
  }
}
