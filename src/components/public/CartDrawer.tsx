'use client';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function CartDrawer() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeItem, subtotal, totalItems } = useCart();

  // Fecha o drawer ao apertar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCartOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCartOpen]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <>
      <div 
        className={`drawer-overlay ${isCartOpen ? 'open' : ''}`} 
        onClick={() => setIsCartOpen(false)}
      ></div>

      
      <div className={`drawer-container ${isCartOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🛍️ Meu Carrinho <span style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>({totalItems} itens)</span>
          </h2>
          <button 
            onClick={() => setIsCartOpen(false)}
            style={{ fontSize: '1.5rem', color: 'var(--color-text-secondary)', padding: '0.5rem' }}
          >
            &times;
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-tertiary)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
              <p>Sua sacola está vazia.</p>
              <Button 
                style={{ marginTop: '1.5rem' }}
                onClick={() => setIsCartOpen(false)}
              >
                Continuar Comprando
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-image" style={{ position: 'relative', overflow: 'hidden' }}>
                    <Image src={item.foto_url || 'https://via.placeholder.com/100?text=Sem+Foto'} alt={item.nome} fill sizes="100px" style={{ objectFit: 'contain', mixBlendMode: 'multiply' }} />
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-header">
                      <h3 className="cart-item-title">{item.nome}</h3>
                      <button className="cart-item-remove" onClick={() => removeItem(item.id as string)}>
                        &times;
                      </button>
                    </div>
                    <div className="cart-item-price">{formatCurrency(item.preco_venda_sugerido)}</div>
                    
                    <div className="cart-item-controls">
                      <div className="quantity-selector">
                        <button 
                          disabled={item.quantidade <= 1}
                          onClick={() => updateQuantity(item.id as string, item.quantidade - 1)}
                        >
                          -
                        </button>
                        <span>{item.quantidade}</span>
                        <button 
                          disabled={item.quantidade >= item.estoque_central}
                          onClick={() => updateQuantity(item.id as string, item.quantidade + 1)}
                        >
                          +
                        </button>
                      </div>
                      <span className="cart-item-total">{formatCurrency(item.preco_venda_sugerido * item.quantidade)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-footer">
            <div className="drawer-subtotal">
              <span>Subtotal</span>
              <span className="subtotal-value">{formatCurrency(subtotal)}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem', textAlign: 'center' }}>
              Frete e impostos calculados na próxima etapa.
            </p>
            <Button 
              className="w-full" 
              onClick={() => {
                setIsCartOpen(false);
                window.location.href = '/checkout';
              }}
            >
              Finalizar Pedido
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
