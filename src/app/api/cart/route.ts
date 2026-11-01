import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import {
  addCartItem,
  getOrCreateCart,
  getSelectiveCartSummary,
} from '@/lib/cart-checkout';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const sessionKey = req.nextUrl.searchParams.get('sessionKey') || 'sess-default-visitor';
    const summary = await getSelectiveCartSummary(db, sessionKey);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao carregar carrinho.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const sessionKey = body.sessionKey || 'sess-default-visitor';
    const summary = await addCartItem(db, {
      sessionKey,
      userId: body.userId || null,
      productId: body.productId,
      variationId: body.variationId || null,
      quantity: Number(body.quantity || 1),
      selected: body.selected !== undefined ? Boolean(body.selected) : true,
      customText: body.customText || null,
      customNotes: body.customNotes || null,
    });
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao adicionar item.' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const sessionKey = body.sessionKey || 'sess-default-visitor';
    const cartId = await getOrCreateCart(db, sessionKey);

    if (body.action === 'toggle_item') {
      await db.query(
        'UPDATE cart_items SET selected = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND cart_id = $3',
        [Boolean(body.selected), body.itemId, cartId]
      );
      await db.query(
        `INSERT INTO commercial_events (id, event_name, session_key, channel_source, metadata_json)
         VALUES ($1, 'cart_select_toggle', $2, 'carrinho', $3)`,
        [
          `evt-tgl-${Date.now()}`,
          sessionKey,
          JSON.stringify({ itemId: body.itemId, selected: Boolean(body.selected) }),
        ]
      );
    } else if (body.action === 'toggle_all') {
      await db.query(
        'UPDATE cart_items SET selected = $1, updated_at = CURRENT_TIMESTAMP WHERE cart_id = $2 AND saved_for_later = FALSE',
        [Boolean(body.selected), cartId]
      );
    } else if (body.action === 'update_quantity') {
      const qty = Math.max(1, Number(body.quantity || 1));
      await db.query(
        'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND cart_id = $3',
        [qty, body.itemId, cartId]
      );
    } else if (body.action === 'save_for_later') {
      const saveLater = Boolean(body.savedForLater);
      await db.query(
        'UPDATE cart_items SET saved_for_later = $1, selected = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND cart_id = $4',
        [saveLater, !saveLater, body.itemId, cartId]
      );
      if (saveLater) {
        await db.query(
          `INSERT INTO commercial_events (id, event_name, session_key, channel_source)
           VALUES ($1, 'cart_save_for_later', $2, 'carrinho')`,
          [`evt-sfl-${Date.now()}`, sessionKey]
        );
      }
    } else if (body.action === 'update_logistics') {
      await db.query(
        `UPDATE carts
         SET cep = COALESCE($1, cep),
             coupon_code = CASE WHEN $2::text IS NOT NULL THEN NULLIF($2::text, '') ELSE coupon_code END,
             selected_shipping_service = COALESCE($3, selected_shipping_service),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          body.cep ?? null,
          body.couponCode !== undefined ? String(body.couponCode) : null,
          body.shippingServiceId ?? null,
          cartId,
        ]
      );
    }

    const summary = await getSelectiveCartSummary(db, sessionKey);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao atualizar carrinho.' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const sessionKey = req.nextUrl.searchParams.get('sessionKey') || 'sess-default-visitor';
    const itemId = req.nextUrl.searchParams.get('itemId');
    const cartId = await getOrCreateCart(db, sessionKey);

    if (itemId) {
      await db.query('DELETE FROM cart_items WHERE id = $1 AND cart_id = $2', [itemId, cartId]);
    }
    const summary = await getSelectiveCartSummary(db, sessionKey);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao remover item.' },
      { status: 400 }
    );
  }
}
