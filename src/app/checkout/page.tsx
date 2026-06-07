'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { pedidosAPI, produtosAPI } from '@/services/api';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart, isMounted } = useCart();
  const { user, userData, isOffline } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFrete, setIsLoadingFrete] = useState(false);

  // Estados de Frete
  const [freteOptions, setFreteOptions] = useState<any[]>([]);
  const [freteEscolhido, setFreteEscolhido] = useState<any | null>(null);

  // Estados de Pagamento
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: ''
  });

  // Inicializa o Mercado Pago SDK
  useEffect(() => {
    initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '', { locale: 'pt-BR' });
  }, []);

  // Autocompletar dados do usuário logado
  useEffect(() => {
    if (userData && !formData.nome) {
      setFormData(prev => ({
        ...prev,
        nome: userData.nome || '',
        email: userData.email || user?.email || '',
        whatsapp: userData.telefone || ''
      }));
    }
  }, [userData, user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const calcularFrete = async (cepDestino: string) => {
    setIsLoadingFrete(true);
    setFreteOptions([]);
    setFreteEscolhido(null);
    try {
      const res = await fetch('/api/frete/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cepDestino, carrinho: items })
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setFreteOptions(data);
        if (data.length > 0) setFreteEscolhido(data[0]); // Auto-selecionar o primeiro
      }
    } catch (error) {
      console.error('Erro ao calcular frete', error);
    } finally {
      setIsLoadingFrete(false);
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cep: e.target.value }));

    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            estado: data.uf
          }));
          document.getElementById('numero-input')?.focus();
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      }

      calcularFrete(cep);
    }
  };

  // Esta função é chamada pelo Brick do Mercado Pago após ele criptografar o cartão
  const handleMpSubmit = async ({ formData: mpFormData }: any) => {
    if (items.length === 0) {
      alert("Carrinho vazio!");
      return;
    }
    if (!freteEscolhido) {
      alert("Por favor, selecione uma opção de frete antes de pagar!");
      return;
    }
    
    setIsSubmitting(true);

    try {
      // 1. Criar o pedido localmente (Frontend tem permissão de usuário logado)
      const valorFrete = parseFloat(freteEscolhido.price);
      const enderecoCompleto = `${formData.endereco}, ${formData.numero}${formData.complemento ? ' - ' + formData.complemento : ''}, ${formData.bairro}, ${formData.cidade} - ${formData.estado}, CEP: ${formData.cep}`;
      
      const itensPedido = items.map(item => ({
        id_produto: item.id as string,
        nome: item.nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco_venda_sugerido
      }));

      const pedidoId = await pedidosAPI.create({
        user_id: user?.uid || undefined,
        cliente_nome: formData.nome,
        cliente_email: formData.email,
        cliente_whatsapp: formData.whatsapp,
        cliente_endereco: enderecoCompleto,
        itens: itensPedido,
        subtotal: subtotal,
        frete_valor: valorFrete,
        frete_transportadora: freteEscolhido.name,
        prazo_estimado: freteEscolhido.delivery_time,
        valor_total: subtotal + valorFrete,
        status: 'pendente'
      });

      // 2. Chamar backend apenas para processar pagamento no Mercado Pago
      const payload = {
        formData,
        freteEscolhido,
        carrinho: items,
        paymentMethodId: mpFormData.payment_method_id,
        paymentToken: mpFormData.token || null,
        issuerId: mpFormData.issuer_id || null,
        installments: mpFormData.installments || 1,
        user_id: user?.uid,
        pedidoId
      };

      const response = await fetch('/api/pagamento/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        // Se o pagamento falhar, podemos marcar o pedido como falho
        await pedidosAPI.update(pedidoId, { status: 'cancelado' });
        throw new Error(data.error || 'Erro ao processar pagamento.');
      }

      // 3. Atualizar status do pedido
      if (data.status === 'approved') {
        await pedidosAPI.update(pedidoId, { 
          status: 'pago',
          transacao_id: data.transacaoId
        });
        
        // Atualizar estoque (Frontend tenta, mas pode falhar por segurança se não for admin)
        try {
          const produtosDb = await produtosAPI.getAll();
          for (const item of itensPedido) {
            const prodDb = produtosDb.find(p => p.id === item.id_produto);
            if (prodDb && typeof prodDb.estoque_central === 'number') {
              const novoEstoque = Math.max(0, prodDb.estoque_central - item.quantidade);
              await produtosAPI.update(prodDb.id as string, { estoque_central: novoEstoque });
            }
          }
        } catch (e) {
          console.log("Aviso: Estoque não atualizado automaticamente devido às regras de segurança.");
        }
      } else {
        await pedidosAPI.update(pedidoId, { 
          transacao_id: data.transacaoId
          // Mantém 'pendente' para Pix
        });
      }

      setPaymentResult(data);
      clearCart();

    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    setHasLoaded(true);
  }, []);

  const totalFrete = freteEscolhido ? parseFloat(freteEscolhido.price) : 0;
  const totalGeral = subtotal + totalFrete;

  if (paymentResult) {
    return (
      <div className="public-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ backgroundColor: '#fff', padding: '3rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', maxWidth: '500px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Pedido Confirmado!</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Obrigado pela sua compra. Seu pedido nº <strong>{paymentResult.pedidoId.substring(0, 8)}</strong> foi gerado com sucesso.</p>
          
          {paymentResult.pixData?.qr_code && (
            <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Pague via Pix</h3>
              
              {paymentResult.pixData.qr_code_base64 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ position: 'relative', width: '250px', height: '250px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem', backgroundColor: '#fff' }}>
                    <Image 
                      src={`data:image/jpeg;base64,${paymentResult.pixData.qr_code_base64}`} 
                      alt="QR Code Pix" 
                      fill
                      style={{ objectFit: 'contain' }} 
                    />
                  </div>
                </div>
              )}

              <p style={{ fontSize: '0.875rem', marginBottom: '1rem', wordBreak: 'break-all', backgroundColor: '#fff', padding: '1rem', border: '1px dashed #ccc' }}>
                {paymentResult.pixData.qr_code}
              </p>
              <Button onClick={() => navigator.clipboard.writeText(paymentResult.pixData.qr_code)} style={{ width: '100%' }}>Copiar Código Pix</Button>
            </div>
          )}

          <Button variant="outline" onClick={() => router.push('/')} style={{ width: '100%' }}>Voltar para a Loja</Button>
        </div>
      </div>
    );
  }

  if (!hasLoaded) {
    return <div className="public-layout" style={{ justifyContent: 'center', alignItems: 'center' }}><div className="auth-spinner"></div></div>;
  }



  if (items.length === 0) {
    return (
      <div className="public-layout" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ backgroundColor: '#fff', padding: '3rem', borderRadius: 'var(--radius-lg)' }}>
          <h2>Seu carrinho está vazio.</h2>
          <Button onClick={() => router.push('/')} style={{ marginTop: '1rem' }}>Voltar para a Loja</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-layout">
      <header className="public-header" style={{ justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '2rem', cursor: 'pointer', fontWeight: 600, color: 'var(--color-text-secondary)' }} onClick={() => router.push('/')}>
          &larr; Voltar
        </div>
        <div className="public-logo">Finalização Segura</div>
      </header>

      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '3rem', alignItems: 'start' }}>
          
          {/* LADO ESQUERDO: ENDEREÇO E PAGAMENTO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* 1. DADOS PESSOAIS E ENDEREÇO */}
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>1. Dados de Entrega</h2>
              <div style={{ padding: '2rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Input label="Nome Completo" placeholder="João da Silva" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required readOnly={!!userData} style={userData ? { backgroundColor: '#f0f0f0' } : {}} />
                  <Input type="email" label="E-mail" placeholder="joao@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required readOnly={!!userData} style={userData ? { backgroundColor: '#f0f0f0' } : {}} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem' }}>
                  <Input label="CEP" placeholder="00000-000" value={formData.cep} onChange={handleCepChange} maxLength={9} required />
                  <Input label="WhatsApp" placeholder="(11) 99999-9999" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} required />
                </div>

                {formData.cep.length >= 8 && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                      <Input label="Endereço / Rua" value={formData.endereco} onChange={e => setFormData({...formData, endereco: e.target.value})} required />
                      <Input id="numero-input" label="Número" value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      <Input label="Complemento" value={formData.complemento} onChange={e => setFormData({...formData, complemento: e.target.value})} />
                      <Input label="Bairro" value={formData.bairro} onChange={e => setFormData({...formData, bairro: e.target.value})} required />
                      <Input label="Cidade/UF" value={`${formData.cidade} - ${formData.estado}`} readOnly style={{ backgroundColor: '#f0f0f0' }} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 2. FRETE */}
            {formData.cep.length >= 8 && (
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>2. Opções de Frete</h2>
                <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                  {isLoadingFrete ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Calculando melhores rotas... 🚚</div>
                  ) : freteOptions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {freteOptions.map(op => (
                        <label key={op.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: freteEscolhido?.id === op.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: '#fff', transition: 'all 0.2s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input type="radio" name="frete" value={op.id} checked={freteEscolhido?.id === op.id} onChange={() => setFreteEscolhido(op)} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--color-primary)' }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{op.name}</div>
                              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Entrega em até {op.delivery_time} dias úteis</div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 700 }}>
                            {formatCurrency(parseFloat(op.price))}
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--color-danger)' }}>Nenhuma transportadora atende este CEP no momento.</div>
                  )}
                </div>
              </div>
            )}

            {/* 3. PAGAMENTO (Mercado Pago) */}
            {freteEscolhido && formData.nome && formData.email && formData.numero && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>3. Pagamento Seguro</h2>
                  <span style={{ fontSize: '0.75rem', color: '#fff', backgroundColor: '#009EE3', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>💳 Mercado Pago</span>
                </div>
                
                <div style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                   <Payment
                     initialization={{
                       amount: totalGeral,
                       payer: {
                         email: formData.email,
                       }
                     }}
                     customization={{
                       paymentMethods: {
                         creditCard: 'all',
                         bankTransfer: 'all',
                       },
                       visual: {
                         style: {
                           theme: 'default'
                         }
                       }
                     }}
                     onSubmit={handleMpSubmit}
                   />
                </div>
              </div>
            )}

          </div>

          {/* LADO DIREITO: RESUMO */}
          <div style={{ position: 'sticky', top: '2rem' }}>
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Resumo</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#f8f8f9', borderRadius: 'var(--radius-sm)', padding: '0.25rem', position: 'relative', overflow: 'hidden' }}>
                      <Image src={item.foto_url || 'https://via.placeholder.com/40'} alt={item.nome} fill sizes="40px" style={{ objectFit: 'contain', mixBlendMode: 'multiply' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.nome}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Qtd: {item.quantidade}</div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {formatCurrency(item.preco_venda_sugerido * item.quantidade)}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                  <span>Produtos</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                  <span>Frete {freteEscolhido && `(${freteEscolhido.name})`}</span>
                  <span>{freteEscolhido ? formatCurrency(parseFloat(freteEscolhido.price)) : '-'}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--color-border)' }}>
                  <span>Total</span>
                  <span>{formatCurrency(totalGeral)}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                 🔒 Compra 100% Segura
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
