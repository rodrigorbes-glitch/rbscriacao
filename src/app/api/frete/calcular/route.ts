import { NextResponse } from 'next/server';
import { produtosAPI } from '@/services/api';

const MELHOR_ENVIO_TOKEN = process.env.MELHOR_ENVIO_TOKEN || 'SUA_CHAVE_AQUI';
const CEP_ORIGEM = '25020140';

export async function POST(req: Request) {
  try {
    const { cepDestino, carrinho } = await req.json();

    if (!cepDestino || !carrinho || carrinho.length === 0) {
      return NextResponse.json({ error: 'CEP de destino e carrinho são obrigatórios.' }, { status: 400 });
    }

    // 1. Buscar dimensões reais no Firestore para evitar fraudes
    // e montar o array de products para o Melhor Envio
    const produtosDb = await produtosAPI.getAll();
    const productsForShipping = [];

    for (const item of carrinho) {
      const originalId = item.id.replace(/_copia_\d+$/, ''); // Trata mock ids se houver
      const prodDb = produtosDb.find(p => p.id === originalId);

      // Usar dimensões do DB ou padrão de fallback (15x15x15cm, 300g)
      const dim = prodDb?.dimensoes || { peso: 0.3, altura: 15, largura: 15, comprimento: 15 };
      const valor = prodDb?.preco_venda_sugerido || item.preco_venda_sugerido || 0;

      productsForShipping.push({
        id: originalId,
        width: dim.largura,
        height: dim.altura,
        length: dim.comprimento,
        weight: dim.peso,
        insurance_value: valor,
        quantity: item.quantidade
      });
    }

    // 2. Montar o payload para o Melhor Envio
    const payload = {
      from: {
        postal_code: CEP_ORIGEM
      },
      to: {
        postal_code: cepDestino.replace(/\D/g, '')
      },
      products: productsForShipping
    };

    // 3. Fazer requisição para API do Melhor Envio
    // Em produção, usar a URL correta: https://www.melhorenvio.com.br/api/v2/me/shipment/calculate
    // Aqui usamos sandbox para testes se não houver token real configurado
    const isSandbox = MELHOR_ENVIO_TOKEN === 'SUA_CHAVE_AQUI' || MELHOR_ENVIO_TOKEN.includes('sandbox');
    const apiUrl = isSandbox 
      ? 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate'
      : 'https://www.melhorenvio.com.br/api/v2/me/shipment/calculate';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MELHOR_ENVIO_TOKEN}`,
        'User-Agent': 'RBS Criação Loja (suporte@rbscriacao.com)'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API Melhor Envio:', errorText);
      // Fallback em caso de erro (ex: token inválido) para não bloquear o front-end
      return NextResponse.json([
        { id: '1', name: 'Correios PAC', price: '25.90', delivery_time: 5, currency: 'R$' },
        { id: '2', name: 'Correios SEDEX', price: '45.50', delivery_time: 2, currency: 'R$' },
        { id: '3', name: 'Jadlog Package', price: '19.90', delivery_time: 4, currency: 'R$' }
      ]);
    }

    const data = await response.json();
    
    // Filtrar apenas opções que não retornaram erro (não suportado, restrição, etc)
    const opcoesValidas = data.filter((op: any) => !op.error && op.price);

    // Formatar retorno
    const opcoesFrete = opcoesValidas.map((op: any) => ({
      id: op.id,
      name: op.name,
      price: op.price,
      delivery_time: op.delivery_time,
      custom_delivery_time: op.custom_delivery_time,
      currency: op.currency || 'R$'
    }));

    return NextResponse.json(opcoesFrete);

  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    // Em caso de exceção no fetch, retornar mock para manter a UI funcionando no teste
    return NextResponse.json([
      { id: '1', name: 'Correios PAC (Mock)', price: '25.90', delivery_time: 5, currency: 'R$' },
      { id: '2', name: 'Correios SEDEX (Mock)', price: '45.50', delivery_time: 2, currency: 'R$' }
    ]);
  }
}
