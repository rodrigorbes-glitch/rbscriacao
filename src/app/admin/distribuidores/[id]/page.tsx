'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { consignacoesAPI, distribuidoresAPI, produtosAPI, transacoesAPI } from '@/services/api';
import { Consignacao, Distribuidor, Produto } from '@/types/models';
import Table, { TableColumn } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export default function DistribuidorPerfilPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [distribuidor, setDistribuidor] = useState<Distribuidor | null>(null);
  const [consignacoes, setConsignacoes] = useState<(Consignacao & { id: string })[]>([]);
  const [produtos, setProdutos] = useState<(Produto & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Consignacao Form State
  const [formData, setFormData] = useState<Omit<Consignacao, 'id'>>({
    id_distribuidor: '',
    data_entrega: Date.now(),
    data_retorno_prevista: Date.now() + 7 * 24 * 60 * 60 * 1000,
    produtos_deixados: [],
    status: 'pendente'
  });

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductQtd, setSelectedProductQtd] = useState<number>(1);
  const [valorArrecadado, setValorArrecadado] = useState<number>(0);

  // Conferencia State
  const [isConferenciaOpen, setIsConferenciaOpen] = useState(false);
  const [conferenciaId, setConferenciaId] = useState<string | null>(null);
  const [conferenciaRestantes, setConferenciaRestantes] = useState<Record<string, number>>({});
  const [tipoComissao, setTipoComissao] = useState<'percentual' | 'fixo'>('percentual');
  const [valorComissaoFixo, setValorComissaoFixo] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const distId = id as string;
      const [distData, consData, prodData] = await Promise.all([
        distribuidoresAPI.getById(distId),
        consignacoesAPI.getAll(),
        produtosAPI.getAll()
      ]);
      setDistribuidor(distData);
      setConsignacoes(consData.filter(c => c.id_distribuidor === distId));
      setProdutos(prodData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  // CALCULAR MÉTRICAS (Apenas de consignações concluídas)
  let totalConsignacoes = consignacoes.length;
  let brutoVendido = 0;
  let custoTotal = 0;
  let recebimentoLiquido = 0;
  
  if (distribuidor) {
    consignacoes.filter(c => c.status === 'concluida').forEach(c => {
      c.produtos_deixados.forEach(p => {
        const prod = produtos.find(pr => pr.id === p.id_produto);
        if (prod) {
          const valorBrutoLocal = p.quantidade * prod.preco_venda_sugerido;
          brutoVendido += valorBrutoLocal;
          custoTotal += p.quantidade * prod.custo_aquisicao;
          recebimentoLiquido += valorBrutoLocal * (1 - (distribuidor.percentual_comissao / 100));
        }
      });
    });
  }
  
  const lucroLiquido = recebimentoLiquido - custoTotal;

  // Handlers do Modal
  const openModal = (item?: Consignacao & { id: string }) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        id_distribuidor: item.id_distribuidor,
        data_entrega: item.data_entrega,
        data_retorno_prevista: item.data_retorno_prevista,
        produtos_deixados: item.produtos_deixados || [],
        status: item.status
      });
    } else {
      setEditingId(null);
      setFormData({
        id_distribuidor: id as string,
        data_entrega: Date.now(),
        data_retorno_prevista: Date.now() + 7 * 24 * 60 * 60 * 1000,
        produtos_deixados: [],
        status: 'pendente'
      });
    }
    setValorArrecadado(0);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleAddProduto = () => {
    if (!selectedProductId || selectedProductQtd <= 0) return;
    const existingIndex = formData.produtos_deixados.findIndex(p => p.id_produto === selectedProductId);
    let newArr = [...formData.produtos_deixados];
    if (existingIndex >= 0) newArr[existingIndex].quantidade += selectedProductQtd;
    else newArr.push({ id_produto: selectedProductId, quantidade: selectedProductQtd });
    setFormData({ ...formData, produtos_deixados: newArr });
    setSelectedProductId('');
    setSelectedProductQtd(1);
  };

  const handleRemoveProduto = (idProd: string) => {
    setFormData({
      ...formData,
      produtos_deixados: formData.produtos_deixados.filter(p => p.id_produto !== idProd)
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.produtos_deixados.length === 0) {
      alert("Adicione pelo menos um produto na consignação!");
      return;
    }
    setIsSubmitting(true);
    try {
      let savedId = editingId;
      if (editingId) {
        await consignacoesAPI.update(editingId, formData);
      } else {
        savedId = await consignacoesAPI.create(formData);
      }

      if (formData.status === 'concluida' && valorArrecadado > 0) {
        await transacoesAPI.create({
          tipo: 'venda_consignada',
          valor_total: valorArrecadado,
          lucro_estimado: valorArrecadado - custoTotal, // Estimado com base no custo
          data: Date.now(),
          referencia: `Consignação: ${savedId} (Loja: ${distribuidor?.nome_loja})`
        });
        alert(`Sucesso! Transação financeira de R$ ${valorArrecadado} gerada.`);
      }
      await loadData();
      closeModal();
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (consId: string) => {
    if (window.confirm('Excluir esta entrega do histórico?')) {
      await consignacoesAPI.delete(consId);
      await loadData();
    }
  };

  const openConferencia = (item: Consignacao & { id: string }) => {
    setConferenciaId(item.id);
    const iniciais: Record<string, number> = {};
    item.produtos_deixados.forEach(p => {
      iniciais[p.id_produto] = 0; // Por padrão o restante é 0 (vendeu tudo)
    });
    setConferenciaRestantes(iniciais);
    setTipoComissao('percentual');
    setValorComissaoFixo(0);
    setIsConferenciaOpen(true);
  };

  const closeConferencia = () => {
    setIsConferenciaOpen(false);
    setConferenciaId(null);
  };

  const getConferenciaCalculos = () => {
    const consig = consignacoes.find(c => c.id === conferenciaId);
    if (!consig) return { bruto: 0, comissao: 0, liquido: 0, custo: 0 };

    let bruto = 0;
    let custo = 0;

    consig.produtos_deixados.forEach(p => {
      const prod = produtos.find(pr => pr.id === p.id_produto);
      if (prod) {
        const restante = conferenciaRestantes[p.id_produto] || 0;
        const vendida = Math.max(0, p.quantidade - restante);
        bruto += vendida * prod.preco_venda_sugerido;
        custo += vendida * prod.custo_aquisicao;
      }
    });

    let comissao = 0;
    if (tipoComissao === 'percentual') {
      comissao = bruto * ((distribuidor?.percentual_comissao || 0) / 100);
    } else {
      comissao = valorComissaoFixo;
    }

    const liquido = bruto - comissao;
    return { bruto, comissao, liquido, custo };
  };

  const handleFinalizarConferencia = async () => {
    const { liquido, custo } = getConferenciaCalculos();
    
    if (window.confirm(`Confirma o recebimento líquido de R$ ${liquido.toFixed(2)} e encerramento da remessa?`)) {
      setIsSubmitting(true);
      try {
        // Atualiza status da consignação
        await consignacoesAPI.update(conferenciaId!, { status: 'concluida' });

        // Gera a transação financeira
        if (liquido > 0) {
          await transacoesAPI.create({
            tipo: 'venda_consignada',
            valor_total: liquido,
            lucro_estimado: liquido - custo,
            data: Date.now(),
            referencia: `Acerto Distribuidor: ${distribuidor?.nome_loja}`
          });
        }
        
        alert("Conferência finalizada com sucesso!");
        await loadData();
        closeConferencia();
      } catch (e) {
        console.error(e);
        alert("Erro ao finalizar conferência.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}><div className="auth-spinner" style={{ margin: '0 auto' }}></div><p style={{ marginTop: '1rem' }}>Carregando Perfil...</p></div>;
  if (!distribuidor) return <div style={{ padding: '4rem', textAlign: 'center' }}><h2>Distribuidor não encontrado.</h2><Button onClick={() => router.push('/admin/distribuidores')} style={{ marginTop: '1rem' }}>Voltar</Button></div>;

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('pt-BR');
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const columns: TableColumn<Consignacao & { id: string }>[] = [
    { key: 'data_entrega', header: 'Entrega', render: (item) => formatDate(item.data_entrega) },
    { key: 'data_retorno_prevista', header: 'Retorno', render: (item) => formatDate(item.data_retorno_prevista) },
    { key: 'produtos_deixados', header: 'Itens', render: (item) => item.produtos_deixados.reduce((acc, p) => acc + p.quantidade, 0) + ' un' },
    { key: 'status', header: 'Status', render: (item) => {
        let badgeClass = 'status-badge--warning';
        if (item.status === 'concluida') badgeClass = 'status-badge--success';
        if (item.status === 'cancelada') badgeClass = 'status-badge--danger';
        return <span className={`status-badge ${badgeClass}`}>{item.status.toUpperCase()}</span>;
      }
    },
    { key: 'actions', header: 'Ações', render: (item) => (
        <div className="table-actions" style={{ gap: '0.5rem' }}>
          {item.status === 'pendente' && (
            <Button onClick={() => openConferencia(item)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--color-primary)' }}>Conferir</Button>
          )}
          <Button variant="outline" onClick={() => openModal(item)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Ver/Editar</Button>
          <Button variant="outline" onClick={() => handleDelete(item.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>🗑️</Button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        backgroundColor: '#fff',
        padding: '1.5rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.push('/admin/distribuidores')} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-primary)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Voltar">&larr;</button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-montserrat), sans-serif', color: 'var(--color-text-primary)', fontWeight: 700 }}>{distribuidor.nome_loja}</h1>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                {distribuidor.responsavel}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                {distribuidor.telefone}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'var(--color-bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Comissão: {distribuidor.percentual_comissao}%
              </span>
              <span className={`status-badge ${distribuidor.status === 'ativo' ? 'status-badge--success' : 'status-badge--danger'}`} style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>{distribuidor.status.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <Button onClick={() => openModal()} style={{ backgroundColor: '#1A1A1A', color: '#F2D5A1', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          NOVA CARGA
        </Button>
      </div>

      {/* DASHBOARD CARDS B2B */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-montserrat), sans-serif', color: 'var(--color-text-primary)', margin: 0, fontWeight: 600 }}>Métricas Financeiras</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg-secondary)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)' }}>Apenas cargas concluídas</span>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2.5rem' 
      }}>
        {/* Card 1 */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            Entregas Feitas
          </h3>
          <p style={{ fontSize: '1.75rem', color: 'var(--color-text-primary)', margin: 0, fontWeight: 700, fontFamily: 'var(--font-montserrat), sans-serif' }}>{totalConsignacoes}</p>
        </div>

        {/* Card 2 */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Custo dos Produtos
          </h3>
          <p style={{ fontSize: '1.75rem', color: 'var(--color-text-primary)', margin: 0, fontWeight: 700, fontFamily: 'var(--font-montserrat), sans-serif' }}>{formatCurrency(custoTotal)}</p>
        </div>

        {/* Card 3 */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Sua Parte (Faturamento)
          </h3>
          <p style={{ fontSize: '1.75rem', color: '#10B981', margin: 0, fontWeight: 700, fontFamily: 'var(--font-montserrat), sans-serif' }}>{formatCurrency(recebimentoLiquido)}</p>
        </div>

        {/* Card 4 */}
        <div style={{ backgroundColor: lucroLiquido >= 0 ? '#ECFDF5' : '#FEF2F2', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: `1px solid ${lucroLiquido >= 0 ? '#10B98150' : '#EF444450'}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: lucroLiquido >= 0 ? '#047857' : '#B91C1C', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            Lucro Líquido Real
          </h3>
          <p style={{ fontSize: '1.75rem', color: lucroLiquido >= 0 ? '#047857' : '#B91C1C', margin: 0, fontWeight: 800, fontFamily: 'var(--font-montserrat), sans-serif' }}>{formatCurrency(lucroLiquido)}</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--color-bg-primary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Histórico de Entregas</h2>
        <Table data={consignacoes.sort((a,b) => b.data_entrega - a.data_entrega)} columns={columns} emptyMessage="Nenhuma remessa registrada para esta loja ainda." />
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingId ? 'Detalhes da Consignação' : 'Nova Carga (Consignação)'}
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" form="consignacao-form" isLoading={isSubmitting}>Salvar Remessa</Button>
          </>
        }
      >
        <form id="consignacao-form" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Status da Remessa</label>
            <select className="input-field" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})}>
              <option value="pendente">Pendente (Mercadoria na loja)</option>
              <option value="concluida">Concluída (Acerto financeiro feito)</option>
              <option value="cancelada">Cancelada / Devolvida Integral</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Data de Entrega</label>
              <input type="date" className="input-field" value={new Date(formData.data_entrega).toISOString().split('T')[0]} onChange={(e) => setFormData({...formData, data_entrega: new Date(e.target.value).getTime()})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Previsão de Retorno</label>
              <input type="date" className="input-field" value={new Date(formData.data_retorno_prevista).toISOString().split('T')[0]} onChange={(e) => setFormData({...formData, data_retorno_prevista: new Date(e.target.value).getTime()})} required />
            </div>
          </div>

          {/* Produtos Deixados */}
          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Produtos na Loja Parceira</h4>
            
            {formData.produtos_deixados.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>Nenhum produto listado na remessa.</p>
            ) : (
              <ul style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                {formData.produtos_deixados.map(p => {
                  const prodObj = produtos.find(prod => prod.id === p.id_produto);
                  return (
                    <li key={p.id_produto} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ fontWeight: 500 }}>{p.quantidade}x - {prodObj ? prodObj.nome : 'Produto Deletado'}</span>
                      <button type="button" onClick={() => handleRemoveProduto(p.id_produto)} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>REMOVER</button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Resumo Financeiro Inteligente */}
            {formData.produtos_deixados.length > 0 && (() => {
              const taxaComissao = distribuidor.percentual_comissao;
              let qtdTotal = 0;
              let valorBruto = 0;
              
              formData.produtos_deixados.forEach(p => {
                const prodObj = produtos.find(prod => prod.id === p.id_produto);
                if (prodObj) {
                  qtdTotal += p.quantidade;
                  valorBruto += p.quantidade * prodObj.preco_venda_sugerido;
                }
              });

              const valorComissao = valorBruto * (taxaComissao / 100);
              const valorLiquido = valorBruto - valorComissao;

              return (
                <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#1A1A1A', color: '#fff', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ color: '#F2D5A1', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}>Projeção Financeira da Carga</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                    <div>
                      <div style={{ color: '#aaa' }}>Total de Peças</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{qtdTotal} un</div>
                    </div>
                    <div>
                      <div style={{ color: '#aaa' }}>Potencial de Venda (Bruto)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorBruto)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#aaa' }}>Comissão Loja ({taxaComissao}%)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#F87171' }}>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorComissao)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#aaa' }}>Líquido a Receber</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ADE80' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorLiquido)}</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Adicionar Novo Produto */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Inserir Produto na Carga</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '0.5rem' }}>
                <div>
                  <select className="input-field" style={{ backgroundColor: 'var(--color-bg-primary)' }} value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                    <option value="">-- Buscar Produto --</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} (R$ {p.preco_venda_sugerido.toFixed(2)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input type="number" min="1" className="input-field" style={{ backgroundColor: 'var(--color-bg-primary)' }} value={selectedProductQtd} onChange={(e) => setSelectedProductQtd(parseInt(e.target.value) || 1)} placeholder="Qtd" />
                </div>
              </div>
              <Button type="button" onClick={handleAddProduto} style={{ width: '100%', backgroundColor: '#F2D5A1', color: '#1A1A1A' }}>+ Bipar/Adicionar Produto</Button>
            </div>
          </div>

          {/* Valor Arrecadado (Se concluída) */}
          {formData.status === 'concluida' && (
            <div style={{ padding: '1.5rem', backgroundColor: '#10B98120', border: '1px solid #10B981', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#047857' }}>💰 Acerto de Contas</h4>
              <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: '#065F46' }}>Preencha o valor que você efetivamente recebeu do parceiro hoje. Isso irá direto para o PDV (Transações).</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: '#047857' }}>R$</span>
                <input 
                  type="number" step="0.01" min="0" className="input-field" 
                  style={{ backgroundColor: 'white', color: 'black', fontWeight: 'bold' }}
                  value={valorArrecadado || ''} onChange={(e) => setValorArrecadado(parseFloat(e.target.value) || 0)} 
                  placeholder="0,00"
                />
              </div>
            </div>
          )}
          
          <button type="submit" style={{ display: 'none' }}>Salvar</button>
        </form>
      </Modal>

      {/* MODAL DE CONFERÊNCIA IN LOCO */}
      <Modal 
        isOpen={isConferenciaOpen} 
        onClose={closeConferencia} 
        title="Conferência de Estoque (In Loco)"
        actions={
          <>
            <Button variant="outline" onClick={closeConferencia}>Cancelar</Button>
            <Button 
              onClick={handleFinalizarConferencia} 
              disabled={isSubmitting || getConferenciaCalculos().liquido <= 0}
              style={{ backgroundColor: '#10B981', color: '#fff' }}
            >
              {isSubmitting ? 'Finalizando...' : 'Finalizar e Receber'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Faça a contagem física no local. Digite a **Quantidade Restante** (o que sobrou) e o sistema calculará as vendas automaticamente.
          </p>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Produto</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Deixado</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: '#FEF3C7' }}>Restante</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Vendido</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {consignacoes.find(c => c.id === conferenciaId)?.produtos_deixados.map(p => {
                  const prod = produtos.find(pr => pr.id === p.id_produto);
                  if (!prod) return null;
                  const restante = conferenciaRestantes[p.id_produto] || 0;
                  const vendida = Math.max(0, p.quantidade - restante);
                  const subtotal = vendida * prod.preco_venda_sugerido;

                  return (
                    <tr key={p.id_produto} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem' }}>{prod.nome}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>{p.quantidade}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', backgroundColor: '#FEF3C7' }}>
                        <input 
                          type="number" min="0" max={p.quantidade}
                          value={restante.toString()}
                          onChange={(e) => setConferenciaRestantes(prev => ({ ...prev, [p.id_produto]: parseInt(e.target.value) || 0 }))}
                          style={{ width: '60px', padding: '0.25rem', textAlign: 'center', border: '1px solid #FCD34D', borderRadius: '4px', fontWeight: 'bold' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: vendida > 0 ? '#10B981' : 'var(--color-text-tertiary)' }}>
                        {vendida}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Acerto de Comissões</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
              <div>
                <label className="form-label">Cálculo da Comissão</label>
                <select 
                  className="input-field" 
                  value={tipoComissao} 
                  onChange={(e) => setTipoComissao(e.target.value as 'percentual' | 'fixo')}
                >
                  <option value="percentual">Percentual do Perfil ({distribuidor?.percentual_comissao || 0}%)</option>
                  <option value="fixo">Valor Fixo Total em R$</option>
                </select>
              </div>
              <div>
                {tipoComissao === 'fixo' && (
                  <>
                    <label className="form-label">Valor que fica com o Distribuidor</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold' }}>R$</span>
                      <input 
                        type="number" step="0.01" min="0" className="input-field"
                        value={valorComissaoFixo || ''} 
                        onChange={(e) => setValorComissaoFixo(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {(() => {
            const { bruto, comissao, liquido } = getConferenciaCalculos();
            return (
              <div style={{ padding: '1.5rem', backgroundColor: '#1A1A1A', color: '#fff', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#aaa' }}>Total Vendido (Bruto):</span>
                  <span style={{ fontWeight: 'bold' }}>{formatCurrency(bruto)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: '#aaa' }}>Comissão Distribuidor:</span>
                  <span style={{ fontWeight: 'bold', color: '#F87171' }}>- {formatCurrency(comissao)}</span>
                </div>
                <div style={{ height: '1px', backgroundColor: '#333', marginBottom: '1rem' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Receber Agora (Líquido):</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#4ADE80' }}>{formatCurrency(liquido)}</span>
                </div>
              </div>
            );
          })()}

        </div>
      </Modal>
    </div>
  );
}
