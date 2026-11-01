import React from 'react';
import { getDb } from '@/db';
import { HelpBalloon } from '@/components/HelpBalloon';
import { AdminPartnersClient } from '@/components/AdminPartnersClient';
import { formatBRLFromCents, formatDateBR } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminParceirosPage() {
  const db = await getDb();

  const [partners, consignmentItems, products, comodatoAssets, commissions] = await Promise.all([
    db.query<any>('SELECT * FROM partners ORDER BY created_at ASC'),
    db.query<any>(
      `SELECT ci.*, p.name as product_name, p.sku, cs.shipment_code, prt.name as partner_name
       FROM consignment_items ci
       JOIN products p ON p.id = ci.product_id
       JOIN consignment_shipments cs ON cs.id = ci.shipment_id
       JOIN partners prt ON prt.id = cs.partner_id
       ORDER BY ci.id DESC`
    ),
    db.query<any>('SELECT id, name, sku, price_cents FROM products WHERE is_active = TRUE ORDER BY name ASC'),
    db.query<any>('SELECT * FROM comodato_assets ORDER BY id ASC'),
    db.query<any>(
      `SELECT pc.*, o.order_number, prt.name as partner_name
       FROM partner_commissions pc
       LEFT JOIN orders o ON o.id = pc.order_id
       LEFT JOIN partners prt ON prt.id = pc.partner_id
       ORDER BY pc.created_at DESC`
    ),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#563487] uppercase">
            RBS Operações → Área Restrita de Parceiros, Consignação, Percentuais & Compras Recorrentes
          </span>
          <h1 className="mt-1 text-2xl font-black text-[#24232A] sm:text-3xl">
            Gestão de Consignação, Percentuais de Comissão e Compras Recorrentes
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Módulo administrativo restrito para controle de produtos deixados em consignação, baixa de vendas, edição de percentuais de comissão/desconto e faturamento recorrente de revenda.
          </p>
        </div>
        <HelpBalloon moduleSlug="parceiros" />
      </div>

      {/* Interactive Consignment, Rates & Recurring Purchases Workbench */}
      <AdminPartnersClient
        partners={partners}
        consignmentItems={consignmentItems}
        products={products}
      />

      {/* Comodato Assets & Commissions History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
          <h2 className="text-base font-extrabold text-[#24232A]">
            3. Bens Cedidos em Comodato (Expositores & Mostruários Físicos)
          </h2>
          <p className="mt-1 text-xs text-[#5A5863]">
            Controle patrimonial separado dos produtos consignados para venda.
          </p>
          <div className="mt-4 space-y-3 text-xs">
            {comodatoAssets.map((ca: any) => (
              <div key={ca.id} className="rounded-2xl border border-[#E6E2DA] bg-[#FCFBF8] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sky-800">{ca.asset_code}</span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Estado: {ca.condition_status}
                  </span>
                </div>
                <strong className="mt-1 block text-[#24232A]">{ca.asset_name}</strong>
                <p className="mt-1 text-[#5A5863]">
                  Valor patrimonial: <strong className="text-[#24232A]">{formatBRLFromCents(ca.declared_value_cents)}</strong> • Devolução/Revisão: {formatDateBR(ca.return_due_date)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
          <h2 className="text-base font-extrabold text-[#24232A]">
            4. Extrato de Comissões & Acertos Gerados
          </h2>
          <p className="mt-1 text-xs text-[#5A5863]">
            Histórico de comissões apuradas sobre vendas por cupom e acertos de consignação.
          </p>
          <div className="mt-4 space-y-3 text-xs">
            {commissions.map((cm: any) => (
              <div
                key={cm.id}
                className="flex items-center justify-between rounded-2xl border border-[#E6E2DA] bg-[#FCFBF8] p-4"
              >
                <div>
                  <span className="font-bold text-[#24232A] block">
                    {cm.partner_name || 'Parceiro RBS'} • {cm.origin_type === 'consignment_sale' ? 'Venda Consignada' : `Pedido #${cm.order_number || 'RBS-2026-1001'}`}
                  </span>
                  <span className="text-[#5A5863]">
                    Base: {formatBRLFromCents(cm.calculation_base_cents)} • Alíquota: {cm.commission_rate_pct}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-black text-emerald-800">
                    {formatBRLFromCents(cm.commission_amount_cents)}
                  </span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                    {cm.status === 'paid' ? 'Conciliada' : 'Aprovada'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
