import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { validateSessionFromCookie, SESSION_COOKIE_NAME } from '@/lib/auth';

// 1. GET: Fetch partner-specific dashboard data (strictly isolated by partnerId from session)
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionFromCookie(db, token);

    if (!session) {
      return NextResponse.json({ error: 'Acesso não autenticado.' }, { status: 401 });
    }

    if (session.role !== 'partner' && session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso restrito a parceiros comerciais credenciados da RBS Criação.' },
        { status: 403 }
      );
    }

    const partnerId = session.partnerId;
    if (!partnerId) {
      return NextResponse.json(
        { error: 'Conta de parceiro sem vínculo comercial ativo cadastrado.' },
        { status: 403 }
      );
    }

    // Partner info (their own record only)
    const partnerRows = await db.query<any>(
      `SELECT id, partner_code, name, business_name, email, phone, city, state,
              partner_type, commission_rate_pct, coupon_code, customer_discount_pct, status
       FROM partners
       WHERE id = $1 AND status = 'active'
       LIMIT 1`,
      [partnerId]
    );

    if (partnerRows.length === 0) {
      return NextResponse.json(
        { error: 'Cadastro de parceiro não encontrado ou inativo.' },
        { status: 403 }
      );
    }
    const partner = partnerRows[0];

    // Consignment items belonging to this partner ONLY
    const consignmentItems = await db.query<any>(
      `SELECT ci.*, p.name as product_name, p.sku, cs.shipment_code
       FROM consignment_items ci
       JOIN consignment_shipments cs ON cs.id = ci.shipment_id
       JOIN products p ON p.id = ci.product_id
       WHERE cs.partner_id = $1
       ORDER BY ci.id DESC`,
      [partnerId]
    );

    // Commissions earned by this partner ONLY
    const commissions = await db.query<any>(
      `SELECT pc.*, o.order_number
       FROM partner_commissions pc
       LEFT JOIN orders o ON o.id = pc.order_id
       WHERE pc.partner_id = $1
       ORDER BY pc.created_at DESC`,
      [partnerId]
    );

    // Comodato assets in custody of this partner ONLY
    const comodatos = await db.query<any>(
      `SELECT * FROM comodato_assets WHERE location_id = $1 ORDER BY id ASC`,
      [`loc-partner-${partner.partner_code.toLowerCase()}`]
    );

    // Catalog products available for recurring purchase order
    const catalogProducts = await db.query<any>(
      `SELECT id, name, sku, price_cents, images_json FROM products WHERE is_active = TRUE ORDER BY name ASC`
    );

    return NextResponse.json({
      partner,
      consignmentItems,
      commissions,
      comodatos,
      catalogProducts,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao carregar dados do portal do parceiro.' },
      { status: 500 }
    );
  }
}

// 2. POST: Partner actions (Record sale of consignment piece OR Request recurring replenishment order)
export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionFromCookie(db, token);

    if (!session) {
      return NextResponse.json({ error: 'Acesso não autenticado.' }, { status: 401 });
    }

    if (session.role !== 'partner' && session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso restrito a parceiros comerciais da RBS Criação.' },
        { status: 403 }
      );
    }

    const partnerId = session.partnerId;
    if (!partnerId) {
      return NextResponse.json({ error: 'Vínculo de parceiro não encontrado.' }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action;

    // Ação A: Baixa de venda em consignação pelo próprio parceiro
    if (action === 'record_consignment_sale') {
      const { consignmentItemId, qty = 1 } = body;
      const saleQty = Math.max(1, Number(qty));

      // CRITICAL SECURITY: Verify this item belongs to the authenticated partner
      const itemRows = await db.query<any>(
        `SELECT ci.*, cs.partner_id, cs.shipment_code, p.name AS product_name
         FROM consignment_items ci
         JOIN consignment_shipments cs ON cs.id = ci.shipment_id
         JOIN products p ON p.id = ci.product_id
         WHERE ci.id = $1 AND cs.partner_id = $2`,
        [consignmentItemId, partnerId]
      );

      if (itemRows.length === 0) {
        return NextResponse.json(
          { error: 'Item consignado não encontrado na sua vitrine parceira.' },
          { status: 404 }
        );
      }

      const item = itemRows[0];
      const available = Number(item.dispatched_qty) - Number(item.sold_qty) - Number(item.returned_qty) - Number(item.damaged_qty || 0);

      if (saleQty > available) {
        return NextResponse.json(
          { error: `Saldo físico insuficiente na vitrine (${available} un disponíveis). Não é possível registrar venda repetida.` },
          { status: 400 }
        );
      }

      // Update sold qty atomically with concurrency lock
      const updated = await db.query<any>(
        `UPDATE consignment_items
         SET sold_qty = sold_qty + $1
         WHERE id = $2 AND (dispatched_qty - sold_qty - returned_qty - COALESCE(damaged_qty, 0)) >= $1
         RETURNING id`,
        [saleQty, item.id]
      );

      if (updated.length === 0) {
        return NextResponse.json(
          { error: 'Não foi possível registrar a venda: o saldo disponível acabou de ser baixado em outra operação simultânea.' },
          { status: 400 }
        );
      }

      const grossCents = saleQty * Number(item.agreed_unit_price_cents);
      const commPct = Number(item.partner_commission_pct || 20);
      const commCents = Math.round(grossCents * (commPct / 100));
      const netRepasseCents = grossCents - commCents;
      const today = new Date().toISOString().slice(0, 10);
      const finId = `fin-csg-${Date.now()}`;

      // Insert financial entry and commission for this specific partner
      await db.query(
        `INSERT INTO financial_entries (
          id, entry_code, direction, category_code, accounting_class, description, counterparty_name,
          reference_type, reference_id, competence_date, due_date,
          gross_amount_cents, paid_amount_cents, fee_estimated_cents, net_amount_cents, status, account_id
        ) VALUES ($1,$2,'receivable','consignment_settlement','gross_revenue',$3,'Parceiro Consignado','consignment',$4,$5,$5,$6,$6,0,$6,'paid','acc-bank')`,
        [
          finId,
          `CSG-${Math.floor(1000 + Math.random() * 9000)}`,
          `Acerto Venda Consignada (${saleQty}x ${item.product_name} — Remessa ${item.shipment_code})`,
          item.id,
          today,
          netRepasseCents,
        ]
      );

      await db.query(
        `INSERT INTO partner_commissions (
          id, partner_id, origin_type, calculation_base_cents, commission_rate_pct, commission_amount_cents, status, financial_entry_id
        ) VALUES ($1,$2,'consignment_sale',$3,$4,$5,'paid',$6)`,
        [`pcom-${Date.now()}`, partnerId, grossCents, commPct, commCents, finId]
      );

      return NextResponse.json({
        success: true,
        message: `${saleQty}x ${item.product_name} baixado(s) com sucesso. Comissão de R$ ${(commCents / 100).toFixed(2)} registrada!`,
      });
    }

    // Ação B: Pedido de reposição recorrente pelo parceiro
    if (action === 'request_replenishment_order') {
      const { productId, quantity = 5 } = body;
      const orderQty = Math.max(1, Number(quantity));

      const partnerRows = await db.query<any>(`SELECT * FROM partners WHERE id = $1`, [partnerId]);
      const productRows = await db.query<any>(`SELECT * FROM products WHERE id = $1`, [productId]);
      const partner = partnerRows[0];
      const product = productRows[0];

      if (!partner || !product) {
        return NextResponse.json({ error: 'Produto ou dados do parceiro inválidos.' }, { status: 400 });
      }

      // Discount is enforced by server-side partner configuration (partner cannot forge lower price!)
      const discountPct = Number(partner.commission_rate_pct || 20);
      const agreedUnitCents = Math.round(Number(product.price_cents) * (1 - discountPct / 100));
      const totalCents = orderQty * agreedUnitCents;
      const today = new Date().toISOString().slice(0, 10);
      const finId = `fin-rec-b2b-${Date.now()}`;

      await db.query(
        `INSERT INTO financial_entries (
          id, entry_code, direction, category_code, accounting_class, description, counterparty_name,
          reference_type, reference_id, competence_date, due_date,
          gross_amount_cents, paid_amount_cents, fee_estimated_cents, net_amount_cents, status, account_id
        ) VALUES ($1,$2,'receivable','b2b_recurring_sale','gross_revenue',$3,$4,'partner',$5,$6,$6,$7,0,0,$7,'pending','acc-bank')`,
        [
          finId,
          `REC-PAR-${Math.floor(1000 + Math.random() * 9000)}`,
          `Pedido Reposição Parceiro (${orderQty}x ${product.name} com ${discountPct}% desc. revenda)`,
          partner.name,
          partner.id,
          today,
          totalCents,
        ]
      );

      return NextResponse.json({
        success: true,
        message: `Pedido de reposição de ${orderQty} un de ${product.name} enviado para a produção da RBS Criação!`,
      });
    }

    return NextResponse.json({ error: 'Ação não suportada.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao processar solicitação de parceiro.' },
      { status: 500 }
    );
  }
}
