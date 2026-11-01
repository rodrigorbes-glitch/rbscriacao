import type { DatabaseAdapter } from '@/db';

export interface CartItemView {
  id: string;
  product_id: string;
  variation_id: string | null;
  product_slug: string;
  product_name: string;
  sku: string;
  material: string;
  finish: string;
  availability_type: string;
  lead_time_days: number;
  variation_label: string | null;
  color_hex: string | null;
  image_url: string;
  quantity: number;
  selected: boolean;
  saved_for_later: boolean;
  custom_text: string | null;
  custom_notes: string | null;
  unit_price_cents: number;
  line_total_cents: number;
  available_stock_qty: number;
  weight_grams: number;
}

export interface SelectiveCartSummary {
  cart_id: string;
  session_key: string;
  coupon_code: string | null;
  cep: string | null;
  active_items: CartItemView[];
  saved_for_later_items: CartItemView[];
  selected_items: CartItemView[];
  unselected_items: CartItemView[];
  selected_lines_count: number;
  selected_units_count: number;
  unselected_lines_count: number;
  saved_for_later_count: number;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  pix_discount_cents: number;
  total_credit_card_cents: number;
  total_pix_cents: number;
  manufacturing_days: number;
  shipping_days: number;
  total_delivery_days: number;
  shipping_options: Array<{
    id: string;
    name: string;
    carrier: string;
    price_cents: number;
    carrier_days: number;
    manufacturing_days: number;
    total_days: number;
  }>;
  can_checkout: boolean;
  selection_message: string;
}

export function calculateShippingOptions(
  cep: string | null | undefined,
  totalWeightGrams: number,
  selectedSubtotalCents: number,
  maxManufacturingDays: number
) {
  const cleanCep = (cep || '').replace(/\D/g, '');
  const mfgDays = Math.max(1, maxManufacturingDays || 1);

  if (cleanCep.length !== 8) {
    return [
      {
        id: 'sedex',
        name: 'SEDEX (Melhor Envio)',
        carrier: 'Correios',
        price_cents: selectedSubtotalCents >= 29900 ? 0 : 2190,
        carrier_days: 2,
        manufacturing_days: mfgDays,
        total_days: mfgDays + 2,
      },
      {
        id: 'pac',
        name: 'PAC Econômico',
        carrier: 'Correios',
        price_cents: selectedSubtotalCents >= 29900 ? 0 : 1690,
        carrier_days: 5,
        manufacturing_days: mfgDays,
        total_days: mfgDays + 5,
      },
      {
        id: 'retirada',
        name: 'Retirada no Estúdio RBS (Duque de Caxias/RJ)',
        carrier: 'Estúdio RBS Criação',
        price_cents: 0,
        carrier_days: 0,
        manufacturing_days: mfgDays,
        total_days: mfgDays,
      },
    ];
  }

  // Regional calculation from Duque de Caxias / RJ (CEP 25020-140)
  const prefix = Number(cleanCep.slice(0, 2));
  const isRj = prefix >= 20 && prefix <= 28;
  const isSudeste = prefix >= 1 && prefix <= 39;
  const weightKg = Math.max(0.3, totalWeightGrams / 1000);
  const weightFactorCents = Math.round(weightKg * 380);

  const baseSedex = isRj ? 1590 : isSudeste ? 2190 : 3290;
  const basePac = isRj ? 1290 : isSudeste ? 1690 : 2390;
  const baseJadlog = isRj ? 1490 : isSudeste ? 1890 : 2690;

  const sedexDays = isRj ? 1 : isSudeste ? 2 : 4;
  const pacDays = isRj ? 3 : isSudeste ? 5 : 8;
  const jadlogDays = isRj ? 2 : isSudeste ? 3 : 6;

  const isFreeShipping = selectedSubtotalCents >= 29900;

  return [
    {
      id: 'sedex',
      name: 'SEDEX Expresso (Melhor Envio)',
      carrier: 'Correios',
      price_cents: baseSedex + weightFactorCents,
      carrier_days: sedexDays,
      manufacturing_days: mfgDays,
      total_days: mfgDays + sedexDays,
    },
    {
      id: 'jadlog',
      name: isFreeShipping ? 'Jadlog .Package (Frete Grátis RBS)' : 'Jadlog .Package (Melhor Envio)',
      carrier: 'Jadlog',
      price_cents: isFreeShipping ? 0 : baseJadlog + weightFactorCents,
      carrier_days: jadlogDays,
      manufacturing_days: mfgDays,
      total_days: mfgDays + jadlogDays,
    },
    {
      id: 'pac',
      name: isFreeShipping ? 'PAC (Frete Grátis RBS)' : 'PAC Econômico (Melhor Envio)',
      carrier: 'Correios',
      price_cents: isFreeShipping ? 0 : basePac + weightFactorCents,
      carrier_days: pacDays,
      manufacturing_days: mfgDays,
      total_days: mfgDays + pacDays,
    },
    {
      id: 'retirada',
      name: 'Retirada no Estúdio RBS (Duque de Caxias/RJ)',
      carrier: 'Estúdio RBS Criação',
      price_cents: 0,
      carrier_days: 0,
      manufacturing_days: mfgDays,
      total_days: mfgDays,
    },
  ];
}

export async function getOrCreateCart(
  db: DatabaseAdapter,
  sessionKey: string,
  userId?: string | null
): Promise<string> {
  const existing = await db.query<{ id: string }>(
    'SELECT id FROM carts WHERE session_key = $1 LIMIT 1',
    [sessionKey]
  );
  if (existing.length > 0) {
    return existing[0].id;
  }

  const cartId = `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await db.query(
    `INSERT INTO carts (id, session_key, user_id, shipping_cents, shipping_days)
     VALUES ($1, $2, $3, 0, 2) ON CONFLICT (session_key) DO NOTHING`,
    [cartId, sessionKey, userId || null]
  );
  const check = await db.query<{ id: string }>(
    'SELECT id FROM carts WHERE session_key = $1 LIMIT 1',
    [sessionKey]
  );
  return check[0].id;
}

export async function addCartItem(
  db: DatabaseAdapter,
  params: {
    sessionKey: string;
    userId?: string | null;
    productId: string;
    variationId?: string | null;
    quantity?: number;
    selected?: boolean;
    customText?: string | null;
    customNotes?: string | null;
  }
): Promise<SelectiveCartSummary> {
  const cartId = await getOrCreateCart(db, params.sessionKey, params.userId);
  const qty = Math.max(1, Number(params.quantity ?? 1));

  const prodRows = await db.query<{ price_cents: number }>(
    'SELECT price_cents FROM products WHERE id = $1 LIMIT 1',
    [params.productId]
  );
  if (prodRows.length === 0) {
    throw new Error('Produto não encontrado no catálogo.');
  }
  let unitPrice = Number(prodRows[0].price_cents);

  if (params.variationId) {
    const varRows = await db.query<{ price_delta_cents: number }>(
      'SELECT price_delta_cents FROM product_variations WHERE id = $1 LIMIT 1',
      [params.variationId]
    );
    if (varRows.length > 0) {
      unitPrice += Number(varRows[0].price_delta_cents);
    }
  }

  const existingItem = await db.query<{ id: string; quantity: number }>(
    `SELECT id, quantity FROM cart_items
     WHERE cart_id = $1 AND product_id = $2
       AND COALESCE(variation_id, '') = COALESCE($3, '')
       AND COALESCE(custom_text, '') = COALESCE($4, '')
       AND saved_for_later = FALSE
     LIMIT 1`,
    [cartId, params.productId, params.variationId || null, params.customText || null]
  );

  if (existingItem.length > 0) {
    await db.query(
      `UPDATE cart_items
       SET quantity = quantity + $1,
           selected = COALESCE($2, selected),
           unit_price_snapshot_cents = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [qty, params.selected ?? true, unitPrice, existingItem[0].id]
    );
  } else {
    const itemId = `ci-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db.query(
      `INSERT INTO cart_items (
        id, cart_id, product_id, variation_id, quantity, selected, saved_for_later,
        custom_text, custom_notes, unit_price_snapshot_cents
      ) VALUES ($1,$2,$3,$4,$5,$6,FALSE,$7,$8,$9)`,
      [
        itemId,
        cartId,
        params.productId,
        params.variationId || null,
        qty,
        params.selected ?? true,
        params.customText || null,
        params.customNotes || null,
        unitPrice,
      ]
    );
  }

  // Record observable commercial event
  await db.query(
    `INSERT INTO commercial_events (id, event_name, session_key, user_id, product_id, variation_id, channel_source)
     VALUES ($1, 'cart_add', $2, $3, $4, $5, 'loja')`,
    [
      `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      params.sessionKey,
      params.userId || null,
      params.productId,
      params.variationId || null,
    ]
  );

  return getSelectiveCartSummary(db, params.sessionKey);
}

export async function getSelectiveCartSummary(
  db: DatabaseAdapter,
  sessionKey: string
): Promise<SelectiveCartSummary> {
  const cartId = await getOrCreateCart(db, sessionKey);
  const cartRows = await db.query<{
    id: string;
    coupon_code: string | null;
    cep: string | null;
    selected_shipping_service: string | null;
  }>('SELECT id, coupon_code, cep, selected_shipping_service FROM carts WHERE id = $1', [cartId]);

  const cart = cartRows[0];

  const rawItems = await db.query<{
    id: string;
    product_id: string;
    variation_id: string | null;
    quantity: number;
    selected: boolean;
    saved_for_later: boolean;
    custom_text: string | null;
    custom_notes: string | null;
    slug: string;
    name: string;
    sku: string;
    material: string;
    finish: string;
    availability_type: string;
    lead_time_days: number;
    price_cents: number;
    weight_grams: number;
    images_json: string;
    stock_qty: number;
    color_name: string | null;
    size_label: string | null;
    color_hex: string | null;
    price_delta_cents: number | null;
    on_hand_qty: number | null;
    reserved_qty: number | null;
  }>(
    `SELECT
      ci.id, ci.product_id, ci.variation_id, ci.quantity, ci.selected, ci.saved_for_later,
      ci.custom_text, ci.custom_notes,
      p.slug, p.name, p.sku, p.material, p.finish, p.availability_type, p.lead_time_days,
      p.price_cents, p.weight_grams, p.images_json, p.stock_qty,
      pv.color_name, pv.size_label, pv.color_hex, pv.price_delta_cents,
      ib.on_hand_qty, ib.reserved_qty
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     LEFT JOIN product_variations pv ON pv.id = ci.variation_id
     LEFT JOIN inventory_balances ib ON ib.product_id = p.id AND ib.location_id = 'loc-expedition'
     WHERE ci.cart_id = $1
     ORDER BY ci.created_at ASC`,
    [cartId]
  );

  const mapped: CartItemView[] = rawItems.map((r) => {
    let imgs: string[] = [];
    try {
      imgs = JSON.parse(r.images_json || '[]');
    } catch {
      imgs = [];
    }
    const unitPrice = Number(r.price_cents) + Number(r.price_delta_cents ?? 0);
    const qty = Math.max(1, Number(r.quantity));
    const availableStock =
      r.on_hand_qty !== null && r.on_hand_qty !== undefined
        ? Math.max(0, Number(r.on_hand_qty) - Number(r.reserved_qty ?? 0))
        : Number(r.stock_qty);

    return {
      id: r.id,
      product_id: r.product_id,
      variation_id: r.variation_id,
      product_slug: r.slug,
      product_name: r.name,
      sku: r.sku,
      material: r.material,
      finish: r.finish,
      availability_type: r.availability_type,
      lead_time_days: Number(r.lead_time_days || 1),
      variation_label: r.color_name ? `${r.color_name} • ${r.size_label || 'Padrão'}` : null,
      color_hex: r.color_hex,
      image_url: imgs[0] || '',
      quantity: qty,
      selected: Boolean(r.selected),
      saved_for_later: Boolean(r.saved_for_later),
      custom_text: r.custom_text,
      custom_notes: r.custom_notes,
      unit_price_cents: unitPrice,
      line_total_cents: unitPrice * qty,
      available_stock_qty: availableStock,
      weight_grams: Number(r.weight_grams || 200),
    };
  });

  const activeItems = mapped.filter((i) => !i.saved_for_later);
  const savedForLaterItems = mapped.filter((i) => i.saved_for_later);
  const selectedItems = activeItems.filter((i) => i.selected);
  const unselectedItems = activeItems.filter((i) => !i.selected);

  // Totals EXCLUSIVELY for selected items!
  const subtotalCents = selectedItems.reduce((acc, i) => acc + i.line_total_cents, 0);
  const selectedUnitsCount = selectedItems.reduce((acc, i) => acc + i.quantity, 0);
  const totalSelectedWeightGrams = selectedItems.reduce(
    (acc, i) => acc + i.weight_grams * i.quantity,
    0
  );
  const maxManufacturingDays =
    selectedItems.length > 0
      ? Math.max(...selectedItems.map((i) => i.lead_time_days))
      : 0;

  // Coupon calculation on selected items only
  let discountCents = 0;
  if (cart?.coupon_code && selectedItems.length > 0) {
    const promoRows = await db.query<{
      promotion_type: string;
      discount_value: string;
      min_order_cents: number;
    }>(
      `SELECT promotion_type, discount_value, min_order_cents
       FROM promotions
       WHERE UPPER(code) = UPPER($1) AND status = 'active' LIMIT 1`,
      [cart.coupon_code]
    );
    if (promoRows.length > 0 && subtotalCents >= Number(promoRows[0].min_order_cents || 0)) {
      const val = Number(promoRows[0].discount_value);
      if (promoRows[0].promotion_type === 'percentage') {
        discountCents = Math.round(subtotalCents * (val / 100));
      } else if (promoRows[0].promotion_type === 'fixed_amount') {
        discountCents = Math.min(subtotalCents, Math.round(val * 100));
      }
    }
  }

  const shippingOptions =
    selectedItems.length > 0
      ? calculateShippingOptions(cart?.cep, totalSelectedWeightGrams, subtotalCents, maxManufacturingDays)
      : [];

  const chosenOption =
    shippingOptions.find((o) => o.id === cart?.selected_shipping_service) ||
    shippingOptions[0] ||
    null;

  const shippingCents = selectedItems.length > 0 && chosenOption ? chosenOption.price_cents : 0;
  const shippingDays = selectedItems.length > 0 && chosenOption ? chosenOption.carrier_days : 0;
  const totalCreditCardCents = Math.max(0, subtotalCents - discountCents + shippingCents);
  const pixDiscountCents = Math.round(Math.max(0, subtotalCents - discountCents) * 0.05);
  const totalPixCents = Math.max(0, totalCreditCardCents - pixDiscountCents);

  const canCheckout = selectedItems.length > 0;
  const selectionMessage = canCheckout
    ? `${selectedItems.length} ${selectedItems.length === 1 ? 'item selecionado' : 'itens selecionados'} para esta compra (${unselectedItems.length} permanecerão salvos no carrinho).`
    : activeItems.length === 0
      ? 'Seu carrinho está vazio. Adicione peças do catálogo 3D para começar.'
      : 'Nenhum produto selecionado. Marque ao menos 1 item no carrinho para liberar o botão de compra.';

  return {
    cart_id: cartId,
    session_key: sessionKey,
    coupon_code: cart?.coupon_code || null,
    cep: cart?.cep || null,
    active_items: activeItems,
    saved_for_later_items: savedForLaterItems,
    selected_items: selectedItems,
    unselected_items: unselectedItems,
    selected_lines_count: selectedItems.length,
    selected_units_count: selectedUnitsCount,
    unselected_lines_count: unselectedItems.length,
    saved_for_later_count: savedForLaterItems.length,
    subtotal_cents: subtotalCents,
    discount_cents: discountCents,
    shipping_cents: shippingCents,
    pix_discount_cents: pixDiscountCents,
    total_credit_card_cents: totalCreditCardCents,
    total_pix_cents: totalPixCents,
    manufacturing_days: maxManufacturingDays,
    shipping_days: shippingDays,
    total_delivery_days: maxManufacturingDays + shippingDays,
    shipping_options: shippingOptions,
    can_checkout: canCheckout,
    selection_message: selectionMessage,
  };
}

export async function createOrderFromSelectiveCart(
  db: DatabaseAdapter,
  payload: {
    sessionKey: string;
    userId?: string | null;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCpfCnpj: string;
    shippingAddress: {
      cep: string;
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
    };
    shippingServiceId?: string;
    paymentMethod: 'pix' | 'credit_card' | 'boleto';
    couponCode?: string | null;
    partnerCode?: string | null;
    idempotencyKey?: string;
    simulateImmediatePayment?: boolean;
  }
) {
  return db.transaction(async (tx) => {
    const idemKey =
      payload.idempotencyKey || `idem-${payload.sessionKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Check idempotency
    const existingOrder = await tx.query<{ id: string; order_number: string }>(
      'SELECT id, order_number FROM orders WHERE idempotency_key = $1 LIMIT 1',
      [idemKey]
    );
    if (existingOrder.length > 0) {
      return {
        orderId: existingOrder[0].id,
        orderNumber: existingOrder[0].order_number,
        idempotentReplay: true,
      };
    }

    if (payload.couponCode !== undefined) {
      await tx.query('UPDATE carts SET coupon_code = $1, cep = $2 WHERE session_key = $3', [
        payload.couponCode || null,
        payload.shippingAddress.cep,
        payload.sessionKey,
      ]);
    }

    const summary = await getSelectiveCartSummary(tx, payload.sessionKey);
    if (!summary.can_checkout || summary.selected_items.length === 0) {
      throw new Error(
        'Nenhum item selecionado para checkout. Marque ao menos 1 produto no carrinho.'
      );
    }

    // Validate authoritative stock for every selected item inside the transaction!
    for (const item of summary.selected_items) {
      const balRows = await tx.query<{ id: string; on_hand_qty: number; reserved_qty: number }>(
        `SELECT id, on_hand_qty, reserved_qty
         FROM inventory_balances
         WHERE product_id = $1 AND location_id = 'loc-expedition'
         LIMIT 1`,
        [item.product_id]
      );
      if (balRows.length > 0) {
        const available = Number(balRows[0].on_hand_qty) - Number(balRows[0].reserved_qty);
        if (available < item.quantity && item.availability_type === 'ready_stock') {
          throw new Error(
            `Estoque insuficiente para "${item.product_name}". Disponível: ${available} un, solicitado: ${item.quantity} un.`
          );
        }
        // Reserve stock
        await tx.query(
          `UPDATE inventory_balances
           SET reserved_qty = reserved_qty + $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [item.quantity, balRows[0].id]
        );
        await tx.query(
          `UPDATE products
           SET stock_qty = GREATEST(0, stock_qty - $1), updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      }
    }

    const chosenShipping =
      summary.shipping_options.find((o) => o.id === payload.shippingServiceId) ||
      summary.shipping_options[0];

    const isPaid = payload.simulateImmediatePayment !== false;
    const isPix = payload.paymentMethod === 'pix';
    const discountCents =
      summary.discount_cents + (isPix ? summary.pix_discount_cents : 0);
    const shippingCents = chosenShipping ? chosenShipping.price_cents : summary.shipping_cents;
    const totalCents = Math.max(0, summary.subtotal_cents - discountCents + shippingCents);
    const feeRate = isPix ? 0.0099 : 0.0499;
    const feeEstimatedCents = Math.round(totalCents * feeRate);

    // Check partner attribution by coupon or partnerCode
    let partnerId: string | null = null;
    let partnerCommissionPct = 0;
    const lookupPartnerCode = payload.partnerCode || summary.coupon_code;
    if (lookupPartnerCode) {
      const prtRows = await tx.query<{ id: string; commission_rate_pct: string }>(
        `SELECT id, commission_rate_pct FROM partners
         WHERE (UPPER(partner_code) = UPPER($1) OR UPPER(coupon_code) = UPPER($1))
           AND status = 'active'
         LIMIT 1`,
        [lookupPartnerCode]
      );
      if (prtRows.length > 0) {
        partnerId = prtRows[0].id;
        partnerCommissionPct = Number(prtRows[0].commission_rate_pct);
      }
    }

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const orderNumber = `RBS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const claimToken = `claim-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const selectionMode = summary.unselected_items.length > 0 ? 'partial' : 'full';

    const financialStatus = isPaid ? 'paid' : 'pending';
    const productionStatus = isPaid ? 'queued' : 'awaiting_payment';

    await tx.query(
      `INSERT INTO orders (
        id, order_number, user_id, guest_name, guest_email, guest_phone, guest_cpf_cnpj,
        shipping_address_json, shipping_service_name, shipping_carrier,
        shipping_days, manufacturing_days, total_estimated_days,
        subtotal_cents, discount_cents, shipping_cents, total_cents,
        gateway_fee_estimated_cents, gateway_fee_actual_cents,
        coupon_code, partner_id, partner_code, payment_method, payment_gateway,
        payment_external_id, payment_qr_code, payment_copy_paste, idempotency_key,
        financial_status, production_status, fulfillment_status,
        cart_selection_mode, unselected_items_preserved_count, post_purchase_claim_token,
        paid_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,'mercadopago',
        $24,$25,$26,$27,$28,$29,'unfulfilled',$30,$31,$32,$33
      )`,
      [
        orderId,
        orderNumber,
        payload.userId || null,
        payload.customerName,
        payload.customerEmail,
        payload.customerPhone,
        payload.customerCpfCnpj,
        JSON.stringify(payload.shippingAddress),
        chosenShipping?.name || 'SEDEX (Melhor Envio)',
        chosenShipping?.carrier || 'Correios',
        chosenShipping?.carrier_days ?? 2,
        summary.manufacturing_days,
        (chosenShipping?.carrier_days ?? 2) + summary.manufacturing_days,
        summary.subtotal_cents,
        discountCents,
        shippingCents,
        totalCents,
        feeEstimatedCents,
        isPaid ? feeEstimatedCents : null,
        summary.coupon_code,
        partnerId,
        lookupPartnerCode || null,
        payload.paymentMethod,
        `mp_homolog_${Date.now()}`,
        '00020126580014BR.GOV.BCB.PIX0136rbscriacao-homolog-pix-key5204000053039865802BR5913RBS CRIACAO6008CAXIASRJ62070503***6304ABCD',
        '00020126580014BR.GOV.BCB.PIX0136rbscriacao-homolog-pix-key5204000053039865802BR5913RBS CRIACAO6008CAXIASRJ62070503***6304ABCD',
        idemKey,
        financialStatus,
        productionStatus,
        selectionMode,
        summary.unselected_items.length,
        claimToken,
        isPaid ? new Date().toISOString() : null,
      ]
    );

    // Insert ONLY the selected items into order_items & create Kanban jobs
    for (const item of summary.selected_items) {
      const prodDetails = await tx.query<{
        cost_cents: number;
        filament_grams_per_unit: number;
        support_purge_grams_per_unit: number;
        print_time_minutes: number;
      }>(
        `SELECT cost_cents, filament_grams_per_unit, support_purge_grams_per_unit, print_time_minutes
         FROM products WHERE id = $1 LIMIT 1`,
        [item.product_id]
      );
      const pd = prodDetails[0];
      const totalGramsEst =
        (Number(pd?.filament_grams_per_unit ?? 160) +
          Number(pd?.support_purge_grams_per_unit ?? 15)) *
        item.quantity;

      const oiId = `oi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await tx.query(
        `INSERT INTO order_items (
          id, order_id, product_id, variation_id, sku_snapshot, product_name_snapshot,
          variation_label_snapshot, material_snapshot, availability_snapshot, lead_time_days_snapshot,
          quantity, unit_price_cents, unit_cost_cents, custom_text, custom_notes, filament_grams_estimated
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          oiId,
          orderId,
          item.product_id,
          item.variation_id,
          item.sku,
          item.product_name,
          item.variation_label,
          item.material,
          item.availability_type,
          item.lead_time_days,
          item.quantity,
          item.unit_price_cents,
          Number(pd?.cost_cents ?? 3000),
          item.custom_text,
          item.custom_notes,
          totalGramsEst,
        ]
      );

      // Create Kanban 3D Production Job
      const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await tx.query(
        `INSERT INTO production_jobs (
          id, order_id, order_item_id, product_id, batch_code, printer_name, supply_id,
          stage, priority, quantity, estimated_grams, actual_grams_consumed, estimated_minutes, operator_notes
        ) VALUES ($1,$2,$3,$4,$5,'Bambu Lab X1C #01','sup-pla-terracota',$6,'normal',$7,$8,0,$9,$10)`,
        [
          jobId,
          orderId,
          oiId,
          item.product_id,
          `OP-${orderNumber}`,
          productionStatus,
          item.quantity,
          totalGramsEst,
          Number(pd?.print_time_minutes ?? 210) * item.quantity,
          item.custom_text ? `Personalização solicitada: "${item.custom_text}"` : 'Produção padrão catálogo RBS',
        ]
      );

      // Remove ONLY the purchased selected item from cart_items!
      await tx.query('DELETE FROM cart_items WHERE id = $1', [item.id]);
    }

    // Create Financial Receivable Entry
    const finEntryId = `fin-rec-${orderId}`;
    const today = new Date().toISOString().slice(0, 10);
    await tx.query(
      `INSERT INTO financial_entries (
        id, entry_code, direction, category_code, accounting_class, description, counterparty_name,
        reference_type, reference_id, competence_date, due_date,
        gross_amount_cents, paid_amount_cents, fee_estimated_cents, fee_actual_cents, net_amount_cents,
        status, account_id, paid_at
      ) VALUES ($1,$2,'receivable','product_sale','gross_revenue',$3,$4,'order',$5,$6,$6,$7,$8,$9,$10,$11,$12,'acc-mp',$13)`,
      [
        finEntryId,
        `REC-${orderNumber}`,
        `Pedido ${orderNumber} — ${payload.customerName} (${selectionMode === 'partial' ? 'Carrinho Parcial' : 'Carrinho Completo'})`,
        payload.customerName,
        orderId,
        today,
        totalCents,
        isPaid ? totalCents : 0,
        feeEstimatedCents,
        isPaid ? feeEstimatedCents : null,
        totalCents - feeEstimatedCents,
        isPaid ? 'paid' : 'pending',
        isPaid ? new Date().toISOString() : null,
      ]
    );

    if (partnerId && partnerCommissionPct > 0) {
      const calcBase = Math.max(0, summary.subtotal_cents - discountCents);
      const commCents = Math.round(calcBase * (partnerCommissionPct / 100));
      const commFinId = `fin-com-${orderId}`;
      await tx.query(
        `INSERT INTO financial_entries (
          id, entry_code, direction, category_code, accounting_class, description, counterparty_name,
          reference_type, reference_id, competence_date, due_date,
          gross_amount_cents, paid_amount_cents, fee_estimated_cents, net_amount_cents, status, account_id
        ) VALUES ($1,$2,'payable','partner_commission','partner_commission',$3,'Parceiro RBS','partner_commission',$4,$5,$5,$6,0,0,$6,'pending','acc-bank')`,
        [
          commFinId,
          `COM-${orderNumber}`,
          `Comissão Parceiro (${partnerCommissionPct}%) — Pedido ${orderNumber}`,
          orderId,
          today,
          commCents,
        ]
      );
      await tx.query(
        `INSERT INTO partner_commissions (
          id, partner_id, order_id, origin_type, calculation_base_cents, commission_rate_pct, commission_amount_cents, status, financial_entry_id
        ) VALUES ($1,$2,$3,'coupon',$4,$5,$6,'approved',$7)`,
        [`pcom-${orderId}`, partnerId, orderId, calcBase, partnerCommissionPct, commCents, commFinId]
      );
    }

    // Record commercial events
    await tx.query(
      `INSERT INTO commercial_events (id, event_name, session_key, user_id, order_id, channel_source, metadata_json)
       VALUES ($1, 'checkout_selective_confirm', $2, $3, $4, 'checkout', $5)`,
      [
        `evt-chk-${orderId}`,
        payload.sessionKey,
        payload.userId || null,
        orderId,
        JSON.stringify({
          selectionMode,
          selectedCount: summary.selected_items.length,
          unselectedPreservedCount: summary.unselected_items.length,
        }),
      ]
    );

    if (isPaid) {
      await tx.query(
        `INSERT INTO commercial_events (id, event_name, session_key, user_id, order_id, channel_source, event_id_dedup)
         VALUES ($1, 'payment_success', $2, $3, $4, 'checkout', $5)`,
        [`evt-pay-${orderId}`, payload.sessionKey, payload.userId || null, orderId, `meta_dedup_${orderId}`]
      );
    }

    // Enqueue transactional notification job in persistent outbox (safe sandbox mode in homologation)
    await tx.query(
      `INSERT INTO async_jobs (id, job_type, idempotency_key, payload_json, status)
       VALUES ($1, 'send_email', $2, $3, 'completed') ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        `job-mail-${orderId}`,
        `mail-confirm-${orderId}`,
        JSON.stringify({
          to: payload.customerEmail,
          subject: `Pedido ${orderNumber} recebido na RBS Criação`,
          sandboxSimulated: true,
        }),
      ]
    );

    return {
      orderId,
      orderNumber,
      claimToken,
      totalCents,
      financialStatus,
      productionStatus,
      unselectedItemsPreservedCount: summary.unselected_items.length,
      idempotentReplay: false,
    };
  });
}
