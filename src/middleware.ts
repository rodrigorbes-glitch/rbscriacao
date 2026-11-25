import { NextRequest, NextResponse } from 'next/server';

function getEdgeAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.trim().length >= 16) return secret.trim();
  if (process.env.NODE_ENV === 'production') return null;
  return 'rbs-criacao-v3-dev-only-secret-key-2026';
}
const SESSION_COOKIE_NAME = 'rbs_session_token';

// Web Crypto HMAC-SHA256 for Next.js Edge Runtime Middleware
async function verifySessionTokenEdge(tokenString: string) {
  if (!tokenString || typeof tokenString !== 'string') return null;
  const secret = getEdgeAuthSecret();
  if (!secret) return null;
  const parts = tokenString.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  // Convert base64url to Uint8Array
  function base64urlToBytes(base64url: string): Uint8Array {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const sigBytes = base64urlToBytes(signature);
  const dataBytes = enc.encode(data);

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes as any,
    dataBytes
  );

  if (!isValid) return null;

  try {
    const jsonStr = new TextDecoder().decode(base64urlToBytes(data));
    const payload = JSON.parse(jsonStr);
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin and /admin/* routes
  if (pathname.startsWith('/admin')) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionTokenEdge(token) : null;

    if (!session) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('error', 'unauthenticated');
      return NextResponse.redirect(loginUrl);
    }

    // Role must be admin or operator to access internal /admin
    if (session.role !== 'admin' && session.role !== 'operator') {
      if (session.role === 'partner') {
        return NextResponse.redirect(new URL('/parceiros', req.url));
      }
      return NextResponse.redirect(new URL('/minha-conta?error=forbidden', req.url));
    }
  }

  // Protect /parceiros route (must be logged in as partner or admin)
  if (pathname.startsWith('/parceiros')) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionTokenEdge(token) : null;

    if (!session) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', '/parceiros');
      loginUrl.searchParams.set('portal', 'parceiro');
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== 'partner' && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/minha-conta?error=not_a_partner', req.url));
    }
  }

  // CSRF Protection for state-changing API endpoints
  if (pathname.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    // Exempt public webhooks that authenticate via cryptographic signature headers
    const isWebhook = pathname.startsWith('/api/checkout') && Boolean(req.headers.get('x-signature') || req.headers.get('x-mp-signature'));
    if (!isWebhook) {
      const origin = req.headers.get('origin');
      const host = req.headers.get('host');
      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          // Allow internal domain matching, localhost, and test network IPs
          const isSameHost = originHost === host;
          const isAllowedDevOrigin = (originHost === 'localhost' || originHost === '127.0.0.1') && (host.includes('localhost') || host.includes('127.0.0.1'));
          if (!isSameHost && !isAllowedDevOrigin) {
            return NextResponse.json({ error: 'Falha de validação CSRF: Origem cruzada não autorizada.' }, { status: 403 });
          }
        } catch {
          return NextResponse.json({ error: 'Cabeçalho de origem inválido na requisição.' }, { status: 403 });
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/parceiros/:path*', '/api/:path*'],
};
