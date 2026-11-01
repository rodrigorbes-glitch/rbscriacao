import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { calculate3DPricing } from '@/lib/pricing';
import { validateSessionFromCookie, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();

    const calc = calculate3DPricing({
      mode: body.mode || 'advanced',
      directUnitCostOverrideBrl:
        body.directUnitCostOverrideBrl !== undefined && body.directUnitCostOverrideBrl !== ''
          ? Number(body.directUnitCostOverrideBrl)
          : null,
      partGrams: Number(body.partGrams ?? 150),
      supportPurgeGrams: Number(body.supportPurgeGrams ?? 15),
      filamentCostPerKgBrl: Number(body.filamentCostPerKgBrl ?? 110),
      printMinutes: Number(body.printMinutes ?? 180),
      postProcessMinutes: Number(body.postProcessMinutes ?? 15),
      kwhRateBrl: Number(body.kwhRateBrl ?? 0.95),
      printerPowerWatts: Number(body.printerPowerWatts ?? 350),
      machineValueBrl: Number(body.machineValueBrl ?? 8500),
      machineLifespanHours: Number(body.machineLifespanHours ?? 6000),
      maintenancePerHourBrl: Number(body.maintenancePerHourBrl ?? 0.8),
      operatorHourRateBrl: Number(body.operatorHourRateBrl ?? 35),
      packagingBrl: Number(body.packagingBrl ?? 3.5),
      extraInputsBrl: Number(body.extraInputsBrl ?? 0),
      failureRatePct: Number(body.failureRatePct ?? 5),
      fixedFeeBrl: Number(body.fixedFeeBrl ?? 2),
      variableFeePct: Number(body.variableFeePct ?? 10),
      targetMarginPct: Number(body.targetMarginPct ?? 25),
      lotQuantity: Number(body.lotQuantity ?? 1),
      pixDiscountPct: Number(body.pixDiscountPct ?? 5),
    });

    if (!calc.valid) {
      return NextResponse.json(calc, { status: 400 });
    }

    // Check if client is authenticated admin/operator
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionFromCookie(db, token);
    const isStaff = session && (session.role === 'admin' || session.role === 'operator');

    // Persisting simulation or applying price to catalog REQUIRES authenticated ADMIN
    if (body.saveSimulation || body.applyToProduct) {
      if (!session) {
        return NextResponse.json(
          { error: 'Autenticação necessária para salvar simulações ou alterar preços do catálogo.' },
          { status: 401 }
        );
      }

      if (session.role !== 'admin') {
        return NextResponse.json(
          { error: 'Apenas administradores da RBS podem gravar simulações ou alterar preços no catálogo.' },
          { status: 403 }
        );
      }

      const simId = `sim-${Date.now()}`;
      await db.query(
        `INSERT INTO pricing_simulations (
          id, product_id, simulation_name, channel, lot_quantity,
          part_grams, support_purge_grams, filament_cost_per_kg_cents, print_minutes, post_process_minutes,
          packaging_cents, extra_inputs_cents, energy_cost_cents, depreciation_cost_cents, labor_cost_cents,
          failure_rate_pct, unit_direct_cost_cents, fixed_fee_cents, variable_fee_pct, target_margin_pct,
          suggested_unit_price_cents, suggested_lot_price_cents, net_unit_profit_cents, real_margin_pct,
          applied_to_product, applied_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
        [
          simId,
          body.productId || null,
          body.simulationName || `Simulação 3D (${new Date().toLocaleDateString('pt-BR')})`,
          body.channel || 'loja_propria_cartao',
          Number(body.lotQuantity || 1),
          Number(body.partGrams || 0),
          Number(body.supportPurgeGrams || 0),
          Math.round(Number(body.filamentCostPerKgBrl || 110) * 100),
          Number(body.printMinutes || 0),
          Number(body.postProcessMinutes || 0),
          Math.round(Number(body.packagingBrl || 0) * 100),
          Math.round(Number(body.extraInputsBrl || 0) * 100),
          Math.round(calc.energyCostBrl * 100),
          Math.round(calc.depreciationMaintenanceBrl * 100),
          Math.round(calc.laborCostBrl * 100),
          Number(body.failureRatePct || 0),
          calc.unitDirectCostCents,
          Math.round(calc.fixedFeeBrl * 100),
          calc.variableFeePct,
          calc.targetMarginPct,
          calc.suggestedUnitPriceCents,
          calc.suggestedLotPriceCents,
          calc.netUnitProfitCents,
          calc.realMarginPct,
          Boolean(body.applyToProduct),
          body.applyToProduct ? new Date().toISOString() : null,
        ]
      );

      if (body.applyToProduct && body.productId) {
        const beforeProd = await db.query<{ price_cents: number; cost_cents: number }>(
          'SELECT price_cents, cost_cents FROM products WHERE id = $1 LIMIT 1',
          [body.productId]
        );
        await db.query(
          `UPDATE products
           SET price_cents = $1,
               cost_cents = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [calc.suggestedUnitPriceCents, calc.unitDirectCostCents, body.productId]
        );

        await db.query(
          `INSERT INTO audit_logs (
            id, actor_user_id, actor_name, actor_role, action, entity_type, entity_id, before_json, after_json
          ) VALUES ($1,$2,$3,$4,'apply_pricing_simulation','product',$5,$6,$7)`,
          [
            `aud-${Date.now()}`,
            session.userId,
            session.name,
            session.role,
            body.productId,
            JSON.stringify(beforeProd[0] || {}),
            JSON.stringify({
              price_cents: calc.suggestedUnitPriceCents,
              cost_cents: calc.unitDirectCostCents,
              real_margin_pct: calc.realMarginPct,
            }),
          ]
        );
      }
    }

    // For public requests (unauthenticated visitors), sanitize response to NEVER leak internal costs, margins or markups!
    if (!isStaff) {
      return NextResponse.json({
        valid: true,
        suggestedUnitPriceBrl: calc.suggestedUnitPriceBrl,
        suggestedLotPriceBrl: calc.suggestedLotPriceBrl,
        pixPriceBrl: calc.pixPriceBrl,
        progressiveLots: calc.progressiveLots.map((l) => ({
          quantity: l.quantity,
          unitPriceBrl: l.unitPriceBrl,
          totalLotPriceBrl: l.totalLotPriceBrl,
        })),
      });
    }

    return NextResponse.json(calc);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao executar simulação de preço.' },
      { status: 400 }
    );
  }
}
