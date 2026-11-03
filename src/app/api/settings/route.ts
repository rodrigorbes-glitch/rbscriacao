import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { validateSessionFromCookie, SESSION_COOKIE_NAME } from '@/lib/auth';

const DEFAULT_BRAND_SETTINGS = {
  name: 'RBS Criação',
  whatsapp: '(21) 99888-7766',
  phone: '(21) 99888-7766',
  email: 'contato@rbscriacao.com',
  instagram: '@rbscriacao',
  instagramUrl: 'https://instagram.com/rbscriacao',
  facebook: '@rbscriacao',
  facebookUrl: 'https://facebook.com/rbscriacao',
  shippingText: 'Envio para todo o Brasil',
};

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.query<{ key: string; value_json: string }>(
      `SELECT key, value_json FROM store_settings WHERE key = 'brand' LIMIT 1`
    );

    let brand = DEFAULT_BRAND_SETTINGS;
    if (rows.length > 0 && rows[0].value_json) {
      try {
        const parsed = JSON.parse(rows[0].value_json);
        brand = { ...DEFAULT_BRAND_SETTINGS, ...parsed };
      } catch {
        // use default
      }
    }

    return NextResponse.json({ success: true, brand });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao buscar configurações.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();

    // 1. Authenticate user from HttpOnly session cookie (must be admin)
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionFromCookie(db, token);

    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem alterar configurações da loja.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Get existing settings
    const rows = await db.query<{ key: string; value_json: string }>(
      `SELECT key, value_json FROM store_settings WHERE key = 'brand' LIMIT 1`
    );
    let currentBrand = DEFAULT_BRAND_SETTINGS;
    if (rows.length > 0 && rows[0].value_json) {
      try {
        currentBrand = { ...DEFAULT_BRAND_SETTINGS, ...JSON.parse(rows[0].value_json) };
      } catch {
        // use default
      }
    }

    const updatedBrand = {
      ...currentBrand,
      whatsapp: body.whatsapp !== undefined ? String(body.whatsapp).trim() : currentBrand.whatsapp,
      phone: body.phone !== undefined ? String(body.phone).trim() : currentBrand.phone,
      email: body.email !== undefined ? String(body.email).trim() : currentBrand.email,
      instagram: body.instagram !== undefined ? String(body.instagram).trim() : currentBrand.instagram,
      instagramUrl: body.instagramUrl !== undefined ? String(body.instagramUrl).trim() : currentBrand.instagramUrl,
      facebook: body.facebook !== undefined ? String(body.facebook).trim() : currentBrand.facebook,
      facebookUrl: body.facebookUrl !== undefined ? String(body.facebookUrl).trim() : currentBrand.facebookUrl,
      shippingText: body.shippingText !== undefined ? String(body.shippingText).trim() : currentBrand.shippingText,
    };

    await db.query(
      `INSERT INTO store_settings (key, value_json, updated_at)
       VALUES ('brand', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET
         value_json = EXCLUDED.value_json,
         updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(updatedBrand)]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (id, actor_user_id, actor_name, actor_role, action, entity_type, entity_id, after_json)
       VALUES ($1, $2, $3, $4, 'update_settings', 'store_settings', 'brand', $5)`,
      [`aud-${Date.now()}`, session.userId, session.name, session.role, JSON.stringify(updatedBrand)]
    );

    return NextResponse.json({ success: true, brand: updatedBrand });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao salvar configurações.' },
      { status: 500 }
    );
  }
}
