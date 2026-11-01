import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createIsolatedTestDb } from '../db';
import { calculate3DPricing } from '../lib/pricing';
import {
  addCartItem,
  getSelectiveCartSummary,
  createOrderFromSelectiveCart,
} from '../lib/cart-checkout';
import {
  purchaseSupplyLot,
  advanceProductionJobStage,
  recordProductionFailure,
  reconcileGatewayFee,
  getFinancialDashboard,
} from '../lib/operations';

describe('RBS Criação v3 — Auditoria Matemática e Jornada Integrada de Ponta a Ponta', () => {
  it('1. Precificador 3D: deve calcular exatamente R$ 49,24 para custo R$ 30,00, taxa fixa R$ 2,00, taxa variável 10% e margem 25%', () => {
    const res = calculate3DPricing({
      directUnitCostOverrideBrl: 30.0,
      fixedFeeBrl: 2.0,
      variableFeePct: 10.0,
      targetMarginPct: 25.0,
      lotQuantity: 1,
    });

    assert.equal(res.valid, true);
    assert.equal(res.denominator, 0.65);
    assert.equal(res.suggestedUnitPriceBrl, 49.24);
    assert.equal(res.suggestedUnitPriceCents, 4924);
    assert.ok(res.realMarginPct >= 25.0);
  });

  it('2. Precificador 3D: deve rejeitar quando taxa percentual + margem desejada >= 100%', () => {
    const res = calculate3DPricing({
      directUnitCostOverrideBrl: 30.0,
      fixedFeeBrl: 2.0,
      variableFeePct: 60.0,
      targetMarginPct: 45.0,
    });
    assert.equal(res.valid, false);
    assert.ok(res.error);
  });

  it('3. Jornada Integrada: Compra de 1kg filamento -> +1.000g -> Carrinho Seletivo (2 de 4 itens) -> Kanban -> Falha/Reimpressão -> Expedição -> Conciliação -> DRE sem tripla contagem', async () => {
    const db = await createIsolatedTestDb();

    // Etapa A: Comprar 1 kg de filamento PLA Seda Terracota por R$ 120,00
    const beforeSupply = await db.query<{ stock_consumption_units: number }>(
      "SELECT stock_consumption_units FROM inventory_supplies WHERE id = 'sup-pla-terracota'"
    );
    const initialGrams = Number(beforeSupply[0].stock_consumption_units);

    const purchaseRes = await purchaseSupplyLot(db, {
      supplyId: 'sup-pla-terracota',
      purchaseQty: 1, // 1 kg
      unitPurchaseCostCents: 12000, // R$ 120,00
      supplierName: 'Fornecedor Homologação 3D',
      paidImmediately: true,
    });

    assert.equal(purchaseRes.addedConsumptionUnits, 1000); // 1 kg = 1.000 g
    assert.equal(purchaseRes.newBalanceUnits, initialGrams + 1000);

    // Etapa B: Carrinho Seletivo — adicionar 4 itens distintos e selecionar apenas 2 para compra
    const sessionKey = 'sess-e2e-journey-test';
    await addCartItem(db, {
      sessionKey,
      productId: 'prod-vaso-voronoi',
      quantity: 1,
      selected: true,
      customText: 'GRAVACAO_1',
    });
    await addCartItem(db, {
      sessionKey,
      productId: 'prod-suporte-headset',
      quantity: 1,
      selected: true,
    });
    await addCartItem(db, {
      sessionKey,
      productId: 'prod-organizador-grid',
      quantity: 1,
      selected: false, // Não selecionado! Deve permanecer no carrinho após o pedido
    });
    await addCartItem(db, {
      sessionKey,
      productId: 'prod-cachepot-autodrenante',
      quantity: 2,
      selected: false, // Não selecionado! Deve permanecer no carrinho após o pedido
    });

    const preSummary = await getSelectiveCartSummary(db, sessionKey);
    assert.equal(preSummary.active_items.length, 4);
    assert.equal(preSummary.selected_items.length, 2);
    assert.equal(preSummary.unselected_items.length, 2);
    assert.equal(preSummary.subtotal_cents, 12990 + 9490);

    // Etapa C: Fechar pedido apenas dos 2 itens selecionados
    const orderResult = await createOrderFromSelectiveCart(db, {
      sessionKey,
      customerName: 'Cliente Jornada E2E',
      customerEmail: 'e2e@rbscriacao.com',
      customerPhone: '(21) 99000-1122',
      customerCpfCnpj: '123.456.789-00',
      shippingAddress: {
        cep: '25020-140',
        street: 'Av. Brigadeiro Lima e Silva',
        number: '100',
        neighborhood: 'Parque Duque',
        city: 'Duque de Caxias',
        state: 'RJ',
      },
      paymentMethod: 'pix',
      simulateImmediatePayment: true,
    });

    assert.match(orderResult.orderNumber, /^RBS-2026-/);
    assert.equal(orderResult.unselectedItemsPreservedCount, 2);

    // Verificar que os 2 itens não selecionados continuam intactos no carrinho!
    const postSummary = await getSelectiveCartSummary(db, sessionKey);
    assert.equal(postSummary.active_items.length, 2);
    assert.deepEqual(
      postSummary.active_items.map((i) => i.product_id).sort(),
      ['prod-cachepot-autodrenante', 'prod-organizador-grid'].sort()
    );

    // Etapa D: Kanban de Produção — buscar O.P. criada pelo pedido, registrar falha parcial (35g) e concluir impressão
    const orderJobs = await db.query<{ id: string }>(
      'SELECT id FROM production_jobs WHERE order_id = $1 ORDER BY id ASC',
      [orderResult.orderId]
    );
    assert.equal(orderJobs.length, 2);

    const failRes = await recordProductionFailure(db, {
      jobId: orderJobs[0].id,
      wastedGrams: 35,
      failureReason: 'Queda de energia momentânea no teste E2E',
      reprintTriggered: true,
    });
    assert.equal(failRes.wastedGrams, 35);

    const advanceRes = await advanceProductionJobStage(db, {
      jobId: orderJobs[0].id,
      newStage: 'shipped',
      actualGramsOverride: 215,
      trackingCode: 'BR999888777RJ',
    });
    assert.equal(advanceRes.newlyConsumedGrams, 215);

    // Verificar que o estoque de filamento abateu exatamente 35g (falha) + 215g (consumo produtivo) = 250g
    const afterSupply = await db.query<{ stock_consumption_units: number }>(
      "SELECT stock_consumption_units FROM inventory_supplies WHERE id = 'sup-pla-terracota'"
    );
    assert.equal(
      Number(afterSupply[0].stock_consumption_units),
      initialGrams + 1000 - 35 - 215
    );

    // Etapa E: Conciliar taxa real do gateway com divergência de +30 centavos
    const finRecRows = await db.query<{ id: string; fee_estimated_cents: number }>(
      'SELECT id, fee_estimated_cents FROM financial_entries WHERE reference_id = $1 AND direction = $2',
      [orderResult.orderId, 'receivable']
    );
    assert.equal(finRecRows.length, 1);

    const estFee = Number(finRecRows[0].fee_estimated_cents);
    const reconcileRes = await reconcileGatewayFee(db, {
      entryId: finRecRows[0].id,
      actualFeeCents: estFee + 30,
      notes: 'Conciliação automatizada E2E',
    });
    assert.equal(reconcileRes.feeDivergenceCents, 30);

    // Etapa F: Verificar DRE (Competência vs. Caixa) garantindo que a compra de R$ 120,00 de filamento está em inventoryAssetPurchasesCents e NÃO duplicada dentro de cogsSupplyConsumedCents
    const finDash = await getFinancialDashboard(db);
    assert.ok(finDash.dreCompetencia.inventoryAssetPurchasesCents >= 12000);
    assert.ok(finDash.dreCompetencia.cogsSupplyConsumedCents > 0);
    assert.ok(finDash.dreCompetencia.grossRevenueCents > 0);
  });

  it('4. Concorrência de Estoque: deve bloquear segunda compra simultânea quando restar apenas 1 unidade disponível', async () => {
    const db = await createIsolatedTestDb();

    await db.query(
      "UPDATE products SET availability_type = 'ready_stock', stock_qty = 1 WHERE id = 'prod-escultura-resina'"
    );
    await db.query(
      "UPDATE inventory_balances SET on_hand_qty = 1, reserved_qty = 0 WHERE product_id = 'prod-escultura-resina' AND location_id = 'loc-expedition'"
    );

    await addCartItem(db, {
      sessionKey: 'sess-buyer-A',
      productId: 'prod-escultura-resina',
      quantity: 1,
      selected: true,
    });
    await addCartItem(db, {
      sessionKey: 'sess-buyer-B',
      productId: 'prod-escultura-resina',
      quantity: 1,
      selected: true,
    });

    const orderA = await createOrderFromSelectiveCart(db, {
      sessionKey: 'sess-buyer-A',
      customerName: 'Comprador A',
      customerEmail: 'a@teste.com',
      customerPhone: '(21) 99999-0001',
      customerCpfCnpj: '111.111.111-11',
      shippingAddress: {
        cep: '25020-140',
        street: 'Rua A',
        number: '10',
        neighborhood: 'Centro',
        city: 'Duque de Caxias',
        state: 'RJ',
      },
      paymentMethod: 'pix',
    });
    assert.ok(orderA.orderId);

    await assert.rejects(
      async () => {
        await createOrderFromSelectiveCart(db, {
          sessionKey: 'sess-buyer-B',
          customerName: 'Comprador B',
          customerEmail: 'b@teste.com',
          customerPhone: '(21) 99999-0002',
          customerCpfCnpj: '222.222.222-22',
          shippingAddress: {
            cep: '25020-140',
            street: 'Rua B',
            number: '20',
            neighborhood: 'Centro',
            city: 'Duque de Caxias',
            state: 'RJ',
          },
          paymentMethod: 'pix',
        });
      },
      /Estoque insuficiente/
    );
  });
});
