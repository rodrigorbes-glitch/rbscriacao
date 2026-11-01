'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Send,
  FileCode2,
  ArrowRight,
} from 'lucide-react';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { formatBRLFromCents } from '@/lib/format';

interface CustomQuoteRecord {
  id: string;
  quote_number: string;
  client_name: string;
  project_title: string;
  preferred_material: string;
  quantity: number;
  status: string;
  quoted_price_cents: number | null;
  quoted_manufacturing_days: number | null;
  file_name: string | null;
  file_checksum_sha256: string | null;
}

const QUOTE_STAGE_LABELS: Record<string, { label: string; step: number; badge: string }> = {
  submitted: {
    label: '1. Solicitação recebida',
    step: 1,
    badge: 'bg-zinc-100 text-zinc-800 border-zinc-300',
  },
  analyzing: {
    label: '2. Em análise no estúdio',
    step: 2,
    badge: 'bg-sky-50 text-sky-900 border-sky-300',
  },
  quoted: {
    label: '3. Orçamento disponível',
    step: 3,
    badge: 'bg-amber-50 text-amber-900 border-amber-300',
  },
  approved: {
    label: '4. Aprovado • Aguardando pagamento',
    step: 4,
    badge: 'bg-[#F3EFFA] text-[#563487] border-[#D5C6EC]',
  },
  paid: {
    label: '5. Pago • Na fila de preparo',
    step: 5,
    badge: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  },
  in_production: {
    label: '6. Em produção no estúdio',
    step: 6,
    badge: 'bg-[#F3EFFA] text-[#563487] border-[#D5C6EC]',
  },
};

export default function PersonalizadosPage() {
  const [quotes, setQuotes] = useState<CustomQuoteRecord[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [intendedUse, setIntendedUse] = useState('decorativo');
  const [preferredMaterial, setPreferredMaterial] = useState('PLA');
  const [preferredColor, setPreferredColor] = useState('Preto Fosco');
  const [dimensionsDescription, setDimensionsDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [deadlineDesired, setDeadlineDesired] = useState('');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('meu-projeto-3d.stl');
  const [submitting, setSubmitting] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<{
    quoteNumber: string;
    checksum: string;
    privatePath: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadQuotes = async () => {
    const res = await fetch('/api/quotes');
    if (res.ok) {
      const data = await res.json();
      setQuotes(data.quotes || []);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientEmail,
          clientPhone,
          companyName,
          projectTitle,
          intendedUse,
          preferredMaterial,
          preferredColor,
          dimensionsDescription,
          quantity,
          deadlineDesired,
          description,
          fileName,
          fileSizeBytes: 2450120,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Falha ao enviar solicitação.');
      } else {
        setCreatedQuote({
          quoteNumber: data.quoteNumber,
          checksum: data.checksum,
          privatePath: data.privatePath,
        });
        await loadQuotes();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveQuote = async (quoteId: string) => {
    await fetch('/api/quotes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteId,
        status: 'approved',
        authorRole: 'client',
        authorName: 'Cliente (Portal Online)',
        message: 'Proposta e prazo aprovados pelo cliente!',
      }),
    });
    await loadQuotes();
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF8] text-[#24232A]">
      <StoreHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-[#E6E2DA] bg-[#F2EFE9] p-6 sm:p-10 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-7">
            <p className="text-xs font-semibold tracking-widest text-[#563487] uppercase">
              Projetos sob medida
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-[#24232A] sm:text-4xl">
              Pedir uma peça personalizada
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#5A5863]">
              Conte o que você deseja produzir, informe as medidas aproximadas ou envie seu arquivo
              3D (`.STL`, `.STEP`, `.OBJ`, `.3MF`). Analisamos o projeto, indicamos o material ideal
              e enviamos o orçamento detalhado com prazo de preparo.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-xl border border-[#E6E2DA] bg-white">
              <img
                src="/products/real/vasos-canelados-bicolor-macro.png"
                alt="Acabamento real de peça impressa em 3D no estúdio RBS Criação"
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Structured Quote Request Form */}
          <div className="lg:col-span-7">
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl border border-[#E6E2DA] bg-white p-6 sm:p-8"
            >
              <div>
                <h2 className="font-display text-xl font-semibold text-[#24232A]">
                  Solicitar orçamento
                </h2>
                <p className="mt-1 text-xs text-[#5A5863]">
                  Seus arquivos e referências ficam armazenados com privacidade em nosso estúdio.
                </p>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900">
                  {errorMsg}
                </div>
              )}

              {createdQuote && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-xs text-emerald-950">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                    <span>Solicitação #{createdQuote.quoteNumber} recebida com sucesso!</span>
                  </div>
                  <p className="mt-1.5 text-emerald-900">
                    Nossa equipe analisará seu pedido e responderá com valor e prazo de fabricação.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#24232A]">
                    Seu nome completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Rodrigo Souza"
                    className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#24232A]">
                    WhatsApp para retorno *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(21) 99999-9999"
                    className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#24232A]">
                    Seu e-mail *
                  </label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="voce@exemplo.com.br"
                    className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#24232A]">
                    Empresa ou escritório (opcional)
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nome da empresa"
                    className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#24232A]">
                    O que você deseja produzir? *
                  </label>
                  <input
                    type="text"
                    required
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Ex: Vaso sob medida para aparador, suporte de equipamento ou troféu"
                    className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#24232A]">
                    Onde a peça será usada? *
                  </label>
                  <select
                    value={intendedUse}
                    onChange={(e) => setIntendedUse(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A]"
                  >
                    <option value="decorativo">Decoração em ambiente interno</option>
                    <option value="funcional_mecanico">Peça funcional / suporte com peso</option>
                    <option value="externo_sol">Área externa / exposição ao sol</option>
                    <option value="contato_agua">Contato direto com água / plantas naturais</option>
                    <option value="lote_corporativo">Brinde corporativo ou evento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#24232A]">
                    Preferência de material (se souber)
                  </label>
                  <select
                    value={preferredMaterial}
                    onChange={(e) => setPreferredMaterial(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A]"
                  >
                    <option value="PLA">PLA / PLA Seda (Acabamento acetinado e decorativo)</option>
                    <option value="PETG">PETG (Resistente à água e maior firmeza)</option>
                    <option value="ABS">ABS (Alta resistência térmica)</option>
                    <option value="TPU">TPU Flexível</option>
                    <option value="Resina">Resina 8K (Esculturas com riqueza de detalhes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#24232A]">
                    Cor desejada
                  </label>
                  <input
                    type="text"
                    value={preferredColor}
                    onChange={(e) => setPreferredColor(e.target.value)}
                    placeholder="Ex: Cobre Seda, Preto Fosco, Branco"
                    className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#24232A]">
                    Quantidade de peças *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#24232A]">
                    Medidas aproximadas (cm ou mm)
                  </label>
                  <input
                    type="text"
                    value={dimensionsDescription}
                    onChange={(e) => setDimensionsDescription(e.target.value)}
                    placeholder="Ex: 18 cm de altura x 12 cm de largura"
                    className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#24232A]">
                    Para quando você precisa?
                  </label>
                  <input
                    type="text"
                    value={deadlineDesired}
                    onChange={(e) => setDeadlineDesired(e.target.value)}
                    placeholder="Ex: Até o dia 20"
                    className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#24232A]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#24232A]">
                    Arquivo 3D ou referência (opcional)
                  </label>
                  <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-dashed border-[#C5BEB2] bg-[#FCFBF8] p-4">
                    <FileCode2 className="h-7 w-7 shrink-0 text-[#563487]" />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Nome do arquivo (.STL, .STEP, .OBJ, .3MF, .PDF ou imagem)"
                        className="w-full rounded-lg border border-[#E6E2DA] bg-white px-3 py-2 text-xs text-[#24232A]"
                      />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#24232A]">
                    Descreva sua ideia ou necessidade *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Conte os detalhes da peça, como pretende usá-la e se precisa de encaixe específico..."
                    className="mt-1.5 w-full rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-3.5 text-sm text-[#24232A] focus:border-[#563487] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#563487] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#462970]"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? 'Enviando solicitação...' : 'Solicitar orçamento'}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Active Quotes Pipeline & Instant Approval */}
          <div className="space-y-5 lg:col-span-5">
            <div className="rounded-2xl border border-[#E6E2DA] bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-[#24232A]">
                Acompanhar solicitações
              </h2>
              <p className="mt-1 text-xs text-[#5A5863]">
                Consulte propostas enviadas pelo estúdio e aprove online para iniciar a fabricação.
              </p>

              <div className="mt-4 space-y-4">
                {quotes.map((q) => {
                  const st = QUOTE_STAGE_LABELS[q.status] || QUOTE_STAGE_LABELS.submitted;
                  return (
                    <div
                      key={q.id}
                      className="rounded-xl border border-[#E6E2DA] bg-[#FCFBF8] p-4 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[#563487]">#{q.quote_number}</span>
                        <span
                          className={`rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${st.badge}`}
                        >
                          {st.label}
                        </span>
                      </div>

                      <h3 className="font-display mt-2 text-sm font-semibold text-[#24232A]">
                        {q.project_title}
                      </h3>
                      <p className="mt-0.5 text-[#5A5863]">
                        Cliente: {q.client_name} • Material:{' '}
                        <strong className="text-[#24232A]">{q.preferred_material}</strong> • Qtd:{' '}
                        {q.quantity} un
                      </p>

                      {q.quoted_price_cents && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6E2DA] bg-white p-3">
                          <div>
                            <span className="block text-[10px] text-[#6E6B78] uppercase">
                              Orçamento RBS
                            </span>
                            <strong className="text-base font-bold text-[#24232A]">
                              {formatBRLFromCents(q.quoted_price_cents)}
                            </strong>
                            <span className="ml-1.5 text-[11px] text-[#5A5863]">
                              ({q.quoted_manufacturing_days || 3} dias úteis de preparo)
                            </span>
                          </div>

                          {q.status === 'quoted' && (
                            <button
                              type="button"
                              onClick={() => handleApproveQuote(q.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#563487] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#462970]"
                            >
                              <span>Aprovar orçamento</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
