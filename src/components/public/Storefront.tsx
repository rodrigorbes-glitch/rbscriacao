'use client';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { produtosAPI, configuracoesAPI } from '@/services/api';
import { Produto, Configuracao } from '@/types/models';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import CartDrawer from '@/components/public/CartDrawer';
import Button from '@/components/ui/Button';

export default function Storefront({ initialProdutos, initialConfiguracao }: { initialProdutos: Produto[], initialConfiguracao: Configuracao | null }) {
  const router = useRouter();
  const [produtos] = useState<Produto[]>(initialProdutos);
  const [configuracao] = useState<Configuracao | null>(initialConfiguracao);
  
  // Carousel State
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  
  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('recentes');
  
  const { totalItems, setIsCartOpen, addItem } = useCart();
  const { isFavorite, toggleFavorite, totalFavorites } = useFavorites();

  // Auto-play Carousel Effect
  useEffect(() => {
    // Only run if not hovered, ref exists, and there are featured products
    if (isCarouselHovered || !carouselRef.current || produtos.filter(p => p.destaque).length === 0) return;
    
    const intervalId = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        // Se chegou no final (com uma margem de erro de 10px), volta pro começo
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: 260, behavior: 'smooth' }); // Aproximadamente 1 card + gap
        }
      }
    }, 3500); // Roda a cada 3.5 segundos
    
    return () => clearInterval(intervalId);
  }, [isCarouselHovered, produtos]);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 260;
      carouselRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleWhatsAppClick = () => {
    const phone = configuracao?.telefone_publico ? configuracao.telefone_publico.replace(/\D/g, '') : '5511999999999';
    if (!configuracao?.telefone_publico) {
      alert("Dica: Você ainda não salvou o seu Telefone lá na página de Configurações do Admin. Este é um número de teste.");
    }
    const message = encodeURIComponent(`Olá! Vim pela loja online e gostaria de falar com o atendimento.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  // Derivar categorias únicas
  const categorias = Array.from(new Set(produtos.map(p => p.categoria))).filter(Boolean);

  // Aplicar filtros e ordenação
  const filteredAndSortedProdutos = produtos
    .filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.descricao && p.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory ? p.categoria === selectedCategory : true;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'menor_preco') return a.preco_venda_sugerido - b.preco_venda_sugerido;
      if (sortBy === 'maior_preco') return b.preco_venda_sugerido - a.preco_venda_sugerido;
      if (sortBy === 'mais_vendidos') {
        const aScore = a.destaque ? 1 : 0;
        const bScore = b.destaque ? 1 : 0;
        return bScore - aScore;
      }
      const dateA = a.createdAt || 0;
      const dateB = b.createdAt || 0;
      return dateB - dateA;
    });

  const handleProductClick = (produtoId: string) => {
    const realId = produtoId.split('_copia_')[0];
    router.push(`/produto/${realId}`);
  };

  const handleAddToCart = (e: React.MouseEvent, produto: Produto) => {
    e.stopPropagation(); 
    addItem(produto, 1);
    
    const cartIcon = document.getElementById('cart-badge');
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
    
    const favIcon = document.getElementById('fav-badge');
    if (favIcon) {
      favIcon.style.transform = 'scale(1.5)';
      setTimeout(() => {
        favIcon.style.transform = 'scale(1)';
      }, 300);
    }
  };



  const nomeLoja = configuracao?.nome_loja || "Sua Loja";

  return (
    <div className="public-layout">
      {/* HEADER MINIMALISTA */}
      <header className="public-header">
        <div className="public-logo">{nomeLoja}</div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          
          {/* LINK DISTRIBUIDOR */}
          <div 
            onClick={() => router.push('/seja-distribuidor')}
            style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}
            title="Torne-se um Distribuidor"
          >
            Seja um Distribuidor
          </div>
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
                id="fav-badge"
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
                id="cart-badge"
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

      <main style={{ flex: 1, paddingBottom: '4rem', minWidth: 0, width: '100%', overflowX: 'hidden' }}>
        
        {/* HERO BANNER (APPLE STYLE) */}
        {/* HERO BANNER */}
        <section style={{ width: '100%', overflow: 'hidden' }}>
          <Image 
            src="/banner_vermelho.png" 
            alt="RBS Criação - Modelos 3D, Decoração, Design de Festas" 
            width={1920}
            height={600}
            style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
            priority
          />
        </section>

        {produtos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-tertiary)' }}>
            Nenhum produto disponível no catálogo no momento.
          </div>
        ) : (
          <>
            {produtos.filter(p => p.destaque === true).length > 0 && (
              <>
                <h2 className="section-title-public">🔥 Destaques</h2>
                <div 
                  className="carousel-wrapper"
                  onMouseEnter={() => setIsCarouselHovered(true)}
                  onMouseLeave={() => setIsCarouselHovered(false)}
                  onTouchStart={() => setIsCarouselHovered(true)} // Pausa ao tocar no celular também
                  onTouchEnd={() => setIsCarouselHovered(false)}
                >
                  {/* Left Arrow */}
                  <button className="carousel-arrow carousel-arrow--left" onClick={() => scrollCarousel('left')}>
                    &#10094;
                  </button>
                  
                  <div className="carousel-container" ref={carouselRef}>
                    {produtos.filter(p => p.destaque === true).map(produto => (
                <div key={produto.id} className="product-card-public" onClick={() => handleProductClick(produto.id as string)} style={{ cursor: 'pointer' }}>
                  <div className="product-card-image-wrapper" style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden' }}>
                    <Image 
                      src={produto.foto_url || 'https://via.placeholder.com/300x300?text=Sem+Foto'} 
                      alt={produto.nome} 
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
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
                      {isFavorite(produto.id as string) ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-danger)" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="product-card-info">
                    <div className="product-card-title">{produto.nome}</div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: 'auto',
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                      margin: '1rem -1rem -1rem -1rem',
                      padding: '1rem',
                      borderTop: '1px solid rgba(0, 0, 0, 0.03)'
                    }}>
                      <div className="product-card-price" style={{ marginTop: 0 }}>{formatCurrency(produto.preco_venda_sugerido)}</div>
                      <button 
                        onClick={(e) => handleAddToCart(e, produto)}
                        style={{ 
                          background: 'none', border: 'none', color: 'var(--color-text-primary)', 
                          fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                          cursor: 'pointer', padding: '0.25rem 0', borderBottom: '1px solid var(--color-text-primary)'
                        }}
                      >
                        Comprar
                      </button>
                    </div>
                  </div>
                </div>
                  ))}
                  </div>

                  {/* Right Arrow */}
                  <button className="carousel-arrow carousel-arrow--right" onClick={() => scrollCarousel('right')}>
                    &#10095;
                  </button>
                </div>
              </>
            )}

            {/* BARRA DE FILTROS */}
            <div className="filters-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', backgroundColor: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', alignItems: 'center' }}>
              <div style={{ flex: '1 1 250px' }}>
                <input 
                  type="text" 
                  placeholder="Pesquisar produto..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-bg-primary)', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-bg-primary)', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23333\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '1.2rem auto' }}
                >
                  <option value="">Todas as Categorias</option>
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-bg-primary)', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23333\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '1.2rem auto' }}
                >
                  <option value="recentes">Lançamentos</option>
                  <option value="mais_vendidos">Mais Vendidos</option>
                  <option value="menor_preco">Menor Preço</option>
                  <option value="maior_preco">Maior Preço</option>
                </select>
              </div>
            </div>

            {/* GRID CONTÍNUO (TODOS OS PRODUTOS) */}
            <h2 className="section-title-public" style={{ marginTop: '2rem' }}>Catálogo Completo</h2>
            
            {filteredAndSortedProdutos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                Nenhum produto encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="products-grid-public">
                {filteredAndSortedProdutos.map(produto => (
                <div key={produto.id} className="product-card-public" style={{ minWidth: 'auto', cursor: 'pointer' }} onClick={() => handleProductClick(produto.id as string)}>
                  <div className="product-card-image-wrapper" style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden' }}>
                    <Image 
                      src={produto.foto_url || 'https://via.placeholder.com/300x300?text=Sem+Foto'} 
                      alt={produto.nome} 
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
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
                      {isFavorite(produto.id as string) ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-danger)" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="product-card-info">
                    <div className="product-card-title">{produto.nome}</div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: 'auto',
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                      margin: '1rem -1rem -1rem -1rem',
                      padding: '1rem',
                      borderTop: '1px solid rgba(0, 0, 0, 0.03)'
                    }}>
                      <div className="product-card-price" style={{ marginTop: 0 }}>{formatCurrency(produto.preco_venda_sugerido)}</div>
                      <button 
                        onClick={(e) => handleAddToCart(e, produto)}
                        style={{ 
                          background: 'none', border: 'none', color: 'var(--color-text-primary)', 
                          fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                          cursor: 'pointer', padding: '0.25rem 0', borderBottom: '1px solid var(--color-text-primary)'
                        }}
                      >
                        Comprar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ backgroundColor: 'var(--color-bg-primary)', padding: '2rem', textAlign: 'center', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
        <p>{configuracao?.mensagem_rodape || "Entregamos para toda a região."}</p>
        <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>&copy; {new Date().getFullYear()} {nomeLoja}. Todos os direitos reservados.</p>
      </footer>

      {/* FLOATING ACTION BUTTONS (FAB) */}
      <div className="fab-container">
        {/* Agora o WhatsApp sempre aparece para demonstração */}
        <a onClick={handleWhatsAppClick} className="fab-button fab-whatsapp" title="Falar no WhatsApp">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
        <a 
          href={configuracao?.instagram || "#"} 
          target={configuracao?.instagram ? "_blank" : "_self"}
          className="fab-button fab-instagram" 
          title="Siga no Instagram"
          onClick={(e) => {
            if (!configuracao?.instagram) {
              e.preventDefault();
              alert("Dica: Você ainda não configurou o link do seu Instagram lá no painel de Configurações!");
            }
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.822a1.424 1.424 0 100 2.848 1.424 1.424 0 000-2.848z"/>
          </svg>
        </a>
      </div>

      {/* DRAWER DO CARRINHO */}
      <CartDrawer />
    </div>
  );
}
