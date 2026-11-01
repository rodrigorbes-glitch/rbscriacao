import React from 'react';
import { getDb } from '@/db';
import { HelpBalloon } from '@/components/HelpBalloon';
import { AdminKanbanClient, type KanbanJobDTO } from '@/components/AdminKanbanClient';

export const dynamic = 'force-dynamic';

export default async function AdminProducaoKanbanPage() {
  const db = await getDb();

  const jobs = await db.query<KanbanJobDTO>(
    `SELECT pj.*, p.name as product_name, o.order_number
     FROM production_jobs pj
     LEFT JOIN products p ON p.id = pj.product_id
     LEFT JOIN orders o ON o.id = pj.order_id
     ORDER BY pj.created_at DESC`
  );

  const failures = await db.query<{
    id: string;
    wasted_grams: number;
    waste_cost_cents: number;
    failure_reason: string;
    recorded_by: string;
    batch_code: string;
    created_at: string;
  }>(
    `SELECT pf.*, pj.batch_code
     FROM production_failures pf
     JOIN production_jobs pj ON pj.id = pf.production_job_id
     ORDER BY pf.created_at DESC`
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#563487] uppercase">
            RBS Operações → Produção / Kanban de Impressão 3D
          </span>
          <h1 className="mt-1 text-2xl font-black text-[#24232A] sm:text-3xl">
            Esteira Kanban 3D, Consumo de Filamento (g) & Registro de Reimpressões
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Avance ordens entre as 6 etapas da fazenda de impressão. O consumo produtivo e eventuais falhas abatem gramas reais da bobina e alimentam o CMV.
          </p>
        </div>
        <HelpBalloon moduleSlug="producao" />
      </div>

      <AdminKanbanClient jobs={jobs} />

      <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6">
        <h2 className="text-base font-extrabold text-[#24232A]">
          Histórico Auditado de Falhas de Impressão & Reimpressões ({failures.length})
        </h2>
        <div className="mt-4 space-y-2.5 text-xs">
          {failures.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-[#FCFBF8] p-4"
            >
              <div>
                <span className="font-mono font-bold text-rose-700">{f.batch_code}</span>
                <strong className="ml-2 text-[#24232A]">{f.failure_reason}</strong>
                <span className="block text-[11px] text-[#5A5863]">
                  Registrado por: {f.recorded_by}
                </span>
              </div>
              <div className="text-right">
                <span className="block font-bold text-rose-700">
                  Perda: {f.wasted_grams} g de filamento
                </span>
                <span className="text-[11px] text-[#5A5863]">
                  Custo absorvido no CMV: R$ {(f.waste_cost_cents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
