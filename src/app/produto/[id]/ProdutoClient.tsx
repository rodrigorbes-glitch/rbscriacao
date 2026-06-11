'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { produtosAPI, configuracoesAPI } from '@/services/api';
import { Produto, Configuracao } from '@/types/models';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import Button from '@/components/ui/Button';
import CartDrawer from '@/components/public/CartDrawer';

export default function ProdutoDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addItem, setIsCartOpen, totalItems } = useCart();
  const { isFavorite, toggleFavorite, totalFavorites } = useFavorites();
  
  const [produto, setProduto] = useState<Produto | null>(null);
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantidade, setQuantidade] = useState(1);
  const [currentImage, setCurrentImage] = useState<string>('');

  useEffect(() => {
    const loadProduto = async () => {
      try {
        if (!id) return;
        const prod = await produtosAPI.getById(id as string);
        const config = await configuracoesAPI.getGeral();
        setProduto(prod);
        setConfiguracao(config);
        if (prod) {
          setCurrentImage(prod.foto_url || '');
        }
      } catch (error) {
        console.error("Erro ao carregar produto:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProduto();
  }, [id]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleAddToCart = () => {
    if (!produto) return;
    addItem(produto, quantidade);
    
    const btn = document.getElementById('add-btn');
    if (btn) {
      const originalText = btn.innerText;
      btn.innerText = '✓ Adicionado';
      btn.style.backgroundColor = 'var(--color-success)';
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.backgroundColor = '';
      }, 1500);
    }
  };

  const handleToggleFavorite = () => {
    if (!produto) return;
    toggleFavorite(produto);
    
    const favIcon = document.getElementById('fav-badge-pdp');
    if (favIcon) {
      favIcon.style.transform = 'scale(1.5)';
      setTimeout(() => {
        favIcon.style.transform = 'scale(1)';
      }, 300);
    }
  };

  if (loading) {
    return (
      <div className="public-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="auth-spinner"></div>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="public-layout" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h2>Produto não encontrado</h2>
        <Button onClick={() => router.push('/')} style={{ marginTop: '1rem' }}>Voltar para a Loja</Button>
      </div>
    );
  }

  const nomeLoja = configuracao?.nome_loja || "Sua Loja";

  return (
    <div className="public-layout">
      {/* HEADER */}
      <header className="public-header">
        <div className="public-logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          &larr; Voltar
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* FAVORITOS */}
          <div 
            className="cart-icon-wrapper" 
            title="Meus Favoritos"
            onClick={() => router.push('/favoritos')}
            style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            {totalFavorites > 0 && (
              <span 
                id="fav-badge-pdp"
                style={{
                  position: 'absolute', top: -5, right: -5, 
                  backgroundColor: 'var(--color-danger)', color: 'white', 
                  fontSize: '0.65rem', fontWeight: 'bold', 
                  width: '18px', height: '18px', 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                {totalFavorites}
              </span>
            )}
          </div>
          
          {/* CARRINHO */}
          <div 
            className="cart-icon-wrapper" 
            title="Meu Carrinho"
            onClick={() => setIsCartOpen(true)}
            style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            {totalItems > 0 && (
              <span 
                id="cart-badge-pdp"
                style={{
                  position: 'absolute', top: -5, right: -5, 
                  backgroundColor: 'var(--color-danger)', color: 'white', 
                  fontSize: '0.65rem', fontWeight: 'bold', 
                  width: '18px', height: '18px', 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                {totalItems}
              </span>
            )}
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', marginTop: '2rem' }}>
          
          {/* IMAGEM DO PRODUTO */}
          <div style={{ flex: '1 1 400px' }}>
            <div style={{ 
              backgroundColor: '#f8f8f9', 
              borderRadius: 'var(--radius-lg)', 
              padding: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1/1',
              position: 'relative',
              marginBottom: '1rem'
            }}>
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Image 
                  src={currentImage || 'https://via.placeholder.com/600x600?text=Sem+Foto'} 
                  alt={produto.nome}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: 'contain', mixBlendMode: 'multiply' }} 
                  priority
                />
              </div>
              <button 
                onClick={handleToggleFavorite}
                style={{
                  position: 'absolute', top: '20px', right: '20px',
                  background: '#fff', border: 'none', borderRadius: '50%',
                  width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer', fontSize: '1.5rem', zIndex: 2
                }}
              >
                {isFavorite(produto.id as string) ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-danger)" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                )}
              </button>
            </div>
            
            {/* MINIATURAS (GALERIA) */}
            {produto.fotos_adicionais && produto.fotos_adicionais.some(url => url) && (
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'thin' }}>
                {[produto.foto_url, ...produto.fotos_adicionais].filter(Boolean).map((imgUrl, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setCurrentImage(imgUrl as string)}
                    style={{
                      width: '80px',
                      height: '80px',
                      flexShrink: 0,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#f8f8f9',
                      border: currentImage === imgUrl ? '2px solid var(--color-primary)' : '2px solid transparent',
                      position: 'relative',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    <Image 
                      src={imgUrl as string}
                      alt={`Miniatura ${idx + 1}`}
                      fill
                      sizes="80px"
                      style={{ objectFit: 'contain', mixBlendMode: 'multiply' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DETALHES DO PRODUTO */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {produto.categoria}
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
              {produto.nome}
            </h1>
            
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {formatCurrency(produto.preco_venda_sugerido)}
            </div>

            {produto.descricao && (
              <div style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: '0.5rem' }}>
                {produto.descricao}
              </div>
            )}

            <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '1rem 0' }}></div>

            <div>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Quantidade</p>
              <div className="quantity-selector" style={{ width: 'fit-content' }}>
                <button 
                  disabled={quantidade <= 1}
                  onClick={() => setQuantidade(q => q - 1)}
                >
                  -
                </button>
                <span style={{ width: '40px', fontSize: '1rem' }}>{quantidade}</span>
                <button 
                  disabled={quantidade >= produto.estoque_central}
                  onClick={() => setQuantidade(q => q + 1)}
                >
                  +
                </button>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                {produto.estoque_central} disponíveis em estoque
              </p>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
              <Button 
                id="add-btn"
                className="w-full" 
                style={{ padding: '1rem', fontSize: '1.125rem' }}
                onClick={handleAddToCart}
                disabled={produto.estoque_central <= 0}
              >
                {produto.estoque_central > 0 ? '+ Adicionar ao Carrinho' : 'Sem Estoque'}
              </Button>
            </div>
          </div>
        </div>

        {/* SEÇÃO DE VÍDEO DO PRODUTO */}
        {produto.video_url && (
          <div style={{ marginTop: '4rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>Vídeo do Produto</h2>
            <div style={{ 
              position: 'relative', 
              paddingBottom: '56.25%', /* 16:9 Aspect Ratio */
              height: 0,
              overflow: 'hidden',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: '#000',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <iframe 
                src={produto.video_url} 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 0
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                title={`Vídeo do produto ${produto.nome}`}
              ></iframe>
            </div>
          </div>
        )}
      </main>
      
      <CartDrawer />
    </div>
  );
}
