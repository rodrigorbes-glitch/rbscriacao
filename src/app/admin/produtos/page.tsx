'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { produtosAPI } from '@/services/api';
import { Produto } from '@/types/models';
import Table, { TableColumn } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { convertDriveImageLink, convertYouTubeLink } from '@/utils/linkConverter';

// Categorias padrão para sugerir no Datalist
const CATEGORIAS_SUGERIDAS = [
  'Camisetas',
  'Calças',
  'Calçados',
  'Acessórios',
  'Eletrônicos',
  'Casa e Decoração'
];

// Função de Compressão de Imagem no lado do Cliente (Retorna Base64)
const compressImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; // Reduzido um pouco para garantir que fique leve (Firestore limite de 1MB)
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Preenche com fundo branco caso a imagem tenha transparência
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        // Retorna a imagem diretamente como texto (Base64)
        const base64String = canvas.toDataURL('image/jpeg', 0.7); // 70% de qualidade
        
        // Verifica o peso aproximado (Firestore suporta até 1MB por documento)
        const sizeInBytes = Math.round((base64String.length * 3) / 4);
        if (sizeInBytes > 900000) {
          reject(new Error('A imagem é muito complexa e ficou pesada demais mesmo após compressão.'));
        } else {
          resolve(base64String);
        }
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<(Produto & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Produto, 'id'>>({
    nome: '',
    descricao: '',
    categoria: '',
    estoque_central: 0,
    custo_aquisicao: 0,
    preco_venda_sugerido: 0,
    foto_url: '',
    fotos_adicionais: ['', '', '', '', '', ''],
    video_url: '',
    destaque: false
  });

  // Calculadora de Bolso State
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcImpostos, setCalcImpostos] = useState<number | ''>('');
  const [calcComissao, setCalcComissao] = useState<number | ''>('');
  const [calcMargem, setCalcMargem] = useState<number | ''>('');

  // Auto-calcula o Preço Sugerido se a Calculadora estiver aberta
  useEffect(() => {
    if (!showCalculator) return;
    
    const c = formData.custo_aquisicao || 0;
    const i = Number(calcImpostos) || 0;
    const com = Number(calcComissao) || 0;
    const m = Number(calcMargem) || 0;
    
    const somaTaxas = i + com + m;
    
    if (somaTaxas < 100 && c > 0) {
      const multiplier = 100 / (100 - somaTaxas);
      const sugerido = c * multiplier;
      // Só atualiza se a diferença for maior que 1 centavo pra evitar loop
      if (Math.abs(formData.preco_venda_sugerido - sugerido) > 0.01) {
        setFormData(prev => ({ ...prev, preco_venda_sugerido: parseFloat(sugerido.toFixed(2)) }));
      }
    }
  }, [formData.custo_aquisicao, calcImpostos, calcComissao, calcMargem, showCalculator]);

  const loadProdutos = async () => {
    setLoading(true);
    try {
      const data = await produtosAPI.getAll();
      setProdutos(data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProdutos();
  }, []);

  const openModal = (produto?: Produto & { id: string }) => {
    if (produto) {
      setEditingId(produto.id);
      setFormData({
        nome: produto.nome,
        descricao: produto.descricao || '',
        categoria: produto.categoria,
        estoque_central: produto.estoque_central,
        custo_aquisicao: produto.custo_aquisicao,
        preco_venda_sugerido: produto.preco_venda_sugerido,
        foto_url: produto.foto_url || '',
        fotos_adicionais: produto.fotos_adicionais && produto.fotos_adicionais.length > 0 
           ? [...produto.fotos_adicionais, ...Array(6 - produto.fotos_adicionais.length).fill('')].slice(0, 6)
           : ['', '', '', '', '', ''],
        video_url: produto.video_url || '',
        destaque: produto.destaque || false
      });
    } else {
      setEditingId(null);
      setFormData({
        nome: '',
        descricao: '',
        categoria: '',
        estoque_central: 0,
        custo_aquisicao: 0,
        preco_venda_sugerido: 0,
        foto_url: '',
        fotos_adicionais: ['', '', '', '', '', ''],
        video_url: '',
        destaque: false
      });
    }
    setShowCalculator(false); // Fecha calculadora ao abrir
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64DataUrl = await compressImageToBase64(file);
      setFormData({ ...formData, foto_url: base64DataUrl });
    } catch (error: any) {
      console.error('Erro no processamento da foto:', error);
      alert(error.message || 'Erro ao processar a foto.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    
    setIsSubmitting(true);
    try {
      // Formata os links antes de salvar usando o utilitário
      const payload = { ...formData };
      payload.foto_url = convertDriveImageLink(payload.foto_url);
      payload.video_url = convertYouTubeLink(payload.video_url);
      payload.fotos_adicionais = (payload.fotos_adicionais || [])
        .filter(url => url.trim() !== '') // Salva apenas os inputs preenchidos
        .map(convertDriveImageLink);
        
      if (editingId) {
        await produtosAPI.update(editingId, payload);
      } else {
        await produtosAPI.create(payload);
      }
      await loadProdutos(); 
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Ocorreu um erro ao salvar o produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto? Essa ação é irreversível.')) {
      try {
        await produtosAPI.delete(id);
        await loadProdutos();
      } catch (error) {
        console.error('Erro ao deletar produto:', error);
        alert('Erro ao excluir produto.');
      }
    }
  };

  const columns: TableColumn<Produto & { id: string }>[] = [
    { 
      key: 'foto_url', 
      header: 'Foto',
      render: (item) => (
        <div style={{ position: 'relative', width: '40px', height: '40px', overflow: 'hidden', borderRadius: '4px' }}>
          <Image 
            src={convertDriveImageLink(item.foto_url) || 'https://via.placeholder.com/40?text=S/F'} 
            alt="thumb" 
            fill
            sizes="40px"
            style={{ objectFit: 'cover' }} 
          />
        </div>
      )
    },
    { 
      key: 'nome', 
      header: 'Nome do Produto',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {item.nome}
          {item.destaque && <span title="Produto em Destaque">🔥</span>}
        </div>
      )
    },
    { key: 'categoria', header: 'Categoria' },
    { 
      key: 'estoque_central', 
      header: 'Estoque',
      render: (item) => (
        <span className={`status-badge ${item.estoque_central > 5 ? 'status-badge--success' : 'status-badge--warning'}`}>
          {item.estoque_central} un
        </span>
      )
    },
    { 
      key: 'preco_venda_sugerido', 
      header: 'Preço Venda',
      render: (item) => `R$ ${item.preco_venda_sugerido.toFixed(2).replace('.', ',')}`
    },
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
        <h1 className="page-title">📦 Produtos</h1>
        <Button onClick={() => openModal()}>+ Novo Produto</Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando produtos...</div>
      ) : (
        <Table data={produtos} columns={columns} emptyMessage="Nenhum produto cadastrado ainda." />
      )}

      {/* Modal de Criação / Edição */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingId ? 'Editar Produto' : 'Novo Produto'}
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={isSubmitting || isUploading}>Cancelar</Button>
            <Button type="submit" form="produto-form" isLoading={isSubmitting} disabled={isUploading}>Salvar Produto</Button>
          </>
        }
      >
        <form id="produto-form" onSubmit={handleSave}>
          <Input
            label="Nome do Produto"
            placeholder="Ex: Chaveiro Taça da Copa"
            value={formData.nome}
            onChange={(e) => setFormData({...formData, nome: e.target.value})}
            required
          />

          <div className="form-group">
            <label className="form-label">Descrição (Opcional)</label>
            <textarea
              className="input-field"
              placeholder="Ex: Chaveiro Taça da Copa em 3D Dourado, feito em resina premium."
              value={formData.descricao}
              onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="categoria-input" className="form-label">Categoria</label>
            <div className="input-wrapper">
              <input
                id="categoria-input"
                className="input-field"
                list="categorias-sugeridas"
                placeholder="Selecione ou digite uma nova..."
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                required
              />
            </div>
            <datalist id="categorias-sugeridas">
              {CATEGORIAS_SUGERIDAS.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#fafafa', border: '1px solid #eaeaea', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
              <Input
                label="Custo (R$)"
                type="number"
                step="0.01"
                min="0"
                value={formData.custo_aquisicao === 0 ? '' : formData.custo_aquisicao}
                onChange={(e) => setFormData({...formData, custo_aquisicao: parseFloat(e.target.value)})}
                required
              />
              <Input
                label="Preço de Venda (R$)"
                type="number"
                step="0.01"
                min="0"
                value={formData.preco_venda_sugerido === 0 ? '' : formData.preco_venda_sugerido}
                onChange={(e) => setFormData({...formData, preco_venda_sugerido: parseFloat(e.target.value)})}
                required
              />
            </div>
            
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setShowCalculator(!showCalculator)}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                🧮 {showCalculator ? 'Ocultar Simulação' : 'Simular Precificação Inteligente'}
              </button>
            </div>

            {showCalculator && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #ccc', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <Input
                  label="Impostos (%)"
                  type="number"
                  placeholder="Ex: 6"
                  value={calcImpostos}
                  onChange={(e) => setCalcImpostos(e.target.value === '' ? '' : parseFloat(e.target.value))}
                />
                <Input
                  label="Comissão (%)"
                  type="number"
                  placeholder="Ex: 10"
                  value={calcComissao}
                  onChange={(e) => setCalcComissao(e.target.value === '' ? '' : parseFloat(e.target.value))}
                />
                <Input
                  label="Margem Líq. (%)"
                  type="number"
                  placeholder="Ex: 30"
                  value={calcMargem}
                  onChange={(e) => setCalcMargem(e.target.value === '' ? '' : parseFloat(e.target.value))}
                />
              </div>
            )}
          </div>

          <Input
            label="Estoque Inicial"
            type="number"
            min="0"
            value={formData.estoque_central === 0 ? '' : formData.estoque_central}
            onChange={(e) => setFormData({...formData, estoque_central: parseInt(e.target.value) || 0})}
            required
          />

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={formData.destaque}
                onChange={(e) => setFormData({...formData, destaque: e.target.checked})}
                style={{ width: '1.25rem', height: '1.25rem' }}
              />
              <span style={{ fontWeight: 600 }}>🔥 Exibir como Destaque na Página Pública</span>
            </label>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)' }}>
            <label className="form-label">Imagem do Produto (Upload Inteligente)</label>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              {formData.foto_url && (
                <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: '#fff', overflow: 'hidden' }}>
                  <Image 
                    src={convertDriveImageLink(formData.foto_url)} 
                    alt="Preview" 
                    fill
                    sizes="80px"
                    style={{ objectFit: 'contain' }} 
                  />
                </div>
              )}
              
              <div style={{ flex: 1 }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={isUploading}
                  className="w-full"
                >
                  {isUploading ? 'Compactando e Enviando...' : '📷 Escolher Foto do Computador'}
                </Button>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', textAlign: 'center', margin: '0.5rem 0', color: 'var(--color-text-tertiary)' }}>
              — OU —
            </p>

            <Input
              label="Colar URL (Link) da Foto"
              placeholder="Ex: https://link-da-imagem.com/foto.jpg"
              value={formData.foto_url || ''}
              onChange={(e) => setFormData({...formData, foto_url: e.target.value})}
            />
            
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem', textAlign: 'center' }}>
              💡 <strong>Dica de Ouro:</strong> Para sua vitrine ficar com padrão "Apple/Shopee", prefira imagens limpas com <strong>fundo branco puro</strong> ou <strong>fundo transparente (PNG)</strong>.
            </p>

            {/* NOVOS CAMPOS: Vídeo e Fotos Adicionais */}
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Mídias Adicionais (Links em Nuvem)</h4>
              
              <Input
                label="Vídeo do Produto (Recomendado: Link do YouTube)"
                placeholder="Ex: https://youtu.be/..."
                value={formData.video_url || ''}
                onChange={(e) => setFormData({...formData, video_url: e.target.value})}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
                O link do YouTube será convertido automaticamente para tocar direto na página sem o usuário precisar sair da loja.
              </p>

              <label className="form-label">Fotos Extras (Links do Google Drive, Imgur, etc)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[0, 1, 2, 3, 4, 5].map(index => (
                  <Input
                    key={`foto_extra_${index}`}
                    label={`Foto Extra ${index + 1}`}
                    placeholder="Cole o link aqui..."
                    value={(formData.fotos_adicionais && formData.fotos_adicionais[index]) || ''}
                    onChange={(e) => {
                      const novasFotos = [...(formData.fotos_adicionais || ['', '', '', '', '', ''])];
                      novasFotos[index] = e.target.value;
                      setFormData({...formData, fotos_adicionais: novasFotos});
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                *Lembre-se de deixar a pasta do seu Google Drive como <strong>"Qualquer pessoa com o link"</strong> para as fotos abrirem.
              </p>
            </div>
          </div>
          
          <button type="submit" style={{ display: 'none' }}>Salvar</button>
        </form>
      </Modal>
    </div>
  );
}
