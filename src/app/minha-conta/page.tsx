'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { pedidosAPI } from '@/services/api';
import { Pedido } from '@/types/models';
import Button from '@/components/ui/Button';

export default function MinhaContaDashboard() {
  const { user, userData, logout } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      if (!user) return;
      try {
        // Blindagem de Isolamento: Busca APENAS os pedidos do UID atual
        // Respeitando as regras de segurança recém-criadas no Firestore
        const meusPedidos = await pedidosAPI.getByUserId(user.uid);
        
        // Ordena pelos mais recentes
        meusPedidos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setPedidos(meusPedidos);
      } catch (error) {
        console.error('Erro ao carregar pedidos', error);
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pago': return <span style={{ backgroundColor: '#e6f4ea', color: '#1e8e3e', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Pago</span>;
      case 'pendente': return <span style={{ backgroundColor: '#fef7e0', color: '#b06000', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Pendente</span>;
      case 'rejeitado': return <span style={{ backgroundColor: '#fce8e6', color: '#d93025', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Recusado</span>;
      default: return <span style={{ backgroundColor: '#e8eaed', color: '#5f6368', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{status.toUpperCase()}</span>;
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Carregando seus dados...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '3rem', alignItems: 'start' }}>
      
      {/* SIDEBAR B2C */}
      <aside style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '50%', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
            👤
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{userData?.nome || 'Cliente'}</h2>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>{user?.email}</p>
          
          {userData?.tipo === 'b2b_pendente' && (
             <div style={{ marginTop: '1rem', backgroundColor: '#fef7e0', color: '#b06000', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600 }}>
               Parceria B2B em Análise
             </div>
          )}
          {userData?.tipo === 'b2b_aprovado' && (
             <div style={{ marginTop: '1rem', backgroundColor: '#e6f4ea', color: '#1e8e3e', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600 }}>
               ⭐ Distribuidor Parceiro
             </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Button variant="outline" style={{ justifyContent: 'flex-start' }}>Meus Pedidos</Button>
          <Button variant="outline" style={{ justifyContent: 'flex-start' }}>Endereços</Button>
          <Button variant="outline" style={{ justifyContent: 'flex-start', color: 'var(--color-danger)', borderColor: 'transparent' }} onClick={logout}>Sair da Conta</Button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <section>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Meus Pedidos</h1>

        {pedidos.length === 0 ? (
          <div style={{ backgroundColor: '#fff', padding: '3rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: 'var(--color-text-secondary)', border: '1px dashed var(--color-border)' }}>
            <p style={{ marginBottom: '1rem' }}>Você ainda não fez nenhum pedido.</p>
            <Button variant="primary" onClick={() => window.location.href = '/'}>Explorar Produtos</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {pedidos.map(pedido => (
              <div key={pedido.id} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-bg-secondary)' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>Pedido realizado em {new Date(pedido.createdAt || 0).toLocaleDateString('pt-BR')}</div>
                    <div style={{ fontWeight: 700 }}>Código: {pedido.id?.substring(0, 8).toUpperCase()}</div>
                  </div>
                  <div>
                    {getStatusBadge(pedido.status)}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {pedido.itens.map(item => (
                    <div key={item.id_produto} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span>{item.quantidade}x {item.nome}</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(item.preco_unitario * item.quantidade)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Logística</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{pedido.frete_transportadora || 'A combinar'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Valor Total</div>
                    <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>{formatCurrency(pedido.valor_total || pedido.subtotal)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
