import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { validateSessionFromCookie, SESSION_COOKIE_NAME } from '@/lib/auth';
import {
  purchaseSupplyLot,
  advanceProductionJobStage,
  recordProductionFailure,
  reconcileGatewayFee,
} from '@/lib/operations';

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();

    // 1. Authenticate user from HttpOnly session cookie
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionFromCookie(db, token);

    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autenticado. Faça login no Painel RBS.' },
        { status: 401 }
      );
    }

    // Must be admin or operator
    if (session.role !== 'admin' && session.role !== 'operator') {
      return NextResponse.json(
        { error: 'Acesso negado. Esta operação exige privilégios administrativos da RBS.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = body.action;

    // 2. Strict Role-Based Access Control (RBAC) per action
    // Operator is ONLY permitted to advance jobs and record failures on 3D print beds
    const OPERATOR_ALLOWED_ACTIONS = ['advance_job', 'record_failure'];
    if (session.role === 'operator' && !OPERATOR_ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Operador de bancada 3D não possui permissão para executar a ação '${action}'. Requer administrador.` },
        { status: 403 }
      );
    }

    switch (action) {
      case 'purchase_supply': {
        const res = await purchaseSupplyLot(db, {
          supplyId: body.supplyId,
          purchaseQty: Number(body.purchaseQty || 1),
          unitPurchaseCostCents: Math.round(Number(body.unitPurchaseCostBrl || 120) * 100),
          supplierName: body.supplierName,
          dueDate: body.dueDate,
          paidImmediately: Boolean(body.paidImmediately),
          actorName: session.name,
        });
        return NextResponse.json({ success: true, ...res });
      }

      case 'advance_job': {
        const res = await advanceProductionJobStage(db, {
          jobId: body.jobId,
          newStage: body.newStage,
          actualGramsOverride: body.actualGramsOverride ? Number(body.actualGramsOverride) : undefined,
          trackingCode: body.trackingCode,
          actorName: session.name,
        });
        return NextResponse.json({ success: true, ...res });
      }

      case 'record_failure': {
        const res = await recordProductionFailure(db, {
          jobId: body.jobId,
          wastedGrams: Number(body.wastedGrams || 25),
          failureReason: body.failureReason || 'Falha de aderência na primeira camada',
          reprintTriggered: body.reprintTriggered !== false,
          actorName: session.name,
        });
        return NextResponse.json({ success: true, ...res });
      }

      case 'reconcile_fee': {
        const res = await reconcileGatewayFee(db, {
          entryId: body.entryId,
          actualFeeCents: Math.round(Number(body.actualFeeBrl ?? 0) * 100),
          notes: body.notes,
          actorName: session.name,
        });
        return NextResponse.json({ success: true, ...res });
      }

      case 'settle_financial_entry': {
        await db.query(
          `UPDATE financial_entries
           SET status = 'paid',
               paid_amount_cents = gross_amount_cents,
               paid_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [body.entryId]
        );
        return NextResponse.json({ success: true });
      }

      case 'create_financial_entry': {
        const id = `fin-man-${Date.now()}`;
        const code = `${body.direction === 'receivable' ? 'REC' : 'PAY'}-MAN-${Math.floor(1000 + Math.random() * 9000)}`;
        const amountCents = Math.round(Number(body.amountBrl || 0) * 100);
        const today = new Date().toISOString().slice(0, 10);
        await db.query(
          `INSERT INTO financial_entries (
            id, entry_code, direction, category_code, accounting_class, description, counterparty_name,
            reference_type, competence_date, due_date,
            gross_amount_cents, paid_amount_cents, fee_estimated_cents, net_amount_cents, status, account_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,'manual',$8,$9,$10,$11,0,$10,$12,'acc-bank')`,
          [
            id,
            code,
            body.direction || 'payable',
            body.categoryCode || 'operational_expense',
            body.accountingClass || 'operating_expense',
            body.description,
            body.counterpartyName || 'Fornecedor / Operação RBS',
            body.competenceDate || today,
            body.dueDate || today,
            amountCents,
            body.paidImmediately ? amountCents : 0,
            body.paidImmediately ? 'paid' : 'pending',
          ]
        );
        return NextResponse.json({ success: true, id, code });
      }

      case 'create_promotion': {
        const id = `promo-${Date.now()}`;
        await db.query(
          `INSERT INTO promotions (
            id, code, name, promotion_type, discount_value, min_order_cents, min_quantity,
            status, min_margin_guard_pct
          ) VALUES ($1,UPPER($2),$3,$4,$5,$6,1,$7,$8)`,
          [
            id,
            body.code,
            body.name,
            body.promotionType || body.discountType || 'percentage',
            Number(body.discountValue || 10),
            Number(body.minOrderCents ?? Math.round(Number(body.minOrderBrl || 0) * 100)),
            body.status || 'active',
            Number(body.minMarginGuardPct || 18),
          ]
        );
        return NextResponse.json({ ok: true, success: true, id });
      }

      case 'create_banner': {
        const id = `ban-${Date.now()}`;
        await db.query(
          `INSERT INTO banners (
            id, title, subtitle, cta_label, cta_href, placement,
            desktop_image_url, mobile_image_url, focal_point_x, focal_point_y, sort_order, is_active
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,TRUE)`,
          [
            id,
            body.title,
            body.subtitle || '',
            body.ctaLabel || 'Explorar Coleção',
            body.ctaUrl || '/catalogo',
            body.placement || 'home_hero',
            body.desktopImageUrl || '/products/real/ambiente-sala-vaso-espiral.png',
            body.mobileImageUrl || '/products/real/vaso-espiral-cobre-mesa.png',
            Number(body.focalPointX ?? 50),
            Number(body.focalPointY ?? 50),
          ]
        );
        return NextResponse.json({ ok: true, success: true, id });
      }

      case 'update_partner_rates': {
        // Restricted strictly to Admin (neither Operator nor Partner can edit their own commission rates!)
        if (session.role !== 'admin') {
          return NextResponse.json(
            { error: 'Apenas o Administrador Geral da RBS pode alterar percentuais de comissão e cupom de parceiros.' },
            { status: 403 }
          );
        }
        await db.query(
          `UPDATE partners
           SET commission_rate_pct = $1,
               customer_discount_pct = $2,
               coupon_code = UPPER($3),
               partner_type = $4
           WHERE id = $5`,
          [
            Number(body.commissionRatePct || 15),
            Number(body.customerDiscountPct || 5),
            String(body.couponCode || 'PARCEIRO10'),
            String(body.partnerType || 'consignado_e_afiliado'),
            body.partnerId,
          ]
        );
        return NextResponse.json({ ok: true, success: true });
      }

      case 'create_partner': {
        if (session.role !== 'admin') {
          return NextResponse.json(
            { error: 'Apenas o Administrador Geral da RBS pode cadastrar novos parceiros.' },
            { status: 403 }
          );
        }
        const id = `prt-${Date.now()}`;
        const code = String(body.partnerCode || `PARC-${Math.floor(100 + Math.random() * 900)}`).toUpperCase();
        await db.query(
          `INSERT INTO partners (
            id, partner_code, name, business_name, document_cpf_cnpj, email, phone, city, state,
            partner_type, commission_rate_pct, coupon_code, customer_discount_pct, pix_key, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,UPPER($12),$13,$14,'active')`,
          [
            id,
            code,
            body.name,
            body.businessName || body.name,
            body.cnpjCpf || '00.000.000/0001-00',
            body.email || 'parceiro@exemplo.com.br',
            body.phone || '(21) 99999-0000',
            body.city || 'Rio de Janeiro',
            body.state || 'RJ',
            body.partnerType || 'consignado_e_recorrente',
            Number(body.commissionRatePct || 20),
            body.couponCode || code,
            Number(body.customerDiscountPct || 10),
            body.pixKey || body.email || 'pix@parceiro.com.br',
          ]
        );
        return NextResponse.json({ ok: true, success: true, id });
      }

      case 'record_consignment_movement': {
        const itemRows = await db.query<any>(
          `SELECT ci.*, cs.partner_id, cs.shipment_code, p.name AS product_name
           FROM consignment_items ci
           JOIN consignment_shipments cs ON cs.id = ci.shipment_id
           JOIN products p ON p.id = ci.product_id
           WHERE ci.id = $1`,
          [body.consignmentItemId]
        );
        const item = itemRows[0];
        if (!item) {
          return NextResponse.json({ error: 'Item consignado não encontrado.' }, { status: 404 });
        }
        const qty = Math.max(1, Number(body.qty || 1));
        const available = Number(item.dispatched_qty) - Number(item.sold_qty) - Number(item.returned_qty) - Number(item.damaged_qty || 0);
        if (qty > available) {
          return NextResponse.json(
            { error: `Saldo físico insuficiente em vitrine (${available} un disponíveis).` },
            { status: 400 }
          );
        }

        if (body.movementType === 'sale') {
          await db.query(
            `UPDATE consignment_items SET sold_qty = sold_qty + $1 WHERE id = $2`,
            [qty, item.id]
          );
          const grossCents = qty * Number(item.agreed_unit_price_cents);
          const commPct = Number(item.partner_commission_pct || 20);
          const commCents = Math.round(grossCents * (commPct / 100));
          const netRepasseCents = grossCents - commCents;
          const today = new Date().toISOString().slice(0, 10);
          const finId = `fin-csg-${Date.now()}`;

          await db.query(
            `INSERT INTO financial_entries (
              id, entry_code, direction, category_code, accounting_class, description, counterparty_name,
              reference_type, reference_id, competence_date, due_date,
              gross_amount_cents, paid_amount_cents, fee_estimated_cents, net_amount_cents, status, account_id
            ) VALUES ($1,$2,'receivable','consignment_settlement','gross_revenue',$3,'Parceiro Consignado','consignment',$4,$5,$5,$6,$6,0,$6,'paid','acc-bank')`,
            [
              finId,
              `CSG-${Math.floor(1000 + Math.random() * 9000)}`,
              `Acerto Venda Consignada (${qty}x ${item.product_name} — Remessa ${item.shipment_code})`,
              item.id,
              today,
              netRepasseCents,
            ]
          );

          await db.query(
            `INSERT INTO partner_commissions (
              id, partner_id, origin_type, calculation_base_cents, commission_rate_pct, commission_amount_cents, status, financial_entry_id
            ) VALUES ($1,$2,'consignment_sale',$3,$4,$5,'paid',$6)`,
            [`pcom-${Date.now()}`, item.partner_id, grossCents, commPct, commCents, finId]
          );
        } else {
          await db.query(
            `UPDATE consignment_items SET returned_qty = returned_qty + $1 WHERE id = $2`,
            [qty, item.id]
          );
        }

        return NextResponse.json({ ok: true, success: true });
      }

      case 'dispatch_consignment_or_recurring': {
        const partnerRows = await db.query<any>(`SELECT * FROM partners WHERE id = $1`, [body.partnerId]);
        const productRows = await db.query<any>(`SELECT * FROM products WHERE id = $1`, [body.productId]);
        const partner = partnerRows[0];
        const product = productRows[0];
        if (!partner || !product) {
          return NextResponse.json({ error: 'Parceiro ou produto inválido.' }, { status: 400 });
        }
        const qty = Math.max(1, Number(body.quantity || 5));
        const discountPct = Number(body.discountPct ?? partner.commission_rate_pct ?? 20);
        const agreedUnitCents = Math.round(Number(product.price_cents) * (1 - discountPct / 100));

        if (body.operationMode === 'recurring_purchase') {
          const totalCents = qty * agreedUnitCents;
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
              `Compra Recorrente Parceiro (${qty}x ${product.name} com ${discountPct}% desc. revenda)`,
              partner.name,
              partner.id,
              today,
              totalCents,
            ]
          );
          return NextResponse.json({ ok: true, success: true, mode: 'recurring_purchase', totalCents });
        } else {
          const shipRows = await db.query<any>(
            `SELECT id FROM consignment_shipments WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [partner.id]
          );
          let shipmentId = shipRows[0]?.id;
          if (!shipmentId) {
            shipmentId = `csg-${Date.now()}`;
            await db.query(
              `INSERT INTO consignment_shipments (id, shipment_code, partner_id, location_id, status, notes)
               VALUES ($1,$2,$3,'loc-consig-01','active','Remessa aberta pelo Painel Administrativo')`,
              [shipmentId, `REM-2026-${Math.floor(100 + Math.random() * 900)}`, partner.id]
            );
          }
          await db.query(
            `INSERT INTO consignment_items (
              id, shipment_id, product_id, dispatched_qty, sold_qty, returned_qty, damaged_qty,
              agreed_unit_price_cents, partner_commission_pct
            ) VALUES ($1,$2,$3,$4,0,0,0,$5,$6)`,
            [
              `ci-${Date.now()}`,
              shipmentId,
              product.id,
              qty,
              Number(product.price_cents),
              discountPct,
            ]
          );
          return NextResponse.json({ ok: true, success: true, mode: 'consignment' });
        }
      }

      case 'update_banner': {
        await db.query(
          `UPDATE banners
           SET title = COALESCE($1, title),
               subtitle = COALESCE($2, subtitle),
               focal_point_x = COALESCE($3, focal_point_x),
               focal_point_y = COALESCE($4, focal_point_y),
               is_active = COALESCE($5, is_active)
           WHERE id = $6`,
          [
            body.title || null,
            body.subtitle || null,
            body.focalPointX !== undefined ? Number(body.focalPointX) : null,
            body.focalPointY !== undefined ? Number(body.focalPointY) : null,
            body.isActive !== undefined ? Boolean(body.isActive) : null,
            body.bannerId,
          ]
        );
        return NextResponse.json({ success: true });
      }

      case 'create_product': {
        const id = `prod-${Date.now()}`;
        const slug = String(body.name || 'novo-produto-3d')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const priceCents = Math.round(Number(body.priceBrl || 99.9) * 100);
        const costCents = Math.round(Number(body.costBrl || 32) * 100);
        const stockQty = Math.max(0, Number(body.stockQty ?? 10));

        await db.query(
          `INSERT INTO products (
            id, sku, slug, name, subtitle, short_description, description,
            category_id, material, finish, availability_type, lead_time_days,
            dimensions_mm, weight_grams, filament_grams_per_unit, support_purge_grams_per_unit,
            print_time_minutes, price_cents, cost_cents, stock_qty,
            care_instructions, layer_notice, model_3d_glb_url, images_json, featured
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'/models/vaso-voronoi-rbs.glb',$23,FALSE
          )`,
          [
            id,
            body.sku || `RBS-3D-${Math.floor(100 + Math.random() * 900)}`,
            `${slug}-${Math.floor(10 + Math.random() * 89)}`,
            body.name,
            body.subtitle || 'Peça impressa em 3D com acabamento de estúdio',
            body.shortDescription || body.name,
            body.description || body.shortDescription || body.name,
            body.categoryId || 'cat-decor',
            body.material || 'PLA',
            body.finish || 'Fosco Camadas Suaves',
            body.availabilityType || 'ready_stock',
            Number(body.leadTimeDays || 2),
            body.dimensionsMm || '120 × 120 × 180 mm',
            Number(body.weightGrams || 200),
            Number(body.filamentGrams || 180),
            Number(body.supportGrams || 20),
            Number(body.printMinutes || 220),
            priceCents,
            costCents,
            stockQty,
            'Uso interno. Limpar com pano de microfibra levemente úmido. Não expor acima de 55 °C.',
            'Peça produzida por manufatura aditiva (impressão 3D camada a camada).',
            JSON.stringify(body.images || []),
          ]
        );

        await db.query(
          `INSERT INTO inventory_balances (id, product_id, variation_id, location_id, on_hand_qty, reserved_qty, min_stock_qty)
           VALUES ($1, $2, NULL, 'loc-expedition', $3, 0, 2)`,
          [`bal-exp-${id}`, id, stockQty]
        );

        return NextResponse.json({ success: true, productId: id });
      }

      default:
        return NextResponse.json({ error: 'Ação administrativa desconhecida.' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro na operação administrativa.' },
      { status: 500 }
    );
  }
}
