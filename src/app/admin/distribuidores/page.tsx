'use client';

import { useState, useEffect } from 'react';
import { distribuidoresAPI } from '@/services/api';
import { Distribuidor } from '@/types/models';
import Table, { TableColumn } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Toggle from '@/components/ui/Toggle';

export default function DistribuidoresPage() {
  const [distribuidores, setDistribuidores] = useState<(Distribuidor & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Distribuidor, 'id'>>({
    nome_loja: '',
    responsavel: '',
    endereco: '',
    telefone: '',
    percentual_comissao: 0,
    status: 'ativo'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await distribuidoresAPI.getAll();
      setDistribuidores(data);
    } catch (error) {
      console.error('Erro ao carregar distribuidores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (item?: Distribuidor & { id: string }) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        nome_loja: item.nome_loja,
        responsavel: item.responsavel,
        endereco: item.endereco,
        telefone: item.telefone,
        percentual_comissao: item.percentual_comissao,
        status: item.status
      });
    } else {
      setEditingId(null);
      setFormData({
        nome_loja: '',
        responsavel: '',
        endereco: '',
        telefone: '',
        percentual_comissao: 0,
        status: 'ativo'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await distribuidoresAPI.update(editingId, formData);
      } else {
        await distribuidoresAPI.create(formData);
      }
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar distribuidor:', error);
      alert('Ocorreu um erro ao salvar os dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este parceiro? Esta ação é irreversível.')) {
      try {
        await distribuidoresAPI.delete(id);
        await loadData();
      } catch (error) {
        console.error('Erro ao deletar distribuidor:', error);
        alert('Erro ao excluir parceiro.');
      }
    }
  };

  const columns: TableColumn<Distribuidor & { id: string }>[] = [
    { key: 'nome_loja', header: 'Loja' },
    { key: 'responsavel', header: 'Responsável' },
    { key: 'telefone', header: 'Telefone' },
    { 
      key: 'percentual_comissao', 
      header: 'Comissão',
      render: (item) => `${item.percentual_comissao}%`
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item) => (
        <span className={`status-badge ${item.status === 'ativo' ? 'status-badge--success' : 'status-badge--danger'}`}>
          {item.status.toUpperCase()}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (item) => (
        <div className="table-actions" style={{ gap: '0.5rem' }}>
          <Button onClick={() => window.location.href = `/admin/distribuidores/${item.id}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#F2D5A1', color: '#1A1A1A' }}>
            📊 Ver Painel
          </Button>
          <Button variant="outline" onClick={() => openModal(item)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
            ✏️ Editar
          </Button>
          <Button variant="outline" onClick={() => handleDelete(item.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
            🗑️
          </Button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏢 Distribuidores (B2B)</h1>
        <Button onClick={() => openModal()}>+ Novo Distribuidor</Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando parceiros...</div>
      ) : (
        <Table data={distribuidores} columns={columns} emptyMessage="Nenhum distribuidor cadastrado." />
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingId ? 'Editar Distribuidor' : 'Novo Distribuidor'}
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" form="distribuidor-form" isLoading={isSubmitting}>Salvar Lojista</Button>
          </>
        }
      >
        <form id="distribuidor-form" onSubmit={handleSave}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <Toggle 
              label={formData.status === 'ativo' ? '🟢 Ativo' : '🔴 Inativo'}
              checked={formData.status === 'ativo'}
              onChange={(checked) => setFormData({...formData, status: checked ? 'ativo' : 'inativo'})}
            />
          </div>

          <Input
            label="Nome da Loja"
            placeholder="Ex: Loja do João"
            value={formData.nome_loja}
            onChange={(e) => setFormData({...formData, nome_loja: e.target.value})}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Responsável"
              placeholder="Nome do dono/gerente"
              value={formData.responsavel}
              onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
              required
            />
            <Input
              label="Telefone (WhatsApp)"
              placeholder="(00) 00000-0000"
              value={formData.telefone}
              onChange={(e) => setFormData({...formData, telefone: e.target.value})}
              required
            />
          </div>

          <Input
            label="Endereço Completo"
            placeholder="Rua, Número, Bairro, Cidade"
            value={formData.endereco}
            onChange={(e) => setFormData({...formData, endereco: e.target.value})}
            required
          />

          <Input
            label="Percentual de Comissão (%)"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={formData.percentual_comissao === 0 ? '' : formData.percentual_comissao}
            onChange={(e) => setFormData({...formData, percentual_comissao: parseFloat(e.target.value) || 0})}
            required
          />
          
          <button type="submit" style={{ display: 'none' }}>Salvar</button>
        </form>
      </Modal>
    </div>
  );
}
