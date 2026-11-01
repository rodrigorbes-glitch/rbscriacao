import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { createOrderFromSelectiveCart } from '@/lib/cart-checkout';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();

    // Post-purchase 1-click account creation with token ownership verification
    if (body.action === 'claim_post_purchase_account') {
      const { orderId, claimToken, password } = body;
      if (!orderId || !claimToken || !password || String(password).length < 6) {
        return NextResponse.json(
          { error: 'Token de verificação do pedido e senha (mínimo 6 caracteres) são obrigatórios.' },
          { status: 400 }
        );
      }
      const ordRows = await db.query<{
        id: string;
        guest_name: string;
        guest_email: string;
        guest_phone: string;
        guest_cpf_cnpj: string;
        post_purchase_claim_token: string | null;
      }>(
        'SELECT id, guest_name, guest_email, guest_phone, guest_cpf_cnpj, post_purchase_claim_token FROM orders WHERE id = $1 LIMIT 1',
        [orderId]
      );
      if (ordRows.length === 0 || ordRows[0].post_purchase_claim_token !== claimToken) {
        return NextResponse.json(
          { error: 'Token de posse do pedido inválido ou expirado.' },
          { status: 403 }
        );
      }

      const ord = ordRows[0];
      const userId = `usr-${Date.now()}`;
      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, phone, document_cpf_cnpj, is_active, email_verified)
         VALUES ($1, $2, $3, $4, 'customer', $5, $6, TRUE, TRUE)
         ON CONFLICT (email) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
        [userId, ord.guest_name, ord.guest_email, hashPassword(password), ord.guest_phone, ord.guest_cpf_cnpj]
      );

      const usrActual = await db.query<{ id: string }>(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        [ord.guest_email]
      );
      const finalUserId = usrActual[0]?.id || userId;

      // Link only this token-verified order (never link historical orders solely by unverified email!)
      await db.query(
        'UPDATE orders SET user_id = $1, post_purchase_claim_token = NULL WHERE id = $2',
        [finalUserId, ord.id]
      );

      return NextResponse.json({
        success: true,
        userId: finalUserId,
        email: ord.guest_email,
        message: 'Conta criada e vinculada com segurança a este pedido!',
      });
    }

    const result = await createOrderFromSelectiveCart(db, {
      sessionKey: body.sessionKey || 'sess-default-visitor',
      userId: body.userId || null,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      customerCpfCnpj: body.customerCpfCnpj,
      shippingAddress: body.shippingAddress,
      shippingServiceId: body.shippingServiceId,
      paymentMethod: body.paymentMethod || 'pix',
      couponCode: body.couponCode,
      partnerCode: body.partnerCode,
      idempotencyKey: body.idempotencyKey,
      simulateImmediatePayment: body.simulateImmediatePayment !== false,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao processar checkout.' },
      { status: 400 }
    );
  }
}
