'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/services/firebase';
import { configuracoesAPI } from '@/services/api';
import { Configuracao } from '@/types/models';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Configuracao, 'id'>>({
    nome_loja: '',
    telefone_publico: '',
    mensagem_rodape: '',
    instagram: '',
    banner_titulo: '',
    banner_subtitulo: '',
    banner_alinhamento_horizontal: 'center',
    banner_alinhamento_vertical: 'center',
    banner_imagem_posicao: 'center'
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const config = await configuracoesAPI.getGeral();
        if (config) {
          setExistingId(config.id || null);
          setFormData({
            nome_loja: config.nome_loja || '',
            telefone_publico: config.telefone_publico || '',
            mensagem_rodape: config.mensagem_rodape || '',
            instagram: config.instagram || '',
            banner_titulo: config.banner_titulo || '',
            banner_subtitulo: config.banner_subtitulo || '',
            banner_alinhamento_horizontal: config.banner_alinhamento_horizontal || 'center',
            banner_alinhamento_vertical: config.banner_alinhamento_vertical || 'center',
            banner_imagem_posicao: config.banner_imagem_posicao || 'center'
          });
        }

      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newId = await configuracoesAPI.saveGeral(formData, existingId || undefined);
      if (!existingId) {
        setExistingId(newId);
      }
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Ocorreu um erro ao salvar as configurações.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando configurações...</div>;
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <h1 className="page-title">⚙️ Configurações Gerais</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Seção de Perfil */}
        <section style={{ padding: '2rem', backgroundColor: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Perfil Administrativo</h2>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>E-mail de acesso:</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', fontWeight: 'bold' }}>
                {auth.currentUser?.email || 'Usuário não identificado'}
              </div>
              <span className="status-badge status-badge--success">Logado e Autenticado</span>
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
              A alteração de e-mail e senha de administrador deve ser feita diretamente no painel do Firebase Console por motivos de segurança estrutural.
            </p>
          </div>
        </section>

        {/* Seção da Loja (Catálogo Público) */}
        <section style={{ padding: '2rem', backgroundColor: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Aparência do Catálogo</h2>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Estas informações serão utilizadas na vitrine pública onde os clientes finais verão seus produtos.
          </p>
          
          <form id="config-form" onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <Input
                label="Nome Oficial da Loja / Marca"
                placeholder="Ex: RB Store"
                value={formData.nome_loja}
                onChange={(e) => setFormData({...formData, nome_loja: e.target.value})}
                required
              />
              <Input
                label="WhatsApp de Contato Público"
                placeholder="(00) 00000-0000"
                value={formData.telefone_publico}
                onChange={(e) => setFormData({...formData, telefone_publico: e.target.value})}
              />
              <Input
                label="Link do Instagram"
                placeholder="Ex: https://instagram.com/rbstore"
                value={formData.instagram || ''}
                onChange={(e) => setFormData({...formData, instagram: e.target.value})}
              />
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Mensagem de Rodapé (Footer)</label>
              <textarea 
                className="input-field" 
                rows={3} 
                placeholder="Ex: Entregamos em toda a região. Entre em contato para parcerias B2B."
                value={formData.mensagem_rodape}
                onChange={(e) => setFormData({...formData, mensagem_rodape: e.target.value})}
              />
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" isLoading={isSubmitting}>Salvar Configurações</Button>
            </div>
          </form>
        </section>

        {/* Seção do Banner da Página Inicial */}
        <section style={{ padding: '2rem', backgroundColor: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Banner da Página Inicial</h2>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Personalize os textos e posições do banner principal que aparece para os clientes.
          </p>
          
          <form id="banner-form" onSubmit={handleSave}>
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              <Input
                label="Título do Banner"
                placeholder="Ex: Chegou a Nova Coleção."
                value={formData.banner_titulo || ''}
                onChange={(e) => setFormData({...formData, banner_titulo: e.target.value})}
              />
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Subtítulo / Descrição</label>
                <textarea 
                  className="input-field" 
                  rows={2} 
                  placeholder="Ex: Design premium e qualidade insuperável."
                  value={formData.banner_subtitulo || ''}
                  onChange={(e) => setFormData({...formData, banner_subtitulo: e.target.value})}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Alinhamento Horizontal</label>
                <select 
                  className="input-field" 
                  value={formData.banner_alinhamento_horizontal || 'center'}
                  onChange={(e) => setFormData({...formData, banner_alinhamento_horizontal: e.target.value as any})}
                >
                  <option value="flex-start">Esquerda</option>
                  <option value="center">Centro</option>
                  <option value="flex-end">Direita</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Alinhamento Vertical</label>
                <select 
                  className="input-field" 
                  value={formData.banner_alinhamento_vertical || 'center'}
                  onChange={(e) => setFormData({...formData, banner_alinhamento_vertical: e.target.value as any})}
                >
                  <option value="flex-start">Topo</option>
                  <option value="center">Centro</option>
                  <option value="flex-end">Base</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Posição da Imagem (Foco)</label>
                <select 
                  className="input-field" 
                  value={formData.banner_imagem_posicao || 'center'}
                  onChange={(e) => setFormData({...formData, banner_imagem_posicao: e.target.value as any})}
                >
                  <option value="top">Topo</option>
                  <option value="center">Centro</option>
                  <option value="bottom">Base</option>
                  <option value="left">Esquerda</option>
                  <option value="right">Direita</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" isLoading={isSubmitting}>Salvar Banner</Button>
            </div>
          </form>
        </section>

      </div>
    </div>
  );
}
