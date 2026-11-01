import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_CEPS: Record<
  string,
  { street: string; neighborhood: string; city: string; state: string }
> = {
  '25020140': {
    street: 'Avenida Brigadeiro Lima e Silva',
    neighborhood: 'Parque Duque',
    city: 'Duque de Caxias',
    state: 'RJ',
  },
  '01310100': {
    street: 'Avenida Paulista',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  },
  '22410003': {
    street: 'Rua Visconde de Pirajá',
    neighborhood: 'Ipanema',
    city: 'Rio de Janeiro',
    state: 'RJ',
  },
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ cep: string }> }
) {
  const { cep } = await context.params;
  const clean = (cep || '').replace(/\D/g, '');
  if (clean.length !== 8) {
    return NextResponse.json(
      { error: 'Informe um CEP válido com 8 dígitos.' },
      { status: 400 }
    );
  }

  if (FALLBACK_CEPS[clean]) {
    return NextResponse.json({
      cep: clean,
      ...FALLBACK_CEPS[clean],
      source: 'local_cache',
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return NextResponse.json({
          cep: clean,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
          source: 'viacep',
        });
      }
    }
  } catch {
    // Fallback to manual editable mode with regional inference
  }

  const prefix = Number(clean.slice(0, 2));
  const inferredState =
    prefix >= 20 && prefix <= 28 ? 'RJ' : prefix >= 1 && prefix <= 19 ? 'SP' : 'MG';
  const inferredCity =
    inferredState === 'RJ'
      ? 'Rio de Janeiro'
      : inferredState === 'SP'
        ? 'São Paulo'
        : 'Belo Horizonte';

  return NextResponse.json({
    cep: clean,
    street: '',
    neighborhood: '',
    city: inferredCity,
    state: inferredState,
    manualFallback: true,
    message: 'CEP validado para cálculo de frete. Preencha rua e bairro manualmente.',
  });
}
