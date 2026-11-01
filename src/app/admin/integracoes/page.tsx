import React from 'react';
import { getDb } from '@/db';
import { HelpBalloon } from '@/components/HelpBalloon';
import { AdminSettingsClient } from '@/components/AdminSettingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminConfiguracoesPage() {
  const db = await getDb();

  const [team, jobs, audit] = await Promise.all([
    db.query<any>(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE role IN ('admin', 'operator', 'partner')
       ORDER BY role ASC, name ASC`
    ),
    db.query<any>('SELECT * FROM async_jobs ORDER BY id DESC LIMIT 15'),
    db.query<any>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 25'),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-4">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#563487] uppercase">
            Painel RBS → Configurações
          </span>
          <h1 className="mt-1 text-2xl font-black text-[#24232A] sm:text-3xl">
            Configurações, Conexões & Auditoria
          </h1>
          <p className="mt-1 text-xs text-[#5A5863]">
            Painel unificado para monitoramento de integrações, gestão de equipe, histórico auditado e diagnóstico de infraestrutura.
          </p>
        </div>
        <HelpBalloon moduleSlug="integracoes" />
      </div>

      <AdminSettingsClient team={team} jobs={jobs} audit={audit} />
    </div>
  );
}
