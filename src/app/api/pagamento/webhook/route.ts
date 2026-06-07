import { NextResponse } from 'next/server';
import { pedidosAPI, produtosAPI } from '@/services/api';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || 'SUA_CHAVE_AQUI';

export async function POST(req: Request) {
  try {
    // Pegar o query ou body
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const paymentId = url.searchParams.get('data.id') || url.searchParams.get('id');

    // Mercado Pago pode enviar dados no body dependendo da configuração
    let body;
    try {
      body = await req.json();
    } catch(e) {
      body = {};
    }

    const actualId = paymentId || body?.data?.id;
    const action = topic || body?.action;

    // Se for notificação de pagamento criado/atualizado
    if (action === 'payment' && actualId) {
      
      // Consultar status real da transação no Mercado Pago
      if (MP_ACCESS_TOKEN !== 'SUA_CHAVE_AQUI') {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${actualId}`, {
          headers: {
            'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
          }
        });

        if (response.ok) {
          const paymentData = await response.json();
          const { status, external_reference } = paymentData;

          // Buscar o Pedido pelo ID no Firestore
          if (external_reference) {
            const pedido = await pedidosAPI.getById(external_reference);
            
            if (pedido && pedido.status !== 'pago' && status === 'approved') {
              // 1. Marcar como pago
              await pedidosAPI.update(external_reference, { status: 'pago' });

              // 2. Dar baixa no estoque central
              const produtosDb = await produtosAPI.getAll();
              for (const item of pedido.itens) {
                const prodDb = produtosDb.find(p => p.id === item.id_produto);
                if (prodDb && typeof prodDb.estoque_central === 'number') {
                  const novoEstoque = Math.max(0, prodDb.estoque_central - item.quantidade);
                  await produtosAPI.update(prodDb.id as string, { estoque_central: novoEstoque });
                }
              }
            } else if (pedido && status === 'rejected') {
              await pedidosAPI.update(external_reference, { status: 'rejeitado' });
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Erro no Webhook MP:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
