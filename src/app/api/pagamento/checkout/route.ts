import { NextResponse } from 'next/server';
import { pedidosAPI, produtosAPI } from '@/services/api';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || 'SUA_CHAVE_AQUI';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { formData, freteEscolhido, carrinho, paymentToken, paymentMethodId, issuerId, installments, user_id, pedidoId } = payload;

    if (!carrinho || carrinho.length === 0 || !formData || !freteEscolhido || !user_id || !pedidoId) {
      return NextResponse.json({ error: 'Dados incompletos ou sessão inválida para finalizar o checkout.' }, { status: 400 });
    }

    // 1. Recalcular Total no Servidor para Evitar Fraudes (Apenas para cobrar o valor exato no MP)
    const produtosDb = await produtosAPI.getAll();
    let subtotalReal = 0;

    for (const item of carrinho) {
      const originalId = item.id.replace(/_copia_\d+$/, '');
      const prodDb = produtosDb.find(p => p.id === originalId);
      const precoUnitario = prodDb ? prodDb.preco_venda_sugerido : item.preco_venda_sugerido;
      subtotalReal += precoUnitario * item.quantidade;
    }

    const valorFrete = parseFloat(freteEscolhido.price);
    const totalReal = subtotalReal + valorFrete;

    // 2. Processar Pagamento via API do Mercado Pago
    const paymentData: any = {
      transaction_amount: Number(totalReal.toFixed(2)),
      description: `Pedido ${pedidoId} - RBS Criação`,
      payment_method_id: paymentMethodId,
      payer: {
        email: formData.email || 'comprador@email.com',
        first_name: formData.nome.split(' ')[0],
        last_name: formData.nome.split(' ').slice(1).join(' ') || ''
      },
      external_reference: pedidoId
    };

    if (paymentMethodId !== 'pix') {
      paymentData.token = paymentToken;
      paymentData.installments = Number(installments) || 1;
      if (issuerId) paymentData.issuer_id = issuerId;
    }

    const mpUrl = 'https://api.mercadopago.com/v1/payments';
    
    let mpResponseData;
    let isApproved = false;
    let transacaoId = 'mock_transaction_123';
    
    if (MP_ACCESS_TOKEN !== 'SUA_CHAVE_AQUI' && MP_ACCESS_TOKEN !== '') {
      const mpResponse = await fetch(mpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'X-Idempotency-Key': pedidoId // Evita dupla cobrança
        },
        body: JSON.stringify(paymentData)
      });
  
      mpResponseData = await mpResponse.json();
      isApproved = mpResponseData.status === 'approved' || mpResponseData.status === 'pending'; // Pix fica pending
      transacaoId = mpResponseData.id;
      
      if (!mpResponse.ok) {
        console.error('Erro no Mercado Pago:', mpResponseData);
        throw new Error(mpResponseData.message || 'Erro ao processar pagamento.');
      }
    } else {
      // Mock de Sucesso (Fallback caso as chaves não estejam prontas)
      mpResponseData = {
        status: paymentMethodId === 'pix' ? 'pending' : 'approved',
        id: transacaoId,
        point_of_interaction: paymentMethodId === 'pix' ? {
          transaction_data: {
            ticket_url: 'https://www.mercadopago.com.br',
            qr_code: '00020101021126360014br.gov.bcb.pix...',
            qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAA...'
          }
        } : null
      };
      isApproved = true;
    }

    // Retorna para o Frontend finalizar a atualização do Firestore
    return NextResponse.json({
      success: true,
      pedidoId,
      transacaoId,
      status: mpResponseData.status,
      pixData: mpResponseData.point_of_interaction?.transaction_data || null
    });

  } catch (error: any) {
    console.error('Erro crítico no checkout:', error);
    return NextResponse.json({ error: error.message || 'Erro interno ao processar pedido.' }, { status: 500 });
  }
}
