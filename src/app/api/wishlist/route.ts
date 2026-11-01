import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const sessionKey = req.nextUrl.searchParams.get('sessionKey') || 'sess-default-visitor';
    const userId = req.nextUrl.searchParams.get('userId');

    const items = await db.query<{
      id: string;
      product_id: string;
      variation_id: string | null;
      slug: string;
      name: string;
      subtitle: string | null;
      material: string;
      finish: string;
      price_cents: number;
      compare_at_price_cents: number | null;
      availability_type: string;
      lead_time_days: number;
      stock_qty: number;
      images_json: string;
      created_at: string;
    }>(
      `SELECT w.id, w.product_id, w.variation_id, w.created_at,
              p.slug, p.name, p.subtitle, p.material, p.finish, p.price_cents,
              p.compare_at_price_cents, p.availability_type, p.lead_time_days, p.stock_qty, p.images_json
       FROM wishlists w
       JOIN products p ON p.id = w.product_id
       WHERE w.session_key = $1 OR ($2::text IS NOT NULL AND w.user_id = $2::text)
       ORDER BY w.created_at DESC`,
      [sessionKey, userId || null]
    );

    const alerts = await db.query(
      `SELECT ia.*, p.name as product_name, p.slug as product_slug
       FROM interest_alerts ia
       JOIN products p ON p.id = ia.product_id
       WHERE ia.user_id = $1 OR ia.visitor_email = $2
       ORDER BY ia.created_at DESC`,
      [userId || 'none', req.nextUrl.searchParams.get('email') || 'none']
    );

    return NextResponse.json({ items, alerts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao listar favoritos.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const sessionKey = body.sessionKey || 'sess-default-visitor';

    if (body.action === 'subscribe_interest_alert') {
      const alertId = `alrt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const unsubToken = `unsub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await db.query(
        `INSERT INTO interest_alerts (
          id, product_id, variation_id, user_id, visitor_name, visitor_email, visitor_whatsapp,
          alert_type, target_price_cents, channel, opt_in_confirmed, unsubscribe_token, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11,'active')`,
        [
          alertId,
          body.productId,
          body.variationId || null,
          body.userId || null,
          body.visitorName || null,
          body.visitorEmail,
          body.visitorWhatsapp || null,
          body.alertType || 'price_drop',
          body.targetPriceCents ? Number(body.targetPriceCents) : null,
          body.channel || 'email',
          unsubToken,
        ]
      );

      await db.query(
        `INSERT INTO commercial_events (id, event_name, session_key, user_id, product_id, channel_source)
         VALUES ($1, 'interest_alert_subscribe', $2, $3, $4, 'favoritos')`,
        [`evt-alrt-${Date.now()}`, sessionKey, body.userId || null, body.productId]
      );

      return NextResponse.json({
        success: true,
        alertId,
        unsubscribeToken: unsubToken,
        message: 'Aviso de interesse registrado com sucesso! Você pode cancelar a qualquer momento.',
      });
    }

    if (body.action === 'merge_local_wishlist') {
      const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
      for (const pid of productIds) {
        const exists = await db.query(
          `SELECT id FROM wishlists
           WHERE product_id = $1 AND (session_key = $2 OR ($3::text IS NOT NULL AND user_id = $3::text))
           LIMIT 1`,
          [pid, sessionKey, body.userId || null]
        );
        if (exists.length === 0) {
          await db.query(
            `INSERT INTO wishlists (id, session_key, user_id, product_id)
             VALUES ($1, $2, $3, $4)`,
            [`wish-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, sessionKey, body.userId || null, pid]
          );
        }
      }
      return NextResponse.json({ success: true });
    }

    // Toggle favorite
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM wishlists
       WHERE product_id = $1 AND (session_key = $2 OR ($3::text IS NOT NULL AND user_id = $3::text))
       LIMIT 1`,
      [body.productId, sessionKey, body.userId || null]
    );

    if (existing.length > 0) {
      await db.query('DELETE FROM wishlists WHERE id = $1', [existing[0].id]);
      return NextResponse.json({ favorited: false, productId: body.productId });
    }

    const wishId = `wish-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await db.query(
      `INSERT INTO wishlists (id, session_key, user_id, product_id, variation_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [wishId, sessionKey, body.userId || null, body.productId, body.variationId || null]
    );

    await db.query(
      `INSERT INTO commercial_events (id, event_name, session_key, user_id, product_id, channel_source)
       VALUES ($1, 'wishlist_add', $2, $3, $4, 'loja')`,
      [`evt-wish-${Date.now()}`, sessionKey, body.userId || null, body.productId]
    );

    return NextResponse.json({ favorited: true, id: wishId, productId: body.productId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao atualizar favoritos.' },
      { status: 400 }
    );
  }
}
