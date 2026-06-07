'use client';

import { useState, useEffect } from 'react';
import { configuracoesAPI } from '@/services/api';
import { Produto, Configuracao } from '@/types/models';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import Button from '@/components/ui/Button';

export default function FavoritosPage() {
  const router = useRouter();
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { totalItems, setIsCartOpen, addItem } = useCart();
  const { favorites, isFavorite, toggleFavorite, totalFavorites } = useFavorites();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await configuracoesAPI.getGeral();
        setConfiguracao(config);
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleProductClick = (produtoId: string) => {
    const realId = produtoId.split('_copia_')[0];
    router.push(`/produto/${realId}`);
  };

  const handleAddToCart = (e: React.MouseEvent, produto: Produto) => {
    e.stopPropagation(); 
    addItem(produto, 1);
    
    const cartIcon = document.getElementById('cart-badge-fav');
    if (cartIcon) {
      cartIcon.style.transform = 'scale(1.5)';
      cartIcon.style.backgroundColor = 'var(--color-success)';
      setTimeout(() => {
        cartIcon.style.transform = 'scale(1)';
        cartIcon.style.backgroundColor = 'var(--color-danger)';
      }, 300);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent, produto: Produto) => {
    e.stopPropagation();
    toggleFavorite(produto);
  };

  if (loading) {
    return (
      <div className="public-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="auth-spinner"></div>
      </div>
    );
  }

  const nomeLoja = configuracao?.nome_loja || "Sua Loja";

  return (
    <div className="public-layout">
      {/* HEADER MINIMALISTA */}
      <header className="public-header">
        <div className="public-logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          &larr; Voltar
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* FAVORITOS */}
          <div 
            className="cart-icon-wrapper" 
            title="Meus Favoritos"
            style={{ position: 'relative' }}
          >
            <span style={{ fontSize: '1.25rem' }}>❤️</span>
            {totalFavorites > 0 && (
              <span 
                style={{
                  position: 'absolute', top: -5, right: -5, 
                  backgroundColor: 'var(--color-danger)', color: 'white', 
                  fontSize: '0.65rem', fontWeight: 'bold', 
                  width: '18px', height: '18px', 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
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
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            <span style={{ fontSize: '1.25rem' }}>🛍️</span>
            {totalItems > 0 && (
              <span 
                id="cart-badge-fav"
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

      <main style={{ flex: 1, paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
            <h1 className="section-title-public" style={{ margin: 0 }}>Meus Favoritos</h1>
            <span style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
              {totalFavorites} itens
            </span>
          </div>

          {favorites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '6rem 2rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>❤️</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sua lista está vazia</h2>
              <p style={{ color: 'var(--color-text-tertiary)', marginBottom: '2rem' }}>Navegue pela loja e adicione os produtos que você mais gostou.</p>
              <Button onClick={() => router.push('/')}>Explorar Produtos</Button>
            </div>
          ) : (
            <div className="products-grid-public">
              {favorites.map(produto => (
                <div key={produto.id} className="product-card-public" style={{ minWidth: 'auto', cursor: 'pointer' }} onClick={() => handleProductClick(produto.id as string)}>
                  <div className="product-card-image-wrapper" style={{ position: 'relative' }}>
                    <img 
                      src={produto.foto_url || 'https://via.placeholder.com/300x300?text=Sem+Foto'} 
                      alt={produto.nome} 
                    />
                    <button 
                      onClick={(e) => handleToggleFavorite(e, produto)}
                      style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: '#fff', border: 'none', borderRadius: '50%',
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', zIndex: 2
                      }}
                    >
                      {isFavorite(produto.id as string) ? '❤️' : '🤍'}
                    </button>
                  </div>
                  <div className="product-card-info">
                    <div className="product-card-title">{produto.nome}</div>
                    <div className="product-card-price">{formatCurrency(produto.preco_venda_sugerido)}</div>
                    
                    {produto.estoque_central > 0 ? (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        style={{ marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.875rem' }}
                        onClick={(e) => handleAddToCart(e, produto)}
                      >
                        + Adicionar
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        style={{ marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.875rem', opacity: 0.5 }}
                        disabled
                      >
                        Sem Estoque
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
