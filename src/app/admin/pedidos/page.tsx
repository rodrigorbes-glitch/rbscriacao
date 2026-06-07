'use client';

import { useState, useEffect } from 'react';
import { pedidosAPI } from '@/services/api';
import { Pedido } from '@/types/models';
import Table, { TableColumn } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<(Pedido & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<(Pedido & { id: string }) | null>(null);

  const loadPedidos = async () => {
    setLoading(true);
    try {
      const data = await pedidosAPI.getAll();
      // Ordenar por data mais recente primeiro
      const sorted = data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setPedidos(sorted);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPedidos();
  }, []);

  const openModal = (pedido: Pedido & { id: string }) => {
    setSelectedPedido(pedido);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPedido(null);
  };

  const updateStatus = async (novoStatus: Pedido['status']) => {
    if (!selectedPedido) return;
    
    try {
      await pedidosAPI.update(selectedPedido.id, { status: novoStatus });
      setSelectedPedido({ ...selectedPedido, status: novoStatus });
      await loadPedidos();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Ocorreu um erro ao atualizar o status do pedido.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    if (!selectedPedido) return;
    const phone = selectedPedido.cliente_whatsapp.replace(/\D/g, '');
    let msg = `Olá ${selectedPedido.cliente_nome.split(' ')[0]}, tudo bem? Aqui é da loja online. Estou entrando em contato sobre o seu pedido!`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Data não disponível';
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const getStatusBadgeClass = (status: Pedido['status']) => {
    switch (status) {
      case 'pendente': return 'status-badge--warning';
      case 'confirmado': return 'status-badge--info';
      case 'enviado': return 'status-badge--info'; // Talvez roxo, usando o css existente ou inline
      case 'entregue': return 'status-badge--success';
      case 'cancelado': return 'status-badge--danger';
      default: return '';
    }
  };

  const translateStatus = (status: Pedido['status']) => {
    const map: Record<string, string> = {
      'pendente': 'Pendente (Aguardando Pgto)',
      'pago': 'Pago (Em Análise)',
      'confirmado': 'Pago / Confirmado',
      'enviado': 'Em Trânsito / Enviado',
      'entregue': 'Entregue',
      'cancelado': 'Cancelado',
      'rejeitado': 'Pagamento Rejeitado'
    };
    return map[status] || status;
  };

  const columns: TableColumn<Pedido & { id: string }>[] = [
    { 
      key: 'createdAt', 
      header: 'Data e Hora',
      render: (item) => formatDate(item.createdAt)
    },
    { key: 'cliente_nome', header: 'Cliente' },
    { 
      key: 'subtotal', 
      header: 'Valor do Pedido',
      render: (item) => formatCurrency(item.subtotal)
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item) => (
        <span className={`status-badge ${getStatusBadgeClass(item.status)}`}>
          {translateStatus(item.status)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (item) => (
        <Button variant="outline" onClick={() => openModal(item)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
          👁️ Ver Detalhes
        </Button>
      )
    }
  ];

  return (
    <div>
      {/* Estilos para ocultar o resto da tela durante a impressão */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; box-shadow: none; border: none; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="page-header no-print">
        <h1 className="page-title">🛍️ Pedidos da Loja Online</h1>
      </div>

      <div className="no-print">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando pedidos...</div>
        ) : (
          <Table data={pedidos} columns={columns} emptyMessage="Nenhum pedido foi realizado ainda na sua loja online." />
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={`Detalhes do Pedido`}
        footer={
          <div className="no-print" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button variant="outline" onClick={handlePrint}>🖨️ Imprimir Pedido</Button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="outline" onClick={closeModal}>Fechar</Button>
            </div>
          </div>
        }
      >
        {selectedPedido && (
          <div className="print-area" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'monospace' }}>
            
            {/* CABEÇALHO DO CUPOM */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>COMPROVANTE DE PEDIDO</h2>
              <p>Data: {formatDate(selectedPedido.createdAt)}</p>
              <p>Status Atual: <strong>{translateStatus(selectedPedido.status)}</strong></p>
            </div>

            {/* DADOS DO CLIENTE */}
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>DADOS DO CLIENTE</h3>
              <p><strong>Nome:</strong> {selectedPedido.cliente_nome}</p>
              <p><strong>WhatsApp:</strong> {selectedPedido.cliente_whatsapp}</p>
              <p><strong>Endereço para Entrega:</strong><br/> {selectedPedido.cliente_endereco}</p>
              
              <div className="no-print" style={{ marginTop: '1rem' }}>
                <Button variant="outline" style={{ borderColor: '#25D366', color: '#25D366', backgroundColor: '#e8f9ef' }} onClick={handleWhatsApp}>
                  💬 Chamar Cliente no WhatsApp
                </Button>
              </div>
            </div>

            {/* ITENS DO PEDIDO */}
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>ITENS DO PEDIDO</h3>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ paddingBottom: '0.5rem' }}>Qtd</th>
                    <th style={{ paddingBottom: '0.5rem' }}>Produto</th>
                    <th style={{ paddingBottom: '0.5rem', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPedido.itens.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ paddingTop: '0.5rem' }}>{item.quantidade}x</td>
                      <td style={{ paddingTop: '0.5rem' }}>{item.nome}</td>
                      <td style={{ paddingTop: '0.5rem', textAlign: 'right' }}>{formatCurrency(item.quantidade * item.preco_unitario)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTAIS */}
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '1rem', textAlign: 'right' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>SUBTOTAL: {formatCurrency(selectedPedido.subtotal)}</h3>
              <p style={{ fontSize: '0.875rem' }}>(Frete não incluso no subtotal online)</p>
            </div>

            {/* AÇÕES DE STATUS (Não aparecem na impressão) */}
            <div className="no-print" style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Atualizar Status Logístico:</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button 
                  variant="outline" 
                  disabled={selectedPedido.status === 'pendente'} 
                  onClick={() => updateStatus('pendente')}
                >
                  🟡 Pendente
                </Button>
                <Button 
                  variant="outline" 
                  disabled={selectedPedido.status === 'confirmado'} 
                  onClick={() => updateStatus('confirmado')}
                >
                  🔵 Pago (Separar)
                </Button>
                <Button 
                  variant="outline" 
                  disabled={selectedPedido.status === 'enviado'} 
                  onClick={() => updateStatus('enviado')}
                >
                  🟣 Em Trânsito
                </Button>
                <Button 
                  variant="outline" 
                  disabled={selectedPedido.status === 'entregue'} 
                  onClick={() => updateStatus('entregue')}
                >
                  🟢 Entregue
                </Button>
                <Button 
                  variant="outline" 
                  disabled={selectedPedido.status === 'cancelado'} 
                  onClick={() => updateStatus('cancelado')}
                  style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                >
                  🔴 Cancelado
                </Button>
              </div>
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
}
