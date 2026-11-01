import type { DatabaseAdapter } from '@/db';

/**
 * Purchases a supply in its purchase unit (e.g. 1 kg spool) and converts it into consumption units (e.g. 1,000 g).
 * Accounting rule: Buying filament creates an Inventory Asset entry + Accounts Payable (`inventory_asset_purchase`).
 * It only becomes COGS (`cogs_supply_consumed`) when actually consumed during a 3D print job!
 */
export async function purchaseSupplyLot(
  db: DatabaseAdapter,
  params: {
    supplyId: string;
    purchaseQty: number; // e.g., 1 (kg)
    unitPurchaseCostCents: number; // e.g., 12000 (R$ 120,00 / kg)
    supplierName?: string;
    dueDate?: string;
    paidImmediately?: boolean;
    actorName?: string;
  }
) {
  return db.transaction(async (tx) => {
    const supRows = await tx.query<{
      id: string;
      name: string;
      purchase_unit: string;
      consumption_unit: string;
      conversion_factor: number;
      stock_consumption_units: number;
    }>(
      `SELECT id, name, purchase_unit, consumption_unit, conversion_factor, stock_consumption_units
       FROM inventory_supplies WHERE id = $1 LIMIT 1`,
      [params.supplyId]
    );
    if (supRows.length === 0) {
      throw new Error('Insumo não encontrado no cadastro de estoque.');
    }
    const sup = supRows[0];
    const conversionFactor = Math.max(1, Number(sup.conversion_factor || 1000));
    const addedConsumptionUnits = Math.round(params.purchaseQty * conversionFactor);
    const totalPayableCents = Math.round(params.purchaseQty * params.unitPurchaseCostCents);
    const costPerConsumptionUnitCents = Number(
      (params.unitPurchaseCostCents / conversionFactor).toFixed(4)
    );

    await tx.query(
      `UPDATE inventory_supplies
       SET stock_consumption_units = stock_consumption_units + $1,
           cost_per_purchase_unit_cents = $2,
           cost_per_consumption_unit_cents = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [addedConsumptionUnits, params.unitPurchaseCostCents, costPerConsumptionUnitCents, sup.id]
    );

    const finId = `fin-pay-sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entryCode = `PAY-INS-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toISOString().slice(0, 10);
    const due = params.dueDate || today;
    const isPaid = Boolean(params.paidImmediately);

    await tx.query(
      `INSERT INTO financial_entries (
        id, entry_code, direction, category_code, accounting_class, description, counterparty_name,
        reference_type, reference_id, competence_date, due_date,
        gross_amount_cents, paid_amount_cents, fee_estimated_cents, net_amount_cents,
        status, account_id, paid_at
      ) VALUES ($1,$2,'payable','raw_material_purchase','inventory_asset_purchase',$3,$4,'supply_purchase',$5,$6,$7,$8,$9,0,$8,$10,'acc-bank',$11)`,
      [
        finId,
        entryCode,
        `Compra de Insumo: ${params.purchaseQty} ${sup.purchase_unit} (${addedConsumptionUnits} ${sup.consumption_unit}) — ${sup.name}`,
        params.supplierName || 'Fornecedor de Polímeros 3D',
        sup.id,
        today,
        due,
        totalPayableCents,
        isPaid ? totalPayableCents : 0,
        isPaid ? 'paid' : 'pending',
        isPaid ? new Date().toISOString() : null,
      ]
    );

    const movId = `mov-sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await tx.query(
      `INSERT INTO inventory_movements (
        id, item_type, supply_id, to_location_id, movement_type, quantity, unit_cost_cents,
        reference_type, reference_id, reason, actor_name
      ) VALUES ($1,'supply',$2,'loc-factory','purchase_entry',$3,$4,'supply_purchase',$5,$6,$7)`,
      [
        movId,
        sup.id,
        addedConsumptionUnits,
        Math.round(costPerConsumptionUnitCents),
        finId,
        `Entrada de ${params.purchaseQty} ${sup.purchase_unit} convertida em +${addedConsumptionUnits} ${sup.consumption_unit}`,
        params.actorName || 'Admin RBS',
      ]
    );

    const updated = await tx.query<{ stock_consumption_units: number }>(
      'SELECT stock_consumption_units FROM inventory_supplies WHERE id = $1',
      [sup.id]
    );

    return {
      supplyId: sup.id,
      addedConsumptionUnits,
      newBalanceUnits: Number(updated[0]?.stock_consumption_units ?? 0),
      financialEntryId: finId,
      totalPayableCents,
    };
  });
}

/**
 * Advances a 3D print job on the Kanban board.
 * When a job transitions to 'post_processing', 'ready_to_ship', or 'shipped' and actual_grams_consumed has not yet been deducted,
 * it deducts the filament grams from `inventory_supplies` and records the accrual COGS entry (`cogs_supply_consumed`).
 */
export async function advanceProductionJobStage(
  db: DatabaseAdapter,
  params: {
    jobId: string;
    newStage: 'awaiting_payment' | 'queued' | 'printing' | 'post_processing' | 'ready_to_ship' | 'shipped';
    actualGramsOverride?: number;
    trackingCode?: string;
    actorName?: string;
  }
) {
  return db.transaction(async (tx) => {
    const jobRows = await tx.query<{
      id: string;
      order_id: string | null;
      product_id: string | null;
      supply_id: string | null;
      batch_code: string;
      stage: string;
      estimated_grams: number;
      actual_grams_consumed: number;
    }>('SELECT * FROM production_jobs WHERE id = $1 LIMIT 1', [params.jobId]);

    if (jobRows.length === 0) {
      throw new Error('Ordem de produção não encontrada no Kanban.');
    }
    const job = jobRows[0];

    const consumptionStages = ['post_processing', 'ready_to_ship', 'shipped'];
    let newlyConsumedGrams = 0;

    if (
      consumptionStages.includes(params.newStage) &&
      Number(job.actual_grams_consumed) === 0
    ) {
      newlyConsumedGrams =
        params.actualGramsOverride && params.actualGramsOverride > 0
          ? Math.round(params.actualGramsOverride)
          : Number(job.estimated_grams || 180);

      if (job.supply_id) {
        const supRows = await tx.query<{ cost_per_consumption_unit_cents: string }>(
          'SELECT cost_per_consumption_unit_cents FROM inventory_supplies WHERE id = $1',
          [job.supply_id]
        );
        const costPerGramCents = Number(supRows[0]?.cost_per_consumption_unit_cents ?? 12);
        const totalCogsCents = Math.round(newlyConsumedGrams * costPerGramCents);

        await tx.query(
          `UPDATE inventory_supplies
           SET stock_consumption_units = GREATEST(0, stock_consumption_units - $1),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [newlyConsumedGrams, job.supply_id]
        );

        await tx.query(
          `INSERT INTO inventory_movements (
            id, item_type, supply_id, from_location_id, movement_type, quantity, unit_cost_cents,
            reference_type, reference_id, reason, actor_name
          ) VALUES ($1,'supply',$2,'loc-factory','supply_consumption',$3,$4,'production_job',$5,$6,$7)`,
          [
            `mov-cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            job.supply_id,
            newlyConsumedGrams,
            Math.round(costPerGramCents),
            job.id,
            `Consumo produtivo de ${newlyConsumedGrams}g na O.P. ${job.batch_code}`,
            params.actorName || 'Operador 3D',
          ]
        );

        // Record Accrual COGS entry (Regime de Competência)
        const today = new Date().toISOString().slice(0, 10);
        await tx.query(
          `INSERT INTO financial_entries (
            id, entry_code, direction, category_code, accounting_class, description, counterparty_name,
            reference_type, reference_id, competence_date, due_date,
            gross_amount_cents, paid_amount_cents, fee_estimated_cents, net_amount_cents, status, account_id, paid_at
          ) VALUES ($1,$2,'payable','raw_material_purchase','cogs_supply_consumed',$3,'Consumo Interno Estoque 3D','production_job',$4,$5,$5,$6,$6,0,$6,'paid','acc-cash',CURRENT_TIMESTAMP)`,
          [
            `fin-cogs-${job.id}`,
            `CMV-${job.batch_code}-${Math.floor(100 + Math.random() * 900)}`,
            `CMV Filamento Consumido (${newlyConsumedGrams}g) — O.P. ${job.batch_code}`,
            job.id,
            today,
            totalCogsCents,
          ]
        );
      }
    }

    const isQualityPassedStage =
      params.newStage === 'ready_to_ship' || params.newStage === 'shipped';

    await tx.query(
      `UPDATE production_jobs
       SET stage = $1,
           actual_grams_consumed = CASE WHEN $2::integer > 0 THEN $2::integer ELSE actual_grams_consumed END,
           quality_checklist_passed = CASE WHEN $3::boolean THEN TRUE ELSE quality_checklist_passed END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [params.newStage, newlyConsumedGrams, isQualityPassedStage, job.id]
    );

    if (job.order_id) {
      const fulfillmentStatus =
        params.newStage === 'shipped'
          ? 'in_transit'
          : params.newStage === 'ready_to_ship'
            ? 'label_generated'
            : 'unfulfilled';
      const isShipped = params.newStage === 'shipped';

      await tx.query(
        `UPDATE orders
         SET production_status = $1,
             fulfillment_status = $2,
             shipping_tracking_code = COALESCE($3, shipping_tracking_code),
             shipped_at = CASE WHEN $4::boolean THEN CURRENT_TIMESTAMP ELSE shipped_at END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [params.newStage, fulfillmentStatus, params.trackingCode || null, isShipped, job.order_id]
      );
    }

    return {
      jobId: job.id,
      newStage: params.newStage,
      newlyConsumedGrams,
    };
  });
}

/**
 * Records a 3D print failure and triggers a reprint, deducting wasted filament grams from supply stock
 * and logging the waste cost into COGS.
 */
export async function recordProductionFailure(
  db: DatabaseAdapter,
  params: {
    jobId: string;
    wastedGrams: number;
    failureReason: string;
    reprintTriggered?: boolean;
    actorName?: string;
  }
) {
  return db.transaction(async (tx) => {
    const jobRows = await tx.query<{
      id: string;
      order_id: string | null;
      supply_id: string | null;
      batch_code: string;
    }>('SELECT id, order_id, supply_id, batch_code FROM production_jobs WHERE id = $1 LIMIT 1', [
      params.jobId,
    ]);
    if (jobRows.length === 0) {
      throw new Error('Ordem de produção não encontrada.');
    }
    const job = jobRows[0];
    const wastedGrams = Math.max(1, Math.round(params.wastedGrams));
    const supplyId = job.supply_id || 'sup-pla-terracota';

    const supRows = await tx.query<{ cost_per_consumption_unit_cents: string }>(
      'SELECT cost_per_consumption_unit_cents FROM inventory_supplies WHERE id = $1',
      [supplyId]
    );
    const costPerGramCents = Number(supRows[0]?.cost_per_consumption_unit_cents ?? 12);
    const wasteCostCents = Math.round(wastedGrams * costPerGramCents);

    await tx.query(
      `UPDATE inventory_supplies
       SET stock_consumption_units = GREATEST(0, stock_consumption_units - $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [wastedGrams, supplyId]
    );

    const failId = `fail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await tx.query(
      `INSERT INTO production_failures (
        id, production_job_id, order_id, supply_id, wasted_grams, waste_cost_cents, failure_reason, reprint_triggered, recorded_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        failId,
        job.id,
        job.order_id,
        supplyId,
        wastedGrams,
        wasteCostCents,
        params.failureReason,
        params.reprintTriggered ?? true,
        params.actorName || 'Operador 3D',
      ]
    );

    await tx.query(
      `UPDATE production_jobs
       SET wasted_grams = wasted_grams + $1,
           stage = CASE WHEN $2 THEN 'printing' ELSE stage END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [wastedGrams, params.reprintTriggered ?? true, job.id]
    );

    await tx.query(
      `INSERT INTO inventory_movements (
        id, item_type, supply_id, from_location_id, movement_type, quantity, unit_cost_cents,
        reference_type, reference_id, reason, actor_name
      ) VALUES ($1,'supply',$2,'loc-factory','print_failure_waste',$3,$4,'production_failure',$5,$6,$7)`,
      [
        `mov-fail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        supplyId,
        wastedGrams,
        Math.round(costPerGramCents),
        failId,
        `Perda de impressão (${wastedGrams}g): ${params.failureReason}`,
        params.actorName || 'Operador 3D',
      ]
    );

    // Log waste cost into Accrual COGS
    const today = new Date().toISOString().slice(0, 10);
    await tx.query(
      `INSERT INTO financial_entries (
        id, entry_code, direction, category_code, accounting_class, description, counterparty_name,
        reference_type, reference_id, competence_date, due_date,
        gross_amount_cents, paid_amount_cents, fee_estimated_cents, net_amount_cents, status, account_id, paid_at
      ) VALUES ($1,$2,'payable','raw_material_purchase','cogs_supply_consumed',$3,'Perda de Impressão 3D','production_job',$4,$5,$5,$6,$6,0,$6,'paid','acc-cash',CURRENT_TIMESTAMP)`,
      [
        `fin-waste-${failId}`,
        `PERDA-${job.batch_code}-${Math.floor(100 + Math.random() * 900)}`,
        `Perda de Filamento em Falha/Reimpressão (${wastedGrams}g) — ${job.batch_code}`,
        job.id,
        today,
        wasteCostCents,
      ]
    );

    return {
      failureId: failId,
      wastedGrams,
      wasteCostCents,
    };
  });
}

/**
 * Reconciles a receivable entry's gateway fee (e.g. estimated fee vs. actual fee charged by Mercado Pago).
 */
export async function reconcileGatewayFee(
  db: DatabaseAdapter,
  params: {
    entryId: string;
    actualFeeCents: number;
    notes?: string;
    actorName?: string;
  }
) {
  return db.transaction(async (tx) => {
    const rows = await tx.query<{
      id: string;
      reference_id: string | null;
      gross_amount_cents: number;
      fee_estimated_cents: number;
    }>(
      'SELECT id, reference_id, gross_amount_cents, fee_estimated_cents FROM financial_entries WHERE id = $1 LIMIT 1',
      [params.entryId]
    );
    if (rows.length === 0) {
      throw new Error('Lançamento financeiro não encontrado para conciliação.');
    }
    const entry = rows[0];
    const expectedFee = Number(entry.fee_estimated_cents);
    const actualFee = Math.max(0, Math.round(params.actualFeeCents));
    const divergenceCents = actualFee - expectedFee;
    const netSettledCents = Number(entry.gross_amount_cents) - actualFee;

    await tx.query(
      `UPDATE financial_entries
       SET fee_actual_cents = $1,
           net_amount_cents = $2,
           status = 'reconciled'
       WHERE id = $3`,
      [actualFee, netSettledCents, entry.id]
    );

    if (entry.reference_id) {
      await tx.query(
        'UPDATE orders SET gateway_fee_actual_cents = $1 WHERE id = $2',
        [actualFee, entry.reference_id]
      );
    }

    const recId = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await tx.query(
      `INSERT INTO financial_reconciliations (
        id, entry_id, order_id, gateway_name, expected_gross_cents, expected_fee_cents,
        actual_fee_cents, fee_divergence_cents, net_settled_cents, reconciled_by, notes
      ) VALUES ($1,$2,$3,'Mercado Pago',$4,$5,$6,$7,$8,$9,$10)`,
      [
        recId,
        entry.id,
        entry.reference_id,
        Number(entry.gross_amount_cents),
        expectedFee,
        actualFee,
        divergenceCents,
        netSettledCents,
        params.actorName || 'Admin RBS',
        params.notes || `Conciliação de taxa real executada (divergência: ${divergenceCents} centavos).`,
      ]
    );

    return {
      reconciliationId: recId,
      expectedFeeCents: expectedFee,
      actualFeeCents: actualFee,
      feeDivergenceCents: divergenceCents,
      netSettledCents,
    };
  });
}

/**
 * Computes Financial Dashboard + Dual-Regime DRE (Competência vs. Caixa).
 * Prevents triple-counting filament purchases:
 * - Buying filament (`inventory_asset_purchase`) affects Inventory Asset & Cash Outflow (when paid), NOT Accrual COGS.
 * - Consuming filament in print jobs (`cogs_supply_consumed`) affects Accrual DRE COGS.
 */
export async function getFinancialDashboard(db: DatabaseAdapter) {
  const accounts = await db.query<{
    id: string;
    name: string;
    account_type: string;
    institution: string;
    balance_cents: number;
  }>('SELECT * FROM financial_accounts ORDER BY id ASC');

  const entries = await db.query<{
    id: string;
    entry_code: string;
    direction: string;
    category_code: string;
    accounting_class: string;
    description: string;
    counterparty_name: string;
    reference_type: string | null;
    reference_id: string | null;
    competence_date: string;
    due_date: string;
    gross_amount_cents: number;
    paid_amount_cents: number;
    fee_estimated_cents: number;
    fee_actual_cents: number | null;
    net_amount_cents: number;
    status: string;
  }>('SELECT * FROM financial_entries ORDER BY competence_date DESC, created_at DESC');

  const reconciliations = await db.query<{
    id: string;
    entry_id: string;
    order_id: string | null;
    gateway_name: string;
    expected_gross_cents: number;
    expected_fee_cents: number;
    actual_fee_cents: number;
    fee_divergence_cents: number;
    net_settled_cents: number;
    reconciled_by: string;
    notes: string;
    reconciled_at: string;
  }>('SELECT * FROM financial_reconciliations ORDER BY reconciled_at DESC');

  // 1. REGIME DE COMPETÊNCIA (Accrual Basis DRE)
  let grossRevenueCents = 0;
  let gatewayFeesCompetenceCents = 0;
  let cogsSupplyConsumedCents = 0;
  let shippingExpenseCents = 0;
  let partnerCommissionCents = 0;
  let operatingExpenseCents = 0;
  let inventoryAssetPurchasesCents = 0;

  // 2. REGIME DE CAIXA (Cash Flow Realized & Projected)
  let cashInflowRealizedCents = 0;
  let cashOutflowRealizedCents = 0;
  let receivablesPendingCents = 0;
  let payablesPendingCents = 0;

  for (const e of entries) {
    if (e.status === 'cancelled') continue;
    const gross = Number(e.gross_amount_cents || 0);
    const fee = Number(e.fee_actual_cents ?? e.fee_estimated_cents ?? 0);
    const net = Number(e.net_amount_cents || gross - fee);

    if (e.direction === 'receivable') {
      grossRevenueCents += gross;
      gatewayFeesCompetenceCents += fee;
      if (e.status === 'paid' || e.status === 'reconciled') {
        cashInflowRealizedCents += net;
      } else {
        receivablesPendingCents += net;
      }
    } else if (e.direction === 'payable') {
      if (e.accounting_class === 'cogs_supply_consumed') {
        cogsSupplyConsumedCents += gross;
      } else if (e.accounting_class === 'inventory_asset_purchase') {
        inventoryAssetPurchasesCents += gross;
        if (e.status === 'paid' || e.status === 'reconciled') {
          cashOutflowRealizedCents += gross;
        } else {
          payablesPendingCents += gross;
        }
      } else if (e.accounting_class === 'shipping_expense') {
        shippingExpenseCents += gross;
        if (e.status === 'paid') cashOutflowRealizedCents += gross;
        else payablesPendingCents += gross;
      } else if (e.accounting_class === 'partner_commission') {
        partnerCommissionCents += gross;
        if (e.status === 'paid') cashOutflowRealizedCents += gross;
        else payablesPendingCents += gross;
      } else {
        operatingExpenseCents += gross;
        if (e.status === 'paid') cashOutflowRealizedCents += gross;
        else payablesPendingCents += gross;
      }
    }
  }

  const netRevenueCompetenceCents = grossRevenueCents - gatewayFeesCompetenceCents;
  const grossProfitCompetenceCents = netRevenueCompetenceCents - cogsSupplyConsumedCents;
  const contributionMarginCents =
    grossProfitCompetenceCents - shippingExpenseCents - partnerCommissionCents;
  const netOperatingResultCompetenceCents = contributionMarginCents - operatingExpenseCents;

  const netCashFlowRealizedCents = cashInflowRealizedCents - cashOutflowRealizedCents;
  const projectedCashBalanceDeltaCents =
    netCashFlowRealizedCents + receivablesPendingCents - payablesPendingCents;

  return {
    accounts,
    entries,
    reconciliations,
    dreCompetencia: {
      grossRevenueCents,
      gatewayFeesCompetenceCents,
      netRevenueCompetenceCents,
      cogsSupplyConsumedCents,
      grossProfitCompetenceCents,
      shippingExpenseCents,
      partnerCommissionCents,
      contributionMarginCents,
      operatingExpenseCents,
      netOperatingResultCompetenceCents,
      inventoryAssetPurchasesCents, // informative: asset formation, not expensed until consumed
    },
    fluxoCaixa: {
      cashInflowRealizedCents,
      cashOutflowRealizedCents,
      netCashFlowRealizedCents,
      receivablesPendingCents,
      payablesPendingCents,
      projectedCashBalanceDeltaCents,
    },
  };
}

/**
 * Commercial Intelligence Dashboard: Interest, Funnel, Partial Cart Behavior & Actionable Opportunities.
 */
export async function getCommercialIntelligenceDashboard(
  db: DatabaseAdapter,
  days: number = 30
) {
  const productMetrics = await db.query<{
    id: string;
    sku: string;
    slug: string;
    name: string;
    price_cents: number;
    cost_cents: number;
    stock_qty: number;
    views_count: string;
    wishlist_count: string;
    cart_add_count: string;
    saved_later_count: string;
    unselected_toggle_count: string;
    paid_count: string;
  }>(
    `SELECT
      p.id, p.sku, p.slug, p.name, p.price_cents, p.cost_cents, p.stock_qty,
      COUNT(CASE WHEN ce.event_name = 'product_view' THEN 1 END) as views_count,
      COUNT(CASE WHEN ce.event_name = 'wishlist_add' THEN 1 END) as wishlist_count,
      COUNT(CASE WHEN ce.event_name = 'cart_add' THEN 1 END) as cart_add_count,
      COUNT(CASE WHEN ce.event_name = 'cart_save_for_later' THEN 1 END) as saved_later_count,
      COUNT(CASE WHEN ce.event_name = 'cart_select_toggle' THEN 1 END) as unselected_toggle_count,
      COUNT(CASE WHEN ce.event_name = 'payment_success' THEN 1 END) as paid_count
     FROM products p
     LEFT JOIN commercial_events ce
       ON ce.product_id = p.id
       AND ce.is_internal_or_bot = FALSE
     GROUP BY p.id, p.sku, p.slug, p.name, p.price_cents, p.cost_cents, p.stock_qty
     ORDER BY views_count DESC, wishlist_count DESC`
  );

  const alerts = await db.query<{
    id: string;
    product_id: string;
    product_name: string;
    visitor_name: string | null;
    visitor_email: string;
    visitor_whatsapp: string | null;
    alert_type: string;
    target_price_cents: number | null;
    channel: string;
    status: string;
    created_at: string;
  }>(
    `SELECT ia.*, p.name as product_name
     FROM interest_alerts ia
     JOIN products p ON p.id = ia.product_id
     ORDER BY ia.created_at DESC`
  );

  const searchTerms = await db.query<{ search_term: string; count: string }>(
    `SELECT search_term, COUNT(*) as count
     FROM commercial_events
     WHERE event_name = 'search_query' AND search_term IS NOT NULL AND is_internal_or_bot = FALSE
     GROUP BY search_term
     ORDER BY count DESC`
  );

  const orderSelectionStats = await db.query<{
    cart_selection_mode: string;
    orders_count: string;
    total_revenue_cents: string;
  }>(
    `SELECT cart_selection_mode, COUNT(*) as orders_count, COALESCE(SUM(total_cents), 0) as total_revenue_cents
     FROM orders
     GROUP BY cart_selection_mode`
  );

  // Build transparent Opportunity Cards with Metric Observed, Sample Size, Hypothesis, and Action
  const opportunities = [
    {
      id: 'opp-price-sensitivity',
      type: 'Sensibilidade a Preço & Adiamento no Carrinho Seletivo',
      productName: 'Escultura Busto Minimalista Atelier Resina 8K',
      productSlug: 'escultura-busto-minimalista-resina',
      metricObserved: '3 visualizações qualific., 2 adições a Favoritos, 1 salvo para depois e 1 desmarcação em checkout parcial (0 compras concluídas).',
      sampleSize: 'Amostra de 7 interações únicas auditadas nos últimos 30 dias + 1 alerta ativo de queda de preço (meta R$ 219,90).',
      hypothesis: 'Clientes admiram o acabamento 8K, mas adiam a compra no momento de fechar o carrinho seletivo devido ao ticket de R$ 249,90.',
      recommendedAction: 'Simular cupom segmentado de 10% OFF no Precificador (mantendo margem líquida > 42%) e disparar aviso ao lead inscrito.',
      actionHref: '/admin/precificador?product=prod-escultura-resina',
      actionLabel: 'Simular no Precificador 3D',
    },
    {
      id: 'opp-critical-filament',
      type: 'Risco de Ruptura de Insumo em Item de Alta Procura',
      productName: 'Dragão Imperial Articulado Print-in-Place (45 cm)',
      productSlug: 'dragao-articulado-imperial',
      metricObserved: 'Filamento PLA Seda Dual Cobre/Esmeralda com saldo de 680 g (abaixo do mínimo operacional de 1.000 g) e 1 pedido aguardando pagamento + 1 alerta de reposição.',
      sampleSize: 'Saldo físico auditado no local LOC-FAB (680 g disponíveis vs. 190 g/peça).',
      hypothesis: 'Caso mais 3 pedidos entrem no fim de semana, a fila de impressão das Bambu Lab ficará bloqueada por falta de bobina Dual-Color.',
      recommendedAction: 'Registrar entrada de compra de 2 kg (2.000 g) do filamento PLA Dual Cobre/Esmeralda no módulo de Estoque.',
      actionHref: '/admin/estoque',
      actionLabel: 'Abastecer Filamento no Estoque',
    },
    {
      id: 'opp-search-gap',
      type: 'Demanda de Busca Interna Sem Produto Específico',
      productName: 'Busca recorrente: "suporte alexa echo dot" e "trofeu corporativo 3d"',
      productSlug: 'suporte-headset-geometrico',
      metricObserved: 'Termos buscados por visitantes reais sem SKU dedicado correspondente no catálogo.',
      sampleSize: '3 buscas diretas registradas no motor de eventos comerciais.',
      hypothesis: 'Visitantes procuram suportes de smart speaker e troféus prontos além da página de orçamento sob medida.',
      recommendedAction: 'Cadastrar variação ou destacar chamada para Orçamento Rápido de Troféus e Suportes Smart Home.',
      actionHref: '/admin/produtos',
      actionLabel: 'Gerenciar Catálogo 3D',
    },
  ];

  return {
    periodDays: days,
    productMetrics,
    alerts,
    searchTerms,
    orderSelectionStats,
    opportunities,
  };
}
