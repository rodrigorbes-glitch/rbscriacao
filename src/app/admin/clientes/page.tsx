'use client';

import { useState, useEffect } from 'react';
import { clientesAPI } from '@/services/api';
import { Cliente } from '@/types/models';
import Table, { TableColumn } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<(Cliente & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Cliente, 'id'>>({
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await clientesAPI.getAll();
      setClientes(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (item?: Cliente & { id: string }) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        nome: item.nome,
        telefone: item.telefone,
        email: item.email || '',
        endereco: item.endereco || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        endereco: ''
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
        await clientesAPI.update(editingId, formData);
      } else {
        await clientesAPI.create(formData);
      }
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Ocorreu um erro ao salvar o cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Deseja apagar este cliente permanentemente?')) {
      try {
        await clientesAPI.delete(id);
        await loadData();
      } catch (error) {
        console.error('Erro ao deletar cliente:', error);
        alert('Erro ao excluir cliente.');
      }
    }
  };

  const columns: TableColumn<Cliente & { id: string }>[] = [
    { key: 'nome', header: 'Nome do Cliente' },
    { key: 'telefone', header: 'Telefone' },
    { key: 'email', header: 'E-mail' },
    {
      key: 'actions',
      header: 'Ações',
      render: (item) => (
        <div className="table-actions">
          <Button variant="outline" onClick={() => openModal(item)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
            ✏️ Editar
          </Button>
          <Button variant="outline" onClick={() => handleDelete(item.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
            🗑️ Excluir
          </Button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👥 Vendas e Clientes (B2C)</h1>
        <Button onClick={() => openModal()}>+ Novo Cliente</Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando clientes...</div>
      ) : (
        <Table data={clientes} columns={columns} emptyMessage="Nenhum cliente de varejo cadastrado." />
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingId ? 'Editar Cliente' : 'Novo Cliente'}
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" form="cliente-form" isLoading={isSubmitting}>Salvar Cliente</Button>
          </>
        }
      >
        <form id="cliente-form" onSubmit={handleSave}>
          <Input
            label="Nome Completo"
            placeholder="Ex: Maria Silva"
            value={formData.nome}
            onChange={(e) => setFormData({...formData, nome: e.target.value})}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Telefone (WhatsApp)"
              placeholder="(00) 00000-0000"
              value={formData.telefone}
              onChange={(e) => setFormData({...formData, telefone: e.target.value})}
              required
            />
            <Input
              label="E-mail (Opcional)"
              type="email"
              placeholder="maria@email.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <Input
            label="Endereço de Entrega (Opcional)"
            placeholder="Rua, Número, Bairro"
            value={formData.endereco}
            onChange={(e) => setFormData({...formData, endereco: e.target.value})}
          />
          
          <button type="submit" style={{ display: 'none' }}>Salvar</button>
        </form>
      </Modal>
    </div>
  );
}
