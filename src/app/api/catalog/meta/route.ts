import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const format = req.nextUrl.searchParams.get('format') || 'xml';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rbscriacao.com';

    const products = await db.query<{
      id: string;
      sku: string;
      slug: string;
      name: string;
      short_description: string;
      material: string;
      price_cents: number;
      stock_qty: number;
      availability_type: string;
      images_json: string;
    }>("SELECT * FROM products WHERE is_active = TRUE AND images_json != '[]' ORDER BY created_at ASC");

    if (format === 'json') {
      return NextResponse.json({
        channel: 'RBS Criação — Meta & Instagram Shopping Feed (@rbscriacao)',
        domain: baseUrl,
        generatedAt: new Date().toISOString(),
        itemCount: products.length,
        items: products.map((p) => {
          let imgs: string[] = [];
          try {
            imgs = JSON.parse(p.images_json || '[]');
          } catch {
            imgs = [];
          }
          return {
            id: p.sku,
            title: p.name,
            description: p.short_description,
            availability: p.stock_qty > 0 || p.availability_type === 'made_to_order' ? 'in stock' : 'out of stock',
            condition: 'new',
            price: `${(Number(p.price_cents) / 100).toFixed(2)} BRL`,
            link: `${baseUrl}/produto/${p.slug}`,
            image_link: `${baseUrl}${imgs[0] || '/products/real/vaso-espiral-cobre-mesa.png'}`,
            brand: 'RBS Criação',
            material: p.material,
          };
        }),
      });
    }

    const xmlItems = products
      .map((p) => {
        let imgs: string[] = [];
        try {
          imgs = JSON.parse(p.images_json || '[]');
        } catch {
          imgs = [];
        }
        const avail =
          p.stock_qty > 0 || p.availability_type === 'made_to_order' ? 'in stock' : 'out of stock';
        const priceBrl = (Number(p.price_cents) / 100).toFixed(2);
        return `    <item>
      <g:id>${p.sku}</g:id>
      <g:title><![CDATA[${p.name}]]></g:title>
      <g:description><![CDATA[${p.short_description}]]></g:description>
      <g:link>${baseUrl}/produto/${p.slug}</g:link>
      <g:image_link>${baseUrl}${imgs[0] || '/products/real/vaso-espiral-cobre-mesa.png'}</g:image_link>
      <g:brand>RBS Criação</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${avail}</g:availability>
      <g:price>${priceBrl} BRL</g:price>
      <g:material>${p.material}</g:material>
    </item>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>RBS Criação — Catálogo Oficial Impressão 3D (@rbscriacao)</title>
    <link>${baseUrl}</link>
    <description>Feed oficial de produtos 3D sincronizado para Instagram Shopping e Meta Commerce Manager</description>
${xmlItems}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar feed Meta.' },
      { status: 500 }
    );
  }
}
