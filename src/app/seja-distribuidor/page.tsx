'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function SejaDistribuidorPage() {
  const router = useRouter();

  const handleWhatsApp = () => {
    const text = encodeURIComponent("Olá! Gostaria de saber mais sobre como me tornar um distribuidor Aura Premium.");
    // Substitua pelo número real
    window.open(`https://wa.me/5511999999999?text=${text}`, '_blank');
  };

  return (
    <div className="public-layout">
      {/* HEADER SIMPLES */}
      <header className="public-header" style={{ justifyContent: 'space-between' }}>
        <div className="public-logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          Aura Premium
        </div>
        <div style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--color-text-secondary)' }} onClick={() => router.push('/')}>
          Voltar para a Loja
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {/* HERO SECTION */}
        <section style={{ 
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #000 100%)', 
          color: '#fff', 
          padding: '6rem 2rem', 
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.1 }}>
              Torne-se um <span style={{ color: 'var(--color-accent)' }}>Distribuidor Premium</span>
            </h1>
            <p style={{ fontSize: '1.25rem', opacity: 0.9, marginBottom: '3rem', lineHeight: 1.6 }}>
              Aumente sua margem de lucro revendendo produtos exclusivos e de alta qualidade. Junte-se à rede de parceiros Aura Premium e tenha suporte completo para fazer o seu negócio crescer.
            </p>
            <Button size="lg" onClick={handleWhatsApp} style={{ backgroundColor: 'var(--color-accent)', color: '#000', fontSize: '1.1rem', padding: '1rem 3rem' }}>
              Falar com um Consultor pelo WhatsApp
            </Button>
          </div>
          {/* Círculos de Fundo Decorativos */}
          <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', zIndex: 0 }} />
          <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', zIndex: 0 }} />
        </section>

        {/* BENEFÍCIOS */}
        <section style={{ padding: '5rem 2rem', backgroundColor: 'var(--color-bg-secondary)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: 700, marginBottom: '4rem', color: 'var(--color-text-primary)' }}>
              Por que revender Aura Premium?
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              
              {/* Card 1 */}
              <div style={{ backgroundColor: '#fff', padding: '2.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'transform 0.3s' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>📈</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Alta Margem de Lucro</h3>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Preços de atacado exclusivos que garantem uma margem de revenda excelente, permitindo o crescimento rápido do seu negócio.
                </p>
              </div>

              {/* Card 2 */}
              <div style={{ backgroundColor: '#fff', padding: '2.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'transform 0.3s' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🎯</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Qualidade Premium</h3>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Trabalhamos com fornecedores rigorosamente selecionados. Ofereça aos seus clientes produtos com alto valor agregado e qualidade impecável.
                </p>
              </div>

              {/* Card 3 */}
              <div style={{ backgroundColor: '#fff', padding: '2.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'transform 0.3s' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🤝</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Suporte Especializado</h3>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Material de marketing, fotos em alta resolução e atendimento direto no WhatsApp para tirar dúvidas e ajudar nas suas vendas.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section style={{ padding: '5rem 2rem', backgroundColor: '#fff' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
             <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '3rem', color: 'var(--color-text-primary)' }}>
              Como Funciona
            </h2>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '3rem' }}>
              <div style={{ flex: '1 1 250px', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#fff', fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>1</div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Contato Inicial</h4>
                <p style={{ color: 'var(--color-text-secondary)' }}>Fale conosco pelo WhatsApp e apresente seu interesse e/ou CNPJ.</p>
              </div>
              
              <div style={{ flex: '1 1 250px', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#fff', fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>2</div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Aprovação</h4>
                <p style={{ color: 'var(--color-text-secondary)' }}>Nossa equipe avalia seu perfil rapidamente e libera seu cadastro de atacadista.</p>
              </div>
              
              <div style={{ flex: '1 1 250px', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#fff', fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>3</div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Venda e Lucre</h4>
                <p style={{ color: 'var(--color-text-secondary)' }}>Acesse a loja com preços reduzidos, faça seus pedidos e comece a lucrar.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section style={{ padding: '6rem 2rem', textAlign: 'center', backgroundColor: 'var(--color-bg-secondary)' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Pronto para começar?</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
            Não perca tempo com formulários complexos. Envie uma mensagem direta e nossa equipe cuidará do seu cadastro.
          </p>
          <Button size="lg" onClick={handleWhatsApp} style={{ backgroundColor: '#25D366', color: '#fff', fontSize: '1.1rem', padding: '1rem 3rem' }}>
             WhatsApp: Falar Agora
          </Button>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ backgroundColor: '#fff', borderTop: '1px solid var(--color-border)', padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
        <p>&copy; 2026 Aura Premium. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
