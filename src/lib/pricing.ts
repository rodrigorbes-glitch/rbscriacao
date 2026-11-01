export interface PricingInput {
  mode?: 'fast' | 'advanced';
  /** If provided (in BRL), overrides calculated manufacturing direct cost (e.g. R$ 30,00 benchmark test) */
  directUnitCostOverrideBrl?: number | null;
  partGrams?: number;
  supportPurgeGrams?: number;
  filamentCostPerKgBrl?: number;
  printMinutes?: number;
  postProcessMinutes?: number;
  kwhRateBrl?: number;
  printerPowerWatts?: number;
  machineValueBrl?: number;
  machineLifespanHours?: number;
  maintenancePerHourBrl?: number;
  operatorHourRateBrl?: number;
  packagingBrl?: number;
  extraInputsBrl?: number;
  failureRatePct?: number;
  fixedFeeBrl: number;
  variableFeePct: number;
  targetMarginPct: number;
  lotQuantity?: number;
  pixDiscountPct?: number;
}

export interface PricingOutput {
  valid: boolean;
  error?: string;
  totalGramsPerUnit: number;
  materialCostBrl: number;
  energyCostBrl: number;
  depreciationMaintenanceBrl: number;
  laborCostBrl: number;
  packagingAndExtrasBrl: number;
  failureReserveBrl: number;
  unitDirectCostBrl: number;
  unitDirectCostCents: number;
  fixedFeeBrl: number;
  variableFeePct: number;
  targetMarginPct: number;
  denominator: number;
  rawUnitPriceBrl: number;
  /** Minimum price in BRL rounded UP to the next cent so target margin is strictly met */
  suggestedUnitPriceBrl: number;
  suggestedUnitPriceCents: number;
  suggestedLotPriceBrl: number;
  suggestedLotPriceCents: number;
  variableFeeAmountBrl: number;
  totalDeductionsBrl: number;
  netUnitProfitBrl: number;
  netUnitProfitCents: number;
  realMarginPct: number;
  markupMultiplier: number;
  pixPriceBrl: number;
  pixNetProfitBrl: number;
  pixMarginPct: number;
  progressiveLots: Array<{
    quantity: number;
    unitPriceBrl: number;
    totalLotPriceBrl: number;
    realMarginPct: number;
  }>;
}

/**
 * Rounds UP to the next cent (with 1e-6 tolerance against floating point representation drift)
 * so that the net margin after percentage fees never drops below the target margin.
 * Example: (30 + 2) / (1 - 0.10 - 0.25) = 32 / 0.65 = 49.230769... -> ceil to cents = 49.24 (R$ 49,24).
 */
export function ceilToCents(amountBrl: number): number {
  const scaled = Number((amountBrl * 100).toFixed(6));
  return Math.ceil(scaled) / 100;
}

export function calculate3DPricing(input: PricingInput): PricingOutput {
  const lotQuantity = Math.max(1, Math.floor(Number(input.lotQuantity ?? 1)));
  const fixedFeeBrl = Math.max(0, Number(input.fixedFeeBrl ?? 0));
  const variableFeePct = Math.max(0, Number(input.variableFeePct ?? 0));
  const targetMarginPct = Number(input.targetMarginPct ?? 0);
  const pixDiscountPct = Math.max(0, Number(input.pixDiscountPct ?? 5));

  const variableRate = variableFeePct / 100;
  const marginRate = targetMarginPct / 100;
  const denominator = Number((1 - variableRate - marginRate).toFixed(8));

  const partGrams = Math.max(0, Number(input.partGrams ?? 0));
  const supportPurgeGrams = Math.max(0, Number(input.supportPurgeGrams ?? 0));
  const totalGramsPerUnit = partGrams + supportPurgeGrams;

  const filamentCostPerKgBrl = Math.max(0, Number(input.filamentCostPerKgBrl ?? 110));
  const printMinutes = Math.max(0, Number(input.printMinutes ?? 0));
  const postProcessMinutes = Math.max(0, Number(input.postProcessMinutes ?? 0));
  const kwhRateBrl = Math.max(0, Number(input.kwhRateBrl ?? 0.95));
  const printerPowerWatts = Math.max(0, Number(input.printerPowerWatts ?? 350));
  const machineValueBrl = Math.max(0, Number(input.machineValueBrl ?? 8500));
  const machineLifespanHours = Math.max(1, Number(input.machineLifespanHours ?? 6000));
  const maintenancePerHourBrl = Math.max(0, Number(input.maintenancePerHourBrl ?? 0.8));
  const operatorHourRateBrl = Math.max(0, Number(input.operatorHourRateBrl ?? 35));
  const packagingBrl = Math.max(0, Number(input.packagingBrl ?? 0));
  const extraInputsBrl = Math.max(0, Number(input.extraInputsBrl ?? 0));
  const failureRatePct = Math.max(0, Number(input.failureRatePct ?? 0));

  const printHours = printMinutes / 60;
  const laborHours = postProcessMinutes / 60;

  const materialCostBrl = (totalGramsPerUnit / 1000) * filamentCostPerKgBrl;
  const energyCostBrl = printHours * (printerPowerWatts / 1000) * kwhRateBrl;
  const depreciationPerHour = machineValueBrl / machineLifespanHours;
  const depreciationMaintenanceBrl = printHours * (depreciationPerHour + maintenancePerHourBrl);
  const laborCostBrl = laborHours * operatorHourRateBrl;
  const packagingAndExtrasBrl = packagingBrl + extraInputsBrl;

  const baseManufacturingCost =
    materialCostBrl + energyCostBrl + depreciationMaintenanceBrl + laborCostBrl;
  const failureReserveBrl = baseManufacturingCost * (failureRatePct / 100);

  const unitDirectCostBrl =
    input.directUnitCostOverrideBrl !== undefined &&
    input.directUnitCostOverrideBrl !== null &&
    Number(input.directUnitCostOverrideBrl) > 0
      ? Number(input.directUnitCostOverrideBrl)
      : Number((baseManufacturingCost + failureReserveBrl + packagingAndExtrasBrl).toFixed(4));

  const unitDirectCostCents = Math.round(unitDirectCostBrl * 100);

  if (denominator <= 0) {
    return {
      valid: false,
      error:
        'A soma da taxa percentual do canal/gateway com a margem líquida desejada não pode ser igual ou superior a 100%.',
      totalGramsPerUnit,
      materialCostBrl: Number(materialCostBrl.toFixed(2)),
      energyCostBrl: Number(energyCostBrl.toFixed(2)),
      depreciationMaintenanceBrl: Number(depreciationMaintenanceBrl.toFixed(2)),
      laborCostBrl: Number(laborCostBrl.toFixed(2)),
      packagingAndExtrasBrl: Number(packagingAndExtrasBrl.toFixed(2)),
      failureReserveBrl: Number(failureReserveBrl.toFixed(2)),
      unitDirectCostBrl: Number(unitDirectCostBrl.toFixed(2)),
      unitDirectCostCents,
      fixedFeeBrl,
      variableFeePct,
      targetMarginPct,
      denominator,
      rawUnitPriceBrl: 0,
      suggestedUnitPriceBrl: 0,
      suggestedUnitPriceCents: 0,
      suggestedLotPriceBrl: 0,
      suggestedLotPriceCents: 0,
      variableFeeAmountBrl: 0,
      totalDeductionsBrl: 0,
      netUnitProfitBrl: 0,
      netUnitProfitCents: 0,
      realMarginPct: 0,
      markupMultiplier: 0,
      pixPriceBrl: 0,
      pixNetProfitBrl: 0,
      pixMarginPct: 0,
      progressiveLots: [],
    };
  }

  // Exact formula: Price = (DirectCost + FixedFee) / (1 - VariableFeeRate - TargetMarginRate)
  const rawUnitPriceBrl = (unitDirectCostBrl + fixedFeeBrl) / denominator;
  const suggestedUnitPriceBrl = ceilToCents(rawUnitPriceBrl);
  const suggestedUnitPriceCents = Math.round(suggestedUnitPriceBrl * 100);

  const suggestedLotPriceBrl = Number((suggestedUnitPriceBrl * lotQuantity).toFixed(2));
  const suggestedLotPriceCents = suggestedUnitPriceCents * lotQuantity;

  const variableFeeAmountBrl = Number((suggestedUnitPriceBrl * variableRate).toFixed(4));
  const totalDeductionsBrl = Number((fixedFeeBrl + variableFeeAmountBrl).toFixed(4));
  const netUnitProfitBrl = Number(
    (suggestedUnitPriceBrl - unitDirectCostBrl - totalDeductionsBrl).toFixed(2)
  );
  const netUnitProfitCents = Math.round(netUnitProfitBrl * 100);
  const realMarginPct =
    suggestedUnitPriceBrl > 0
      ? Number(
          (
            ((suggestedUnitPriceBrl - unitDirectCostBrl - totalDeductionsBrl) /
              suggestedUnitPriceBrl) *
            100
          ).toFixed(2)
        )
      : 0;

  const markupMultiplier =
    unitDirectCostBrl > 0 ? Number((suggestedUnitPriceBrl / unitDirectCostBrl).toFixed(2)) : 0;

  // Pix scenario (typically lower gateway fee ~0.99% and customer discount)
  const pixPriceBrl = ceilToCents(suggestedUnitPriceBrl * (1 - pixDiscountPct / 100));
  const pixGatewayFeeBrl = pixPriceBrl * 0.0099;
  const pixNetProfitBrl = Number((pixPriceBrl - unitDirectCostBrl - pixGatewayFeeBrl).toFixed(2));
  const pixMarginPct =
    pixPriceBrl > 0 ? Number(((pixNetProfitBrl / pixPriceBrl) * 100).toFixed(2)) : 0;

  // Progressive B2B/lot simulation (fixed fee and setup diluted across batch)
  const lotSizes = [1, 5, 10, 25, 50];
  const progressiveLots = lotSizes.map((qty) => {
    const fixedFeePerUnit = fixedFeeBrl / qty;
    const efficiencyDiscount = qty >= 50 ? 0.92 : qty >= 25 ? 0.95 : qty >= 10 ? 0.97 : 1.0;
    const adjustedUnitCost = unitDirectCostBrl * efficiencyDiscount;
    const unitPrice = ceilToCents((adjustedUnitCost + fixedFeePerUnit) / denominator);
    const netProfit = unitPrice - adjustedUnitCost - fixedFeePerUnit - unitPrice * variableRate;
    return {
      quantity: qty,
      unitPriceBrl: unitPrice,
      totalLotPriceBrl: Number((unitPrice * qty).toFixed(2)),
      realMarginPct: Number(((netProfit / unitPrice) * 100).toFixed(2)),
    };
  });

  return {
    valid: true,
    totalGramsPerUnit,
    materialCostBrl: Number(materialCostBrl.toFixed(2)),
    energyCostBrl: Number(energyCostBrl.toFixed(2)),
    depreciationMaintenanceBrl: Number(depreciationMaintenanceBrl.toFixed(2)),
    laborCostBrl: Number(laborCostBrl.toFixed(2)),
    packagingAndExtrasBrl: Number(packagingAndExtrasBrl.toFixed(2)),
    failureReserveBrl: Number(failureReserveBrl.toFixed(2)),
    unitDirectCostBrl: Number(unitDirectCostBrl.toFixed(2)),
    unitDirectCostCents,
    fixedFeeBrl,
    variableFeePct,
    targetMarginPct,
    denominator,
    rawUnitPriceBrl: Number(rawUnitPriceBrl.toFixed(4)),
    suggestedUnitPriceBrl,
    suggestedUnitPriceCents,
    suggestedLotPriceBrl,
    suggestedLotPriceCents,
    variableFeeAmountBrl: Number(variableFeeAmountBrl.toFixed(2)),
    totalDeductionsBrl: Number(totalDeductionsBrl.toFixed(2)),
    netUnitProfitBrl,
    netUnitProfitCents,
    realMarginPct,
    markupMultiplier,
    pixPriceBrl,
    pixNetProfitBrl,
    pixMarginPct,
    progressiveLots,
  };
}
