'use client';

import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Zap,
  Save,
} from 'lucide-react';
import { HelpBalloon } from '@/components/HelpBalloon';
import { calculate3DPricing, type PricingOutput } from '@/lib/pricing';
import { formatBRL } from '@/lib/format';

export default function AdminPrecificadorPage() {
  const [mode, setMode] = useState<'fast' | 'advanced'>('fast');
  const [directCostOverride, setDirectCostOverride] = useState<string>('30.00');
  const [partGrams, setPartGrams] = useState<string>('195');
  const [supportPurgeGrams, setSupportPurgeGrams] = useState<string>('20');
  const [filamentCostPerKgBrl, setFilamentCostPerKgBrl] = useState<string>('120');
  const [printMinutes, setPrintMinutes] = useState<string>('245');
  const [postProcessMinutes, setPostProcessMinutes] = useState<string>('15');
  const [packagingBrl, setPackagingBrl] = useState<string>('3.50');
  const [extraInputsBrl, setExtraInputsBrl] = useState<string>('0');
  const [failureRatePct, setFailureRatePct] = useState<string>('5');

  const [fixedFeeBrl, setFixedFeeBrl] = useState<string>('2.00');
  const [variableFeePct, setVariableFeePct] = useState<string>('10.0');
  const [targetMarginPct, setTargetMarginPct] = useState<string>('25.0');
  const [lotQuantity, setLotQuantity] = useState<string>('1');
  const [productId, setProductId] = useState<string>('prod-vaso-voronoi');
  const [savedFeedback, setSavedFeedback] = useState<string>('');

  const result: PricingOutput = calculate3DPricing({
    mode,
    directUnitCostOverrideBrl:
      mode === 'fast' && directCostOverride !== '' ? Number(directCostOverride) : null,
    partGrams: Number(partGrams),
    supportPurgeGrams: Number(supportPurgeGrams),
    filamentCostPerKgBrl: Number(filamentCostPerKgBrl),
    printMinutes: Number(printMinutes),
    postProcessMinutes: Number(postProcessMinutes),
    packagingBrl: Number(packagingBrl),
    extraInputsBrl: Number(extraInputsBrl),
    failureRatePct: Number(failureRatePct),
    fixedFeeBrl: Number(fixedFeeBrl),
    variableFeePct: Number(variableFeePct),
    targetMarginPct: Number(targetMarginPct),
    lotQuantity: Number(lotQuantity),
  });

  const loadBenchmark4924 = () => {
    setMode('fast');
    setDirectCostOverride('30.00');
    setFixedFeeBrl('2.00');
    setVariableFeePct('10.0');
    setTargetMarginPct('25.0');
    setLotQuantity('1');
    setSavedFeedback(
      'Cenário de auditoria carregado: (30 + 2) / (1 - 0,10 - 0,25) = 32 / 0,65 = R$ 49,2307... → Preço mínimo exato = R$ 49,24.'
    );
  };

  const handleSaveOrApply = async (applyToProduct: boolean) => {
    setSavedFeedback('');
    const res = await fetch('/api/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        directUnitCostOverrideBrl:
          mode === 'fast' && directCostOverride !== '' ? Number(directCostOverride) : null,
        partGrams: Number(partGrams),
        supportPurgeGrams: Number(supportPurgeGrams),
        filamentCostPerKgBrl: Number(filamentCostPerKgBrl),
        printMinutes: Number(printMinutes),
        postProcessMinutes: Number(postProcessMinutes),
        packagingBrl: Number(packagingBrl),
        extraInputsBrl: Number(extraInputsBrl),
        failureRatePct: Number(failureRatePct),
        fixedFeeBrl: Number(fixedFeeBrl),
        variableFeePct: Number(variableFeePct),
        targetMarginPct: Number(targetMarginPct),
        lotQuantity: Number(lotQuantity),
        productId,
        saveSimulation: true,
        applyToProduct,
      }),
    });
    if (res.ok) {
      setSavedFeedback(
        applyToProduct
          ? `Preço de ${formatBRL(result.suggestedUnitPriceBrl)} aplicado ao produto no catálogo e registrado no log de auditoria!`
          : 'Simulação salva no histórico do Precificador 3D!'
      );
    }
  };

  useEffect(() => {
    // Allow URL query ?product=...
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('product');
      if (p) setProductId(p);
    }
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#563487] uppercase">
            RBS Operações → Precificador & Simulador 3D
          </span>
          <h1 className="mt-1 text-2xl font-black text-[#24232A] sm:text-3xl">
            Precificador Técnico de Impressão 3D (Peça, Lote & Canal)
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Cálculo exato de margem sobre o preço de venda: Preço = (Custo Direto + Taxa Fixa) / (1 − Taxa% − Margem%).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadBenchmark4924}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-500/25"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Carregar Teste R$ 49,24 (Custo 30 + Taxa 2 + 10% + Margem 25%)
          </button>
          <HelpBalloon moduleSlug="precificador" />
        </div>
      </div>

      {savedFeedback && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900">
          <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-emerald-800" />
          {savedFeedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Inputs */}
        <div className="space-y-6 rounded-3xl border border-[#E6E2DA] bg-white p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E2DA] pb-4">
            <div className="flex rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-1 text-xs">
              <button
                type="button"
                onClick={() => setMode('fast')}
                className={`rounded-lg px-3.5 py-1.5 font-bold ${
                  mode === 'fast' ? 'bg-[#563487] text-white' : 'text-[#5A5863] hover:text-[#24232A]'
                }`}
              >
                Modo Rápido (Custo Direto)
              </button>
              <button
                type="button"
                onClick={() => setMode('advanced')}
                className={`rounded-lg px-3.5 py-1.5 font-bold ${
                  mode === 'advanced' ? 'bg-[#563487] text-white' : 'text-[#5A5863] hover:text-[#24232A]'
                }`}
              >
                Modo Engenharia 3D (Gramas + kWh + Máquina)
              </button>
            </div>

            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-xs text-[#24232A]"
            >
              <option value="prod-vaso-voronoi">Vaso Voronoi Orgânico Escultural</option>
              <option value="prod-luminaria-lua">Luminária Lua Cheia Litofania 3D</option>
              <option value="prod-suporte-headset">Suporte de Headset Low-Poly Carbon</option>
              <option value="prod-organizador-grid">Kit Organizador Modular Grid-Pro</option>
              <option value="prod-dragao-articulado">Dragão Imperial Articulado</option>
              <option value="prod-chaveiro-nfc-lote">Pack 25 Chaveiros Corporativos NFC</option>
              <option value="prod-escultura-resina">Escultura Busto Minimalista Resina 8K</option>
              <option value="prod-cachepot-autodrenante">Cachepot Autodrenante Geométrico</option>
            </select>
          </div>

          {mode === 'fast' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="sm:col-span-2 rounded-2xl border border-[#D5C6EC] bg-[#FCFBF8] p-4">
                <label className="block font-bold text-[#563487]">
                  Custo Direto Unitário Total da Peça (R$)
                </label>
                <p className="mt-0.5 text-[11px] text-[#5A5863]">
                  Inclui filamento, suporte, energia, depreciação, acabamento e embalagem (ex: R$ 30,00).
                </p>
                <input
                  type="number"
                  step="0.01"
                  value={directCostOverride}
                  onChange={(e) => setDirectCostOverride(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#D5CFC4] bg-white px-3.5 py-2.5 text-sm font-bold text-[#24232A]"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
              <div>
                <label className="block font-bold text-[#5A5863]">Peso Líquido Peça (g)</label>
                <input
                  type="number"
                  value={partGrams}
                  onChange={(e) => setPartGrams(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#5A5863]">Suporte + Purga AMS (g)</label>
                <input
                  type="number"
                  value={supportPurgeGrams}
                  onChange={(e) => setSupportPurgeGrams(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#5A5863]">Custo Filamento (R$/kg)</label>
                <input
                  type="number"
                  value={filamentCostPerKgBrl}
                  onChange={(e) => setFilamentCostPerKgBrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#5A5863]">Tempo Impressão (min)</label>
                <input
                  type="number"
                  value={printMinutes}
                  onChange={(e) => setPrintMinutes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#5A5863]">Pós-Processamento (min)</label>
                <input
                  type="number"
                  value={postProcessMinutes}
                  onChange={(e) => setPostProcessMinutes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#5A5863]">Embalagem + Berço (R$)</label>
                <input
                  type="number"
                  step="0.1"
                  value={packagingBrl}
                  onChange={(e) => setPackagingBrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#5A5863]">Insumos Extras / NFC (R$)</label>
                <input
                  type="number"
                  step="0.1"
                  value={extraInputsBrl}
                  onChange={(e) => setExtraInputsBrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#5A5863]">Reserva de Falha (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={failureRatePct}
                  onChange={(e) => setFailureRatePct(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
                />
              </div>
            </div>
          )}

          {/* Commercial & Margin Parameters */}
          <div className="grid grid-cols-1 gap-4 border-t border-[#E6E2DA] pt-4 sm:grid-cols-4 text-xs">
            <div>
              <label className="block font-bold text-[#5A5863]">Taxa Fixa Canal (R$)</label>
              <input
                type="number"
                step="0.01"
                value={fixedFeeBrl}
                onChange={(e) => setFixedFeeBrl(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#5A5863]">Taxa Variável Canal (%)</label>
              <input
                type="number"
                step="0.1"
                value={variableFeePct}
                onChange={(e) => setVariableFeePct(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#563487]">Margem Líquida Alvo (%)</label>
              <input
                type="number"
                step="0.5"
                value={targetMarginPct}
                onChange={(e) => setTargetMarginPct(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#563487] bg-[#FCFBF8] px-3 py-2 font-bold text-[#24232A]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#5A5863]">Qtd do Lote</label>
              <input
                type="number"
                min="1"
                value={lotQuantity}
                onChange={(e) => setLotQuantity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={!result.valid}
              onClick={() => handleSaveOrApply(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D5CFC4] bg-[#F2EFE9] px-4 py-2.5 text-xs font-bold text-[#24232A] hover:bg-[#E6E2DA]"
            >
              <Save className="h-4 w-4" />
              Salvar Cenário no Histórico
            </button>
            <button
              type="button"
              disabled={!result.valid}
              onClick={() => handleSaveOrApply(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#563487] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#462970]"
            >
              <Zap className="h-4 w-4" />
              Aplicar Preço Sugerido ao Produto Selecionado
            </button>
          </div>
        </div>

        {/* Right Column: Live Mathematical Output */}
        <div className="space-y-5 lg:col-span-5">
          {!result.valid ? (
            <div className="rounded-3xl border border-rose-300 bg-rose-50 p-6 text-xs text-rose-900">
              <AlertTriangle className="mb-2 h-6 w-6 text-rose-700" />
              <strong className="block text-sm text-[#24232A]">Parâmetros Inválidos</strong>
              <p className="mt-1">{result.error}</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-emerald-300 bg-white p-6 shadow-2xl">
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">
                Resultado Auditado (Teto em Centavos p/ Garantir Margem)
              </span>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="block text-xs text-[#5A5863]">Preço Unitário Sugerido:</span>
                  <span className="text-4xl font-black text-[#24232A]">
                    {formatBRL(result.suggestedUnitPriceBrl)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-xs text-[#5A5863]">Margem Líquida Real:</span>
                  <span className="text-2xl font-extrabold text-emerald-800">
                    {result.realMarginPct.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2 border-t border-[#E6E2DA] pt-4 text-xs">
                <div className="flex justify-between text-[#5A5863]">
                  <span>Custo Direto Unitário Apurado:</span>
                  <strong>{formatBRL(result.unitDirectCostBrl)}</strong>
                </div>
                <div className="flex justify-between text-[#5A5863]">
                  <span>Taxa Fixa + Taxa Variável ({result.variableFeePct}%):</span>
                  <strong className="text-rose-700">− {formatBRL(result.totalDeductionsBrl)}</strong>
                </div>
                <div className="flex justify-between text-[#5A5863]">
                  <span>Denominador da Fórmula (1 − Taxa% − Margem%):</span>
                  <strong className="font-mono text-[#563487]">{result.denominator}</strong>
                </div>
                <div className="flex justify-between border-t border-[#E6E2DA] pt-2 text-sm font-bold text-emerald-800">
                  <span>Lucro Líquido por Peça:</span>
                  <span>{formatBRL(result.netUnitProfitBrl)}</span>
                </div>
                <div className="flex justify-between text-xs text-sky-900">
                  <span>Preço à Vista no Pix (-5%):</span>
                  <strong>
                    {formatBRL(result.pixPriceBrl)} (Lucro Pix: {formatBRL(result.pixNetProfitBrl)})
                  </strong>
                </div>
              </div>

              {/* Progressive Lot Table */}
              <div className="mt-5 border-t border-[#E6E2DA] pt-4">
                <span className="block text-xs font-bold text-[#24232A]">
                  Simulação Progressiva por Lote (Diluição de Taxa Fixa e Setup):
                </span>
                <div className="mt-2 space-y-1.5 text-xs">
                  {result.progressiveLots.map((lot) => (
                    <div
                      key={lot.quantity}
                      className="flex items-center justify-between rounded-xl bg-[#FCFBF8] px-3 py-2 border border-[#E6E2DA]"
                    >
                      <span className="font-bold text-[#5A5863]">{lot.quantity} un</span>
                      <span className="text-[#24232A]">{formatBRL(lot.unitPriceBrl)} / un</span>
                      <span className="text-emerald-800 font-bold">
                        Total: {formatBRL(lot.totalLotPriceBrl)} ({lot.realMarginPct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
