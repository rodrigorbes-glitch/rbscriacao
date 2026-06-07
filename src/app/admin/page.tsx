'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  produtosAPI, 
  consignacoesAPI, 
  distribuidoresAPI, 
  clientesAPI,
  transacoesAPI,
  pedidosAPI
} from '@/services/api';
import { Produto, Consignacao, Transacao, Pedido } from '@/types/models';
import Table, { TableColumn } from '@/components/ui/Table';
import Button from '@/components/ui/Button';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Dashboard Metrics State
  const [caixaB2B, setCaixaB2B] = useState(0);
  const [receitaOnline, setReceitaOnline] = useState(0);
  const [faturamentoTotal, setFaturamentoTotal] = useState(0);
  
  const [pedidosPendentes, setPedidosPendentes] = useState(0);
  const [estoqueTotal, setEstoqueTotal] = useState(0);
  
  // Tables State
  const [produtosCriticos, setProdutosCriticos] = useState<(Produto & { id: string })[]>([]);
  const [consignacoesAtrasadas, setConsignacoesAtrasadas] = useState<(Consignacao & { id: string, nomeLoja: string })[]>([]);
  const [ultimosPedidos, setUltimosPedidos] = useState<(Pedido & { id: string })[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [
          produtos,
          consignacoes,
          distribuidores,
          clientes,
          transacoes,
          pedidos
        ] = await Promise.all([
          produtosAPI.getAll(),
          consignacoesAPI.getAll(),
          distribuidoresAPI.getAll(),
          clientesAPI.getAll(),
          transacoesAPI.getAll(),
          pedidosAPI.getAll()
        ]);

        // 1. Caixa PDV (B2B)
        const caixa = transacoes.reduce((acc, t) => {
          if (t.excluida) return acc;
          if (t.tipo === 'venda_direta' || t.tipo === 'venda_consignada') return acc + t.valor_total;
          if (t.tipo === 'despesa') return acc - t.valor_total;
          return acc; 
        }, 0);
        setCaixaB2B(caixa);

        // 2. Receita Online (B2C)
        const receitaLoja = pedidos.reduce((acc, p) => {
          if (p.status !== 'cancelado') return acc + p.subtotal;
          return acc;
        }, 0);
        setReceitaOnline(receitaLoja);

        // Faturamento Global
        setFaturamentoTotal(caixa + receitaLoja);

        // 3. Pedidos Pendentes da Loja Online
        const pendentesCount = pedidos.filter(p => p.status === 'pendente').length;
        setPedidosPendentes(pendentesCount);

        // 4. Últimos Pedidos (Limit 5)
        const sortedPedidos = [...pedidos].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
        setUltimosPedidos(sortedPedidos);

        // 5. Consignações Atrasadas
        const hoje = Date.now();
        const atrasadas: (Consignacao & { id: string, nomeLoja: string })[] = [];
        
        consignacoes.forEach(c => {
          if (c.status === 'pendente') {
            if (c.data_retorno_prevista < hoje) {
              const dist = distribuidores.find(d => d.id === c.id_distribuidor);
              atrasadas.push({ ...c, nomeLoja: dist ? dist.nome_loja : 'Desconhecido' });
            }
          }
        });
        setConsignacoesAtrasadas(atrasadas);

        // 6. Estoque Físico & Produtos Críticos
        let totalEstoque = 0;
        const criticos: (Produto & { id: string })[] = [];
        
        produtos.forEach(p => {
          totalEstoque += (p.estoque_central || 0);
          if ((p.estoque_central || 0) < 5) { 
            criticos.push(p);
          }
        });
        setEstoqueTotal(totalEstoque);
        setProdutosCriticos(criticos);

      } catch (error) {
        console.error("Erro ao carregar Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  const criticosColumns: TableColumn<Produto & { id: string }>[] = [
    { key: 'nome', header: 'Produto' },
    { 
      key: 'estoque_central', 
      header: 'Em Estoque',
      render: (item) => (
        <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>
          {item.estoque_central} unid.
        </span>
      )
    }
  ];

  const atrasadasColumns: TableColumn<Consignacao & { id: string, nomeLoja: string }>[] = [
    { key: 'nomeLoja', header: 'Lojista' },
    { 
      key: 'data_retorno_prevista', 
      header: 'Vencimento',
      render: (item) => (
        <span style={{ color: 'var(--color-danger)' }}>
          {formatDate(item.data_retorno_prevista)}
        </span>
      )
    }
  ];

  const pedidosColumns: TableColumn<Pedido & { id: string }>[] = [
    { key: 'cliente_nome', header: 'Cliente' },
    { 
      key: 'subtotal', 
      header: 'Valor',
      render: (item) => formatCurrency(item.subtotal)
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item) => {
        const colors: any = {
          'pendente': 'orange',
          'confirmado': 'blue',
          'enviado': 'purple',
          'entregue': 'green',
          'cancelado': 'red'
        };
        return <span style={{ color: colors[item.status] || '#666', fontWeight: 600, textTransform: 'capitalize' }}>{item.status}</span>;
      }
    }
  ];

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando métricas de inteligência...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-montserrat), sans-serif', color: 'var(--color-text-primary)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          Inteligência do Negócio
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>Visão geral do faturamento e operação da sua loja.</p>
      </div>

      {/* DASHBOARD CARDS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2.5rem' 
      }}>
        {/* Faturamento Global (Destaque Escuro) */}
        <div style={{ backgroundColor: '#1A1A1A', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#fff' }}>
          <h3 style={{ fontSize: '0.875rem', color: '#aaa', margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg>
            Faturamento Global
          </h3>
          <p style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700, fontFamily: 'var(--font-montserrat), sans-serif' }}>{formatCurrency(faturamentoTotal)}</p>
        </div>

        {/* Caixa PDV */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
            Caixa PDV (B2B)
          </h3>
          <p style={{ fontSize: '1.75rem', color: 'var(--color-success)', margin: 0, fontWeight: 700, fontFamily: 'var(--font-montserrat), sans-serif' }}>{formatCurrency(caixaB2B)}</p>
        </div>

        {/* Receita Online */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            Receita Loja Online
          </h3>
          <p style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700, fontFamily: 'var(--font-montserrat), sans-serif' }}>{formatCurrency(receitaOnline)}</p>
        </div>

        {/* Estoque */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Estoque Central
          </h3>
          <p style={{ fontSize: '1.75rem', color: 'var(--color-text-primary)', margin: 0, fontWeight: 700, fontFamily: 'var(--font-montserrat), sans-serif' }}>
            {estoqueTotal} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--color-text-tertiary)' }}>unid.</span>
          </p>
        </div>

        {/* Pedidos Pendentes */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            Pedidos Pendentes
          </h3>
          <p style={{ fontSize: '1.75rem', color: pedidosPendentes > 0 ? 'var(--color-warning)' : 'var(--color-text-primary)', margin: 0, fontWeight: 700, fontFamily: 'var(--font-montserrat), sans-serif' }}>
            {pedidosPendentes} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--color-text-tertiary)' }}>aguardando</span>
          </p>
        </div>
      </div>

      {/* TABELAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        
        {/* Atividade Recente B2C */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', margin: 0, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              Últimos Pedidos
            </h2>
            <Button variant="outline" onClick={() => router.push('/admin/pedidos')} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Ver Todos</Button>
          </div>
          <div style={{ flex: 1, overflowX: 'auto' }}>
            {ultimosPedidos.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Nenhum pedido recebido ainda.</p>
              </div>
            ) : (
              <Table data={ultimosPedidos} columns={pedidosColumns} emptyMessage="" />
            )}
          </div>
        </div>

        {/* Alertas de Estoque */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', margin: 0, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Alertas de Estoque
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg-secondary)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>&lt; 5 unidades</span>
          </div>
          <div style={{ flex: 1, overflowX: 'auto' }}>
            {produtosCriticos.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Estoque saudável. Nenhum produto crítico.</p>
              </div>
            ) : (
              <Table data={produtosCriticos} columns={criticosColumns} emptyMessage="" />
            )}
          </div>
        </div>

        {/* Alertas de Atraso B2B */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', margin: 0, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Consignações Atrasadas
            </h2>
          </div>
          <div style={{ flex: 1, overflowX: 'auto' }}>
            {consignacoesAtrasadas.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Todos os parceiros estão em dia.</p>
              </div>
            ) : (
              <Table data={consignacoesAtrasadas} columns={atrasadasColumns} emptyMessage="" />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
