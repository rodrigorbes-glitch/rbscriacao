'use client';

import { useState, useEffect } from 'react';
import { transacoesAPI } from '@/services/api';
import { Transacao } from '@/types/models';
import Table, { TableColumn } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

export default function FinanceiroPage() {
  const [transacoes, setTransacoes] = useState<(Transacao & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Omit<Transacao, 'id'>>({
    tipo: 'despesa',
    valor_total: 0,
    lucro_estimado: 0,
    data: Date.now(),
    referencia: '',
    categoria: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await transacoesAPI.getAll();
      // Ordenar por data decrescente
      data.sort((a, b) => b.data - a.data);
      setTransacoes(data);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = () => {
    setFormData({
      tipo: 'despesa',
      valor_total: 0,
      lucro_estimado: 0,
      data: Date.now(),
      referencia: '',
      categoria: ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.valor_total <= 0) {
      alert("O valor deve ser maior que zero.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await transacoesAPI.create(formData);
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      alert('Ocorreu um erro ao salvar os dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEstornar = async (id: string) => {
    if (window.confirm('Tem certeza que deseja estornar (excluir) esta transação? Ela ficará marcada como excluída e o valor não somará mais no caixa.')) {
      try {
        await transacoesAPI.update(id, { excluida: true });
        await loadData();
      } catch (error) {
        console.error('Erro ao estornar transação:', error);
        alert('Erro ao processar estorno.');
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const columns: TableColumn<Transacao & { id: string }>[] = [
    { 
      key: 'data', 
      header: 'Data',
      render: (item) => {
        const d = new Date(item.data);
        return <span style={{ opacity: item.excluida ? 0.5 : 1 }}>{d.toLocaleDateString('pt-BR')}</span>;
      }
    },
    { 
      key: 'tipo', 
      header: 'Tipo',
      render: (item) => {
        if (item.excluida) return <span className="status-badge" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>ESTORNADA</span>;
        
        if (item.tipo === 'venda_direta' || item.tipo === 'venda_consignada') {
          return <span className="status-badge status-badge--success">ENTRADA</span>;
        }
        return <span className="status-badge status-badge--danger">SAÍDA</span>;
      }
    },
    { 
      key: 'categoria', 
      header: 'Categoria',
      render: (item) => <span style={{ opacity: item.excluida ? 0.5 : 1, textDecoration: item.excluida ? 'line-through' : 'none' }}>{item.categoria || '-'}</span>
    },
    { 
      key: 'referencia', 
      header: 'Descrição / Ref.',
      render: (item) => <span style={{ opacity: item.excluida ? 0.5 : 1, textDecoration: item.excluida ? 'line-through' : 'none' }}>{item.referencia}</span>
    },
    { 
      key: 'valor_total', 
      header: 'Valor',
      render: (item) => {
        const color = item.excluida ? 'var(--color-text-tertiary)' : (item.tipo === 'despesa' ? 'var(--color-danger)' : 'var(--color-success)');
        const sign = item.tipo === 'despesa' ? '-' : '+';
        return (
          <span style={{ color, fontWeight: 'bold', textDecoration: item.excluida ? 'line-through' : 'none' }}>
            {sign} {formatCurrency(item.valor_total)}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (item) => (
        <div className="table-actions">
          {!item.excluida && (
            <Button variant="outline" onClick={() => handleEstornar(item.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
              ↩️ Estornar
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">💲 Fluxo de Caixa (Extrato)</h1>
        <Button onClick={openModal}>+ Lançamento Manual</Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando extrato...</div>
      ) : (
        <Table data={transacoes} columns={columns} emptyMessage="Nenhuma movimentação registrada no caixa." />
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title="Novo Lançamento Financeiro"
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" form="transacao-form" isLoading={isSubmitting}>Salvar Lançamento</Button>
          </>
        }
      >
        <form id="transacao-form" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Tipo de Movimentação</label>
            <select 
              className="input-field"
              value={formData.tipo}
              onChange={(e) => setFormData({...formData, tipo: e.target.value as any})}
            >
              <option value="despesa">Saída (Despesa / Pagamento)</option>
              <option value="venda_direta">Entrada (Receita Avulsa)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Data</label>
              <input 
                type="date" 
                className="input-field"
                value={new Date(formData.data).toISOString().split('T')[0]}
                onChange={(e) => setFormData({...formData, data: new Date(e.target.value).getTime()})}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Valor (R$)</label>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                className="input-field"
                value={formData.valor_total || ''}
                onChange={(e) => setFormData({...formData, valor_total: parseFloat(e.target.value) || 0})}
                required
              />
            </div>
          </div>

          <Input
            label="Categoria"
            placeholder="Ex: Aluguel, Combustível, Impostos, etc."
            value={formData.categoria || ''}
            onChange={(e) => setFormData({...formData, categoria: e.target.value})}
            required
          />

          <Input
            label="Descrição / Referência"
            placeholder="Ex: Conta de luz do mês de Maio"
            value={formData.referencia}
            onChange={(e) => setFormData({...formData, referencia: e.target.value})}
            required
          />
          
          <button type="submit" style={{ display: 'none' }}>Salvar</button>
        </form>
      </Modal>
    </div>
  );
}
