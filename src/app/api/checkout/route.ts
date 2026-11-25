import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/db';
import { createOrderFromSelectiveCart } from '@/lib/cart-checkout';
import { hashPassword, validateSessionFromCookie, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getClientIpSafely, checkRateLimit } from '@/lib/rate-limit';

function safeTokenEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIpSafely(req);
    if (!checkRateLimit(`checkout:${ip}`, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Muitas tentativas em sequência. Aguarde 1 minuto e tente novamente.' },
        { status: 429 }
      );
    }

    const db = await getDb();
    const body = await req.json();

    // Post-purchase 1-click account creation with token ownership verification
    if (body.action === 'claim_post_purchase_account') {
      const { orderId, claimToken, password } = body;
      if (!orderId || !claimToken || !password || String(password).length < 8) {
        return NextResponse.json(
          { error: 'Token de verificação do pedido e senha (mínimo 8 caracteres) são obrigatórios.' },
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
      if (
        ordRows.length === 0 ||
        !ordRows[0].post_purchase_claim_token ||
        !safeTokenEqual(String(ordRows[0].post_purchase_claim_token), String(claimToken))
      ) {
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

    // Extrai userId exclusivamente da sessão autenticada (nunca confia em body.userId)
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await validateSessionFromCookie(db, token);
    const verifiedUserId = session?.userId || null;

    // Em produção, nunca permite que o cliente aprove o próprio pagamento sem confirmação do gateway
    const allowSimulatedPayment =
      process.env.NODE_ENV !== 'production' && body.simulateImmediatePayment !== false;

    const result = await createOrderFromSelectiveCart(db, {
      sessionKey: body.sessionKey || 'sess-default-visitor',
      userId: verifiedUserId,
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
      simulateImmediatePayment: allowSimulatedPayment,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao processar checkout.' },
      { status: 400 }
    );
  }
}
