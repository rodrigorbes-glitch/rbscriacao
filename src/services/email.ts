import { Resend } from 'resend';
import { Pedido } from '@/types/models';

const resend = new Resend(process.env.RESEND_API_KEY || 're_...');

export const emailService = {
  enviarConfirmacaoPagamento: async (pedido: Pedido) => {
    if (!process.env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY não configurada. E-mail não enviado.');
      return false;
    }

    const clienteEmail = pedido.cliente_email ?? 'sem-email@rbscriacao.com';
    const valorTotal = pedido.valor_total ?? 0;
    const pedidoId = pedido.id?.substring(0, 8) ?? 'N/A';

    try {
      // 1. E-mail para o Cliente
      await resend.emails.send({
        from: 'RBS Criação <onboarding@resend.dev>',
        to: clienteEmail,
        subject: `Pagamento Aprovado! Pedido #${pedidoId}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h1 style="color: #4CAF50;">Oba! Pagamento Aprovado 🎉</h1>
            <p>Olá <strong>${pedido.cliente_nome}</strong>,</p>
            <p>Seu pagamento no valor de <strong>R$ ${valorTotal.toFixed(2).replace('.', ',')}</strong> foi confirmado com sucesso.</p>
            <p>Já estamos preparando o seu pedido e em breve você receberá as informações de rastreio para o endereço:</p>
            <blockquote style="background: #f9f9f9; padding: 10px; border-left: 4px solid #ccc;">
              ${pedido.cliente_endereco}
            </blockquote>
            <p>Obrigado por comprar com a RBS Criação!</p>
          </div>
        `
      });

      // 2. E-mail para o Admin (Dono da loja)
      await resend.emails.send({
        from: 'RBS Loja <onboarding@resend.dev>',
        to: ['rodrigorbes@gmail.com', 'dra.rachelbeatriz@gmail.com'],
        subject: `💰 NOVA VENDA PAGA! Pedido #${pedidoId}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h1 style="color: #4CAF50;">Dinheiro na conta! 💰</h1>
            <p>O cliente <strong>${pedido.cliente_nome}</strong> acabou de pagar um pedido de <strong>R$ ${valorTotal.toFixed(2).replace('.', ',')}</strong>.</p>
            <p>Acesse o painel administrativo para processar e enviar a mercadoria.</p>
          </div>
        `
      });

      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      return false;
    }
  }
};
