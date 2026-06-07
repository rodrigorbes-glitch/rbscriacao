'use client';

import { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';

export default function PricingCalculatorPage() {
  // Inputs
  const [custosDiretos, setCustosDiretos] = useState<number | ''>('');
  const [impostos, setImpostos] = useState<number | ''>('');
  const [comissao, setComissao] = useState<number | ''>('');
  const [margemDesejada, setMargemDesejada] = useState<number | ''>('');
  const [precoPraticado, setPrecoPraticado] = useState<number | ''>('');

  // Resultados
  const [precoSugerido, setPrecoSugerido] = useState<number>(0);
  const [markup, setMarkup] = useState<number>(0);
  const [lucroReal, setLucroReal] = useState<number>(0);
  const [margemReal, setMargemReal] = useState<number>(0);
  const [valorComissao, setValorComissao] = useState<number>(0);
  const [valorImposto, setValorImposto] = useState<number>(0);
  const [custoTotal, setCustoTotal] = useState<number>(0);

  // Lógica Reativa
  useEffect(() => {
    const c = Number(custosDiretos) || 0;
    const i = Number(impostos) || 0;
    const com = Number(comissao) || 0;
    const m = Number(margemDesejada) || 0;
    const p = Number(precoPraticado) || 0;

    // Proteção contra divisão por zero e margens irreais (soma >= 100)
    const somaTaxas = i + com + m;
    let multiplier = 0;
    let sugerido = 0;

    if (somaTaxas < 100) {
      multiplier = 100 / (100 - somaTaxas);
      sugerido = c * multiplier;
    } else {
      multiplier = 0; // Inválido
      sugerido = 0;
    }

    setMarkup(multiplier);
    setPrecoSugerido(sugerido);

    // Preço Base de Cálculo
    const precoBase = p > 0 ? p : sugerido;

    // Valores Nominais
    const vComissao = precoBase * (com / 100);
    const vImposto = precoBase * (i / 100);
    const cTotal = c + vComissao + vImposto;
    
    const lucro = precoBase - cTotal;
    const margemL = precoBase > 0 ? (lucro / precoBase) * 100 : 0;

    setValorComissao(vComissao);
    setValorImposto(vImposto);
    setCustoTotal(cTotal);
    setLucroReal(lucro);
    setMargemReal(margemL);

  }, [custosDiretos, impostos, comissao, margemDesejada, precoPraticado]);

  const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatPercent = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0.00%';
    return value.toFixed(2) + '%';
  };

  const isInvalidMargin = (Number(impostos) || 0) + (Number(comissao) || 0) + (Number(margemDesejada) || 0) >= 100;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header Minimalista */}
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ 
          fontFamily: 'var(--font-montserrat), sans-serif', 
          fontSize: '2rem', 
          fontWeight: 800, 
          color: '#1A1A1A',
          marginBottom: '0.5rem'
        }}>
          Calculadora de Precificação 🧮
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Simule cenários e encontre o preço de venda ideal para garantir a sua margem de lucro.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
        
        {/* LADO ESQUERDO: INPUTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '1rem', border: '1px solid #EAEAEA', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontSize: '1.25rem', fontWeight: 700, color: '#1A1A1A', marginBottom: '1.5rem' }}>
              Custos & Margens
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Input 
                label="Custo de Produção (R$)"
                type="number"
                placeholder="Ex: 15.50"
                value={custosDiretos}
                onChange={e => setCustosDiretos(e.target.value === '' ? '' : Number(e.target.value))}
                min={0}
                step="0.01"
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input 
                  label="Impostos / Taxas (%)"
                  type="number"
                  placeholder="Ex: 6.0"
                  value={impostos}
                  onChange={e => setImpostos(e.target.value === '' ? '' : Number(e.target.value))}
                  min={0}
                  step="0.1"
                />
                
                <Input 
                  label="Comissão de Venda (%)"
                  type="number"
                  placeholder="Ex: 10.0"
                  value={comissao}
                  onChange={e => setComissao(e.target.value === '' ? '' : Number(e.target.value))}
                  min={0}
                  step="0.1"
                />
              </div>

              <Input 
                label="Margem de Lucro Desejada (%)"
                type="number"
                placeholder="Ex: 30.0"
                value={margemDesejada}
                onChange={e => setMargemDesejada(e.target.value === '' ? '' : Number(e.target.value))}
                min={0}
                step="0.1"
              />

              {isInvalidMargin && (
                <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                  ⚠️ A soma das taxas e margem não pode ultrapassar ou igualar 100%. Verifique os valores.
                </div>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '1rem', border: '1px solid #EAEAEA', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontSize: '1.25rem', fontWeight: 700, color: '#1A1A1A', marginBottom: '0.5rem' }}>
              Ajuste Manual
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              Se você preencher este campo, o sistema ignorará o Preço Sugerido e calculará seu lucro real com base no valor digitado.
            </p>
            
            <Input 
              label="Preço Praticado na Loja (R$)"
              type="number"
              placeholder="Ex: 49.90"
              value={precoPraticado}
              onChange={e => setPrecoPraticado(e.target.value === '' ? '' : Number(e.target.value))}
              min={0}
              step="0.01"
            />
          </div>

        </div>

        {/* LADO DIREITO: RESULTADOS (Premium) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card Principal: Preço Sugerido */}
          <div style={{ 
            backgroundColor: '#1A1A1A', 
            padding: '2.5rem 2rem', 
            borderRadius: '1rem', 
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(26,26,26,0.3)'
          }}>
            <h3 style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#F2D5A1', marginBottom: '0.5rem' }}>
              Preço Sugerido
            </h3>
            <div style={{ fontSize: '3.5rem', fontWeight: 800, fontFamily: 'var(--font-inter), sans-serif', marginBottom: '0.5rem', textDecoration: precoPraticado ? 'line-through' : 'none', opacity: precoPraticado ? 0.5 : 1 }}>
              {formatCurrency(precoSugerido)}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#aaa' }}>
              Markup Multiplicador: {multiplierToDisplay(markup)}x
            </div>
          </div>

          {/* Cards de Distribuição Financeira */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div style={{ backgroundColor: '#fff', padding: '1.25rem 1rem', borderRadius: '1rem', border: '1px solid #EAEAEA' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Impostos</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1A1A1A' }}>{formatCurrency(valorImposto)}</div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '1.25rem 1rem', borderRadius: '1rem', border: '1px solid #EAEAEA' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Comissões</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1A1A1A' }}>{formatCurrency(valorComissao)}</div>
            </div>
            <div style={{ backgroundColor: '#FEF2F2', padding: '1.25rem 1rem', borderRadius: '1rem', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: '0.8rem', color: '#DC2626', marginBottom: '0.25rem', fontWeight: 600 }}>Custo Total</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#B91C1C' }}>{formatCurrency(custoTotal)}</div>
            </div>
          </div>

          {/* Card de Lucratividade Final */}
          <div style={{ 
            backgroundColor: '#F2D5A1', // Dourado Champanhe
            padding: '2rem', 
            borderRadius: '1rem', 
            color: '#1A1A1A',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <h3 style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              Lucratividade Real
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(26,26,26,0.1)', paddingBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Lucro Líquido (R$)</div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(lucroReal)}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Margem Líquida (%)</div>
              <div style={{ 
                fontSize: '1.25rem', 
                fontWeight: 800,
                color: margemReal < Number(margemDesejada) ? '#DC2626' : '#1A1A1A' // Fica vermelho se estiver abaixo da meta
              }}>
                {formatPercent(margemReal)}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// Helper
function multiplierToDisplay(multiplier: number) {
  if (isNaN(multiplier) || !isFinite(multiplier) || multiplier <= 0) return '0.00';
  return multiplier.toFixed(2);
}
