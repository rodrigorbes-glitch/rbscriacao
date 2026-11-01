import React from "react";
import { getDb } from "@/db";
import { formatBRLFromCents, formatDateTimeBR } from "@/lib/format";
import { HelpBalloon } from "@/components/HelpBalloon";
import { HELP_ARTICLES } from "@/lib/help-knowledge";
import { Users, MapPin, ShieldCheck, BellRing } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminClientesPage() {
  const db = await getDb();

  const [customers, addresses, alerts] = await Promise.all([
    db.query<any>(
      `SELECT u.id, u.name, u.email, u.phone, u.document_cpf_cnpj, u.role, u.email_verified, u.created_at,
              COUNT(o.id) AS orders_count,
              COALESCE(SUM(o.total_cents), 0) AS total_spent_cents
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       WHERE u.role IN ('customer', 'partner')
       GROUP BY u.id
       ORDER BY total_spent_cents DESC, u.created_at DESC`
    ),
    db.query<any>(
      `SELECT a.*, u.name AS user_name, u.email AS user_email
       FROM customer_addresses a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.is_default DESC, a.id DESC`
    ),
    db.query<any>(
      `SELECT ia.*, p.name AS product_name
       FROM interest_alerts ia
       JOIN products p ON p.id = ia.product_id
       ORDER BY ia.created_at DESC`
    ),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#563487]">
            RBS Operações → CRM, Endereços & Conformidade LGPD
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#24232A] mt-1">
            Clientes, Endereços & Consentimento LGPD
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Base unificada de compradores, histórico LTV, endereços validados por CEP e termos de consentimento de alertas.
          </p>
        </div>
        <HelpBalloon article={HELP_ARTICLES["inteligencia-comercial"]} />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-3xl border border-[#E6E2DA] p-6">
        <h2 className="font-bold text-[#24232A] mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#563487]" />
          Base de Clientes & Parceiros Cadastrados ({customers.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6E2DA] text-[11px] font-bold uppercase tracking-wider text-[#5A5863]">
                <th className="py-3 px-2">Cliente</th>
                <th className="py-3 px-2">Contato</th>
                <th className="py-3 px-2">CPF / CNPJ</th>
                <th className="py-3 px-2">Perfil</th>
                <th className="py-3 px-2">Pedidos</th>
                <th className="py-3 px-2">LTV (Total Comprado)</th>
                <th className="py-3 px-2">Status Conta</th>
                <th className="py-3 px-2">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2DA] text-xs text-[#24232A]">
              {customers.map((c: any) => (
                <tr key={c.id} className="hover:bg-[#F2EFE9]">
                  <td className="py-3 px-2 font-bold text-[#24232A]">{c.name}</td>
                  <td className="py-3 px-2">
                    <div className="text-[#24232A]">{c.email}</div>
                    <div className="text-[11px] text-[#5A5863]">{c.phone || "—"}</div>
                  </td>
                  <td className="py-3 px-2 font-mono text-[#5A5863]">{c.document_cpf_cnpj || "—"}</td>
                  <td className="py-3 px-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#F2EFE9] text-[#24232A] font-bold text-[10px] uppercase">
                      {c.role}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-bold text-[#24232A]">{Number(c.orders_count)}</td>
                  <td className="py-3 px-2 font-black text-emerald-800">
                    {formatBRLFromCents(Number(c.total_spent_cents))}
                  </td>
                  <td className="py-3 px-2">
                    {c.email_verified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" /> Verificado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#F2EFE9] text-[#5A5863] text-[10px] font-semibold">
                        Visitante / Pós-Compra
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-[#5A5863]">{formatDateTimeBR(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Saved Addresses & LGPD Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-[#E6E2DA] p-6">
          <h2 className="font-bold text-[#24232A] mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#563487]" />
            Endereços de Entrega Validados via CEP ({addresses.length})
          </h2>
          <div className="space-y-3">
            {addresses.map((a: any) => (
              <div key={a.id} className="p-3.5 rounded-2xl bg-[#FCFBF8] border border-[#E6E2DA] text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#24232A]">
                    {a.user_name} ({a.label})
                  </span>
                  <span className="font-mono text-[11px] font-bold text-[#563487]">CEP {a.cep}</span>
                </div>
                <p className="text-[#5A5863]">
                  {a.street}, {a.number} {a.complement ? `• ${a.complement}` : ""} — {a.neighborhood}, {a.city}/{a.state}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#E6E2DA] p-6">
          <h2 className="font-bold text-[#24232A] mb-4 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-[#563487]" />
            Registros de Consentimento Explícito (Alertas de Preço/Estoque)
          </h2>
          <div className="space-y-3">
            {alerts.map((al: any) => (
              <div key={al.id} className="p-3.5 rounded-2xl bg-[#FCFBF8] border border-[#E6E2DA] text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#24232A]">{al.visitor_email}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                    Opt-in LGPD Gravado ({al.channel})
                  </span>
                </div>
                <div className="text-[#24232A] font-semibold">{al.product_name}</div>
                <div className="text-[11px] text-[#5A5863] mt-1">
                  Modalidade: <strong className="text-[#563487]">{al.alert_type}</strong> • Status: {al.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
