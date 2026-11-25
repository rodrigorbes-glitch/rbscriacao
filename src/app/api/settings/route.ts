import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/db';
import { validateSessionFromCookie, SESSION_COOKIE_NAME } from '@/lib/auth';
import { saveStateSnapshot } from '@/lib/persistent-state';

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
  heroMode: 'video',
  heroVideoUrl: '',
  heroTitle: 'Design vibrante criado camada por camada.',
  heroSubtitle:
    'Vasos, luminárias e objetos decorativos impressos em 3D com precisão, cor e personalidade para transformar o seu ambiente.',
};

async function getSessionToken(req: NextRequest): Promise<string | undefined> {
  let token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {}
  }
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }
  return token;
}

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

    // 1. Authenticate user from HttpOnly session cookie, header or cookies()
    const token = await getSessionToken(req);
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

    const validHeroModes = new Set(['video', 'banner', 'video_e_banner']);
    const nextHeroMode =
      body.heroMode !== undefined && validHeroModes.has(String(body.heroMode))
        ? String(body.heroMode)
        : currentBrand.heroMode;

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
      heroMode: nextHeroMode,
      heroVideoUrl: body.heroVideoUrl !== undefined ? String(body.heroVideoUrl).trim() : currentBrand.heroVideoUrl,
      heroTitle: body.heroTitle !== undefined ? String(body.heroTitle).trim() : currentBrand.heroTitle,
      heroSubtitle: body.heroSubtitle !== undefined ? String(body.heroSubtitle).trim() : currentBrand.heroSubtitle,
    };

    await db.query(
      `INSERT INTO store_settings (key, value_json, updated_at)
       VALUES ('brand', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET
         value_json = EXCLUDED.value_json,
         updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(updatedBrand)]
    );

    // Audit log (with both actor_user_id and user_id for full compatibility)
    try {
      await db.query(
        `INSERT INTO audit_logs (id, actor_user_id, user_id, actor_name, actor_role, action, entity_type, entity_id, after_json)
         VALUES ($1, $2, $2, $3, $4, 'update_settings', 'store_settings', 'brand', $5)`,
        [`aud-${Date.now()}`, session.userId, session.name, session.role, JSON.stringify(updatedBrand)]
      );
    } catch {
      // If user_id column is missing in legacy schema, fallback without it
      await db.query(
        `INSERT INTO audit_logs (id, actor_user_id, actor_name, actor_role, action, entity_type, entity_id, after_json)
         VALUES ($1, $2, $3, $4, 'update_settings', 'store_settings', 'brand', $5)`,
        [`aud-${Date.now()}`, session.userId, session.name, session.role, JSON.stringify(updatedBrand)]
      );
    }

    // Persist snapshot to disk immediately so no server restart or redeploy can ever erase it
    await saveStateSnapshot(db);

    return NextResponse.json({ success: true, brand: updatedBrand });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao salvar configurações.' },
      { status: 500 }
    );
  }
}
