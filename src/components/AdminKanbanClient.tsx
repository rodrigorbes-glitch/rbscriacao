'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertTriangle, CheckCircle2, Printer } from 'lucide-react';

export interface KanbanJobDTO {
  id: string;
  order_id: string | null;
  batch_code: string;
  printer_name: string;
  stage: string;
  priority: string;
  quantity: number;
  estimated_grams: number;
  actual_grams_consumed: number;
  wasted_grams: number;
  estimated_minutes: number;
  operator_notes: string | null;
  product_name: string | null;
  order_number: string | null;
}

const STAGES: Array<{ id: KanbanJobDTO['stage']; label: string; next?: KanbanJobDTO['stage'] }> = [
  { id: 'awaiting_payment', label: '1. Aguardando Pagamento', next: 'queued' },
  { id: 'queued', label: '2. Fila de Impressão', next: 'printing' },
  { id: 'printing', label: '3. Em Impressão 3D', next: 'post_processing' },
  { id: 'post_processing', label: '4. Acabamento & Cura', next: 'ready_to_ship' },
  { id: 'ready_to_ship', label: '5. Pronto para Envio', next: 'shipped' },
  { id: 'shipped', label: '6. Enviado / Concluído' },
];

export function AdminKanbanClient({ jobs }: { jobs: KanbanJobDTO[] }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');
  const [failingJobId, setFailingJobId] = useState<string | null>(null);
  const [wastedGrams, setWastedGrams] = useState('35');
  const [failureReason, setFailureReason] = useState('Descolamento de suporte na camada inicial');

  const handleAdvance = async (jobId: string, nextStage: string) => {
    setFeedback('');
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'advance_job',
        jobId,
        newStage: nextStage,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setFeedback(
        data.newlyConsumedGrams > 0
          ? `Etapa avançada para "${nextStage}"! Consumo real de ${data.newlyConsumedGrams} g deduzido do estoque de filamento e lançado no CMV.`
          : `Etapa da Ordem de Produção avançada para "${nextStage}".`
      );
      router.refresh();
    }
  };

  const handleRecordFailure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!failingJobId) return;
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'record_failure',
        jobId: failingJobId,
        wastedGrams: Number(wastedGrams),
        failureReason,
        reprintTriggered: true,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setFeedback(
        `Falha registrada: ${data.wastedGrams} g abatidos como perda de impressão e reimpressão iniciada!`
      );
      setFailingJobId(null);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
          {feedback}
        </div>
      )}

      {failingJobId && (
        <form
          onSubmit={handleRecordFailure}
          className="space-y-3 rounded-2xl border border-rose-300 bg-white p-5 text-xs"
        >
          <div className="flex items-center justify-between">
            <strong className="text-sm text-rose-800">
              Registrar Falha de Impressão 3D & Disparar Reimpressão
            </strong>
            <button
              type="button"
              onClick={() => setFailingJobId(null)}
              className="text-[#5A5863] hover:text-[#24232A]"
            >
              Cancelar
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-bold text-[#5A5863]">Filamento Perdido (g)</label>
              <input
                type="number"
                min="1"
                required
                value={wastedGrams}
                onChange={(e) => setWastedGrams(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-[#5A5863]">Motivo Técnico da Falha</label>
              <input
                type="text"
                required
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500"
          >
            Confirmar Perda em Gramas e Reiniciar Impressão
          </button>
        </form>
      )}

      {/* 6-Column Kanban Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {STAGES.map((col) => {
          const colJobs = jobs.filter((j) => j.stage === col.id);
          return (
            <div
              key={col.id}
              className="flex flex-col rounded-2xl border border-[#E6E2DA] bg-white p-3.5"
            >
              <div className="flex items-center justify-between border-b border-[#E6E2DA] pb-2.5">
                <h3 className="text-xs font-extrabold text-[#24232A]">{col.label}</h3>
                <span className="rounded-full bg-[#F2EFE9] px-2 py-0.5 text-[10px] font-bold text-[#563487]">
                  {colJobs.length}
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {colJobs.map((job) => (
                  <div
                    key={job.id}
                    className="space-y-2 rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#563487]">{job.batch_code}</span>
                      {job.order_number && (
                        <span className="font-mono text-[10px] text-[#5A5863]">
                          #{job.order_number}
                        </span>
                      )}
                    </div>

                    <strong className="block text-[#24232A]">
                      {job.quantity}x {job.product_name || 'Peça 3D RBS'}
                    </strong>

                    <div className="flex items-center gap-1 text-[11px] text-[#5A5863]">
                      <Printer className="h-3 w-3 text-sky-800" />
                      <span>{job.printer_name}</span>
                    </div>

                    <div className="text-[11px] text-[#5A5863]">
                      Previsto: <strong>{job.estimated_grams} g</strong> • {job.estimated_minutes} min
                      {job.actual_grams_consumed > 0 && (
                        <span className="block text-emerald-800">
                          Consumido: {job.actual_grams_consumed} g
                        </span>
                      )}
                      {job.wasted_grams > 0 && (
                        <span className="block text-rose-700">
                          Perda falha: {job.wasted_grams} g
                        </span>
                      )}
                    </div>

                    {job.operator_notes && (
                      <p className="rounded bg-white p-2 text-[10px] text-[#5A5863]">
                        {job.operator_notes}
                      </p>
                    )}

                    <div className="flex flex-col gap-1.5 pt-1">
                      {col.next && (
                        <button
                          type="button"
                          onClick={() => handleAdvance(job.id, col.next!)}
                          className="flex items-center justify-center gap-1 rounded-lg bg-[#563487] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#462970]"
                        >
                          <span>Avançar Etapa</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                      {col.id !== 'shipped' && (
                        <button
                          type="button"
                          onClick={() => setFailingJobId(job.id)}
                          className="flex items-center justify-center gap-1 rounded-lg border border-rose-300 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold text-rose-800 hover:bg-rose-500/20"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Registrar Falha (g)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
