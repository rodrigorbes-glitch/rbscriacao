import type { DatabaseAdapter } from './index';
import { hashPassword } from '@/lib/auth';

export async function seedDatabase(db: DatabaseAdapter): Promise<void> {
  const existingSettings = await db.query<{ count: string }>('SELECT COUNT(*) as count FROM store_settings');
  if (Number(existingSettings[0]?.count ?? 0) > 0) {
    return;
  }

  // 1. Users (RBAC: admin, operator, partner, customer)
  // Strict OWASP scrypt parameters (N=65536, r=8, p=1). Zero plain-text rbs_hash credentials in seed!
  const users = [
    ['usr-admin', 'Rodrigo Souza (Admin RBS)', 'admin@rbscriacao.com', hashPassword('Admin@RBS2026!'), 'admin', '(21) 99888-7766', '12.345.678/0001-90', true, true],
    ['usr-operator', 'Lucas Bancada 3D (Operador)', 'operacao@rbscriacao.com', hashPassword('Operador@RBS2026!'), 'operator', '(21) 99777-6655', '123.456.789-01', true, true],
    ['usr-partner', 'Camila Design & Decor (Parceira)', 'parceiro@rbscriacao.com', hashPassword('Parceiro@RBS2026!'), 'partner', '(21) 99666-5544', '23.456.789/0001-12', true, true],
    ['usr-customer', 'Mariana Costa', 'cliente@rbscriacao.com', hashPassword('Cliente@RBS2026!'), 'customer', '(11) 98765-4321', '345.678.901-23', true, true],
  ];

  for (const u of users) {
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, phone, document_cpf_cnpj, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
      u
    );
  }

  await db.query(
    `INSERT INTO customer_addresses (id, user_id, label, recipient_name, cep, street, number, complement, neighborhood, city, state, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING`,
    ['addr-1', 'usr-customer', 'Casa', 'Mariana Costa', '01310-100', 'Avenida Paulista', '1578', 'Apto 82', 'Bela Vista', 'São Paulo', 'SP', true]
  );

  // 2. Categories & Collections
  const categories = [
    ['cat-vasos', 'vasos-cachepots', 'Decorar', 'Vasos esculturais, cachepots canelados e peças de centro para sala e mesa.', 'Flower2', '/products/real/vaso-espiral-cobre-mesa.png', 1],
    ['cat-org', 'organizacao-setup', 'Organizar', 'Cachepots modulares, suportes de mesa e acessórios funcionais para o dia a dia.', 'LayoutGrid', '/products/real/vasos-canelados-bicolor-square.png', 2],
    ['cat-presentes', 'presentes-articulados', 'Presentear', 'Objetos criativos, réplicas colecionáveis, luminárias e peças com dedicatória.', 'Gift', '/products/real/sabre-jedi-colecionavel-card.png', 3],
    ['cat-decor', 'decoracao-design', 'Compor ambientes', 'Geometria orgânica, tramas Voronoi e peças autorais impressas em estúdio.', 'Sparkles', '/products/real/esfera-voronoi-only.png', 4],
    ['cat-b2b', 'chaveiros-corporativos', 'Para empresas', 'Chaveiros com aproximação NFC, troféus e lotes personalizados com a sua marca.', 'Building2', '/products/real/vasos-canelados-bicolor-macro.png', 5],
    ['cat-resina', 'galeria-resina-8k', 'Esculturas em Resina', 'Esculturas de superfície acetinada impressas em alta definição.', 'Crown', '/products/real/esfera-voronoi-only.png', 6],
  ];

  for (const c of categories) {
    await db.query(
      `INSERT INTO categories (id, slug, name, description, icon_name, image_url, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
      c
    );
  }

  const collections = [
    ['col-voronoi', 'colecao-voronoi-organico', 'Coleção Formas & Reflexos', 'Geometria contemporânea e acabamento acetinado', 'Peças que exploram tramas celulares, facetas em espiral e jogos de luz.', '/products/real/ambiente-sala-vaso-espiral.png', true],
    ['col-setup', 'colecao-setup-pro', 'Organização & Cotidiano', 'Design funcional para mesas, estantes e estúdios', 'Acessórios e cachepots projetados para organizar com leveza visual.', '/products/real/vasos-canelados-bicolor-square.png', true],
    ['col-luz', 'colecao-luz-litofania', 'Presentes & Colecionáveis', 'Peças memoráveis feitas sob medida', 'Objetos que combinam precisão de encaixe e personalização individual.', '/products/real/sabre-jedi-colecionavel-card.png', true],
  ];

  for (const col of collections) {
    await db.query(
      `INSERT INTO collections (id, slug, name, subtitle, description, banner_url, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
      col
    );
  }

  // 3. Products (4 featured products with verified real studio photography + remaining catalog items with discrete pending media flag)
  const defaultLayerNotice =
    'Peça produzida por impressão 3D camada a camada em nosso estúdio. As micro-linhas horizontais uniformes fazem parte da textura natural do objeto e atestam sua fabricação individual.';

  const products = [
    {
      id: 'prod-vaso-furta-cor',
      sku: 'RBS-VAS-009',
      slug: 'vaso-premium-furta-cor',
      name: 'Vaso Premium Furta-Cor',
      subtitle: 'Facetas em espiral que refletem tons de cobre, âmbar e dourado conforme a luz do ambiente',
      short_description: 'Vaso escultural de torção contínua impresso em filamento seda especial. Acompanha copo interno estanque removível para flores naturais ou arranjos secos.',
      description: 'Desenhado para ser o ponto focal da mesa de centro ou aparador, o Vaso Premium Furta-Cor combina geometria em espiral com filamento de brilho acetinado que muda sutilmente de tonalidade conforme o ângulo de iluminação. Acompanha tubo interno impermeável para uso com água.',
      category_id: 'cat-vasos',
      collection_id: 'col-voronoi',
      material: 'PLA',
      finish: 'Seda Furta-Cor Acetinado',
      availability_type: 'ready_stock',
      lead_time_days: 1,
      dimensions_mm: '145 × 145 × 240 mm',
      dimensional_tolerance: '± 0,3 mm',
      weight_grams: 230,
      package_weight_grams: 360,
      package_dimensions_cm: '18x18x28',
      filament_grams_per_unit: 210,
      support_purge_grams_per_unit: 20,
      print_time_minutes: 260,
      price_cents: 13990,
      compare_at_price_cents: null,
      cost_cents: 4100,
      stock_qty: 10,
      allow_customization: true,
      customization_instructions: 'Opcional: grave até 20 caracteres na base inferior (ex: dedicatória ou data).',
      care_instructions: 'Uso interno. Limpar com pano de microfibra levemente úmido e sabão neutro. Evitar exposição contínua ao sol intenso ou fontes de calor acima de 55 °C.',
      layer_notice: defaultLayerNotice,
      license_origin: 'Design Autoral RBS Criação',
      model_3d_glb_url: '/models/vaso-voronoi-rbs.glb',
      images_json: JSON.stringify([
        '/products/real/vaso-espiral-cobre-mesa.png',
        '/products/real/ambiente-sala-vaso-espiral.png',
        '/products/real/vaso-espiral-cobre-macro.png',
      ]),
      featured: true,
    },
    {
      id: 'prod-cachepot-autodrenante',
      sku: 'RBS-VAS-008',
      slug: 'cachepot-autodrenante-costela-adao',
      name: 'Trio Cachepots Canelados Preto & Cobre',
      subtitle: 'Conjunto de três vasos com textura canelada vertical em preto fosco e base em cobre acetinado',
      short_description: 'Ideal para plantas naturais e suculentas em ambientes internos: contraste elegante entre o corpo canelado fosco e a base metálica.',
      description: 'O Trio de Cachepots Canelados RBS une o toque aveludado do acabamento preto fosco na parte superior à luminosidade quente da base em cobre seda. Projetado para compor mesas laterais, estantes e bancadas com proporções harmônicas.',
      category_id: 'cat-vasos',
      collection_id: 'col-voronoi',
      material: 'PETG',
      finish: 'Bicolor Canelado Fosco & Cobre',
      availability_type: 'ready_stock',
      lead_time_days: 1,
      dimensions_mm: '165 × 165 × 150 mm (maior)',
      dimensional_tolerance: '± 0,3 mm',
      weight_grams: 260,
      package_weight_grams: 390,
      package_dimensions_cm: '20x20x19',
      filament_grams_per_unit: 240,
      support_purge_grams_per_unit: 20,
      print_time_minutes: 275,
      price_cents: 10990,
      compare_at_price_cents: null,
      cost_cents: 3600,
      stock_qty: 12,
      allow_customization: false,
      customization_instructions: null,
      care_instructions: 'Pode receber rega direta, terra úmida e exposição indireta à luz natural. Lavável com água e sabão neutro.',
      layer_notice: defaultLayerNotice,
      license_origin: 'Design Autoral RBS Criação',
      model_3d_glb_url: '/models/vaso-voronoi-rbs.glb',
      images_json: JSON.stringify([
        '/products/real/vasos-canelados-bicolor-square.png',
        '/products/real/vasos-canelados-bicolor-full.png',
        '/products/real/vasos-canelados-bicolor-macro.png',
      ]),
      featured: true,
    },
    {
      id: 'prod-vaso-voronoi',
      sku: 'RBS-DEC-001',
      slug: 'vaso-voronoi-organico',
      name: 'Esfera & Vaso Voronoi Orgânico',
      subtitle: 'Trama celular vazada impressa em filamento seda com jogo de luz e sombra',
      short_description: 'Escultura e vaso autoral com malha orgânica contínua em acabamento acetinado cobre e terracota para livros de arte, aparadores e salas.',
      description: 'Inspirada nas estruturas celulares da natureza, a linha Voronoi Orgânico transforma precisão geométrica em leveza visual. Perfeita para decorar sobre livros de centro, estantes ou aparadores, criando sombras delicadas ao longo do dia.',
      category_id: 'cat-decor',
      collection_id: 'col-voronoi',
      material: 'PLA',
      finish: 'Seda Metalizado',
      availability_type: 'ready_stock',
      lead_time_days: 1,
      dimensions_mm: '140 × 140 × 220 mm',
      dimensional_tolerance: '± 0,3 mm',
      weight_grams: 215,
      package_weight_grams: 340,
      package_dimensions_cm: '18x18x26',
      filament_grams_per_unit: 195,
      support_purge_grams_per_unit: 20,
      print_time_minutes: 245,
      price_cents: 12990,
      compare_at_price_cents: null,
      cost_cents: 3850,
      stock_qty: 14,
      allow_customization: true,
      customization_instructions: 'Opcional: grave até 20 caracteres na base inferior (ex: dedicatória ou data).',
      care_instructions: 'Uso interno. Limpar a seco com espanador macio ou pano de microfibra levemente úmido. Não expor a temperaturas acima de 55 °C.',
      layer_notice: defaultLayerNotice,
      license_origin: 'Design Autoral RBS Criação',
      model_3d_glb_url: '/models/vaso-voronoi-rbs.glb',
      images_json: JSON.stringify([
        '/products/real/esfera-voronoi-only.png',
        '/products/real/ambiente-sala-vaso-espiral.png',
      ]),
      featured: true,
    },
    {
      id: 'prod-sabre-colecionavel',
      sku: 'RBS-COL-010',
      slug: 'sabre-colecionavel-jedi-3d',
      name: 'Sabre Colecionável Multicolor em 3D',
      subtitle: 'Peça de exibição impressa em partes independentes nas cores prata seda, grafite e bronze',
      short_description: 'Réplica colecionável de bancada com empunhadura texturizada, emissor em tom bronze metalizado e argola de fixação na base.',
      description: 'Produzido peça por peça sem necessidade de pintura superficial, o Sabre Colecionável RBS destaca o contraste entre o punho texturizado em preto fosco, os anéis técnicos em prata acetinada e o pescoço superior em bronze.',
      category_id: 'cat-presentes',
      collection_id: 'col-luz',
      material: 'PLA',
      finish: 'Multicolor Prata, Grafite & Bronze',
      availability_type: 'ready_stock',
      lead_time_days: 2,
      dimensions_mm: '52 × 52 × 285 mm',
      dimensional_tolerance: '± 0,2 mm',
      weight_grams: 210,
      package_weight_grams: 330,
      package_dimensions_cm: '32x10x10',
      filament_grams_per_unit: 190,
      support_purge_grams_per_unit: 20,
      print_time_minutes: 280,
      price_cents: 15990,
      compare_at_price_cents: null,
      cost_cents: 4500,
      stock_qty: 6,
      allow_customization: true,
      customization_instructions: 'Opcional: informe iniciais ou nome para gravação discreta na base de apoio.',
      care_instructions: 'Peça decorativa de exibição e coleção. Limpar com pano seco e macio.',
      layer_notice: defaultLayerNotice,
      license_origin: 'Colecionável RBS Criação',
      model_3d_glb_url: '/models/vaso-voronoi-rbs.glb',
      images_json: JSON.stringify([
        '/products/real/sabre-jedi-colecionavel-card.png',
        '/products/real/sabre-jedi-colecionavel-full.png',
        '/products/real/sabre-jedi-colecionavel-macro.png',
      ]),
      featured: true,
    },
    {
      id: 'prod-vaso-sensations',
      sku: 'RBS-VAS-011',
      slug: 'vaso-sensations',
      name: 'Vaso Sensations Ondulado',
      subtitle: 'Silhueta fluida com relevo orgânico suave para mesas laterais e nichos',
      short_description: 'Vaso decorativo impresso com ondas contínuas que valorizam a textura tátil e o jogo de sombras em ambientes claros.',
      description: 'O Vaso Sensations possui curvas suaves inspiradas em dunas naturais, ideal para flores secas, ramos de eucalipto ou uso escultural avulso.',
      category_id: 'cat-vasos',
      collection_id: 'col-voronoi',
      material: 'PLA',
      finish: 'Fosco Aveludado',
      availability_type: 'made_to_order',
      lead_time_days: 2,
      dimensions_mm: '135 × 135 × 200 mm',
      dimensional_tolerance: '± 0,3 mm',
      weight_grams: 195,
      package_weight_grams: 310,
      package_dimensions_cm: '18x18x24',
      filament_grams_per_unit: 180,
      support_purge_grams_per_unit: 15,
      print_time_minutes: 220,
      price_cents: 11990,
      compare_at_price_cents: null,
      cost_cents: 3500,
      stock_qty: 9,
      allow_customization: false,
      customization_instructions: null,
      care_instructions: 'Uso interno. Limpar com pano levemente úmido.',
      layer_notice: defaultLayerNotice,
      license_origin: 'Design Autoral RBS Criação',
      model_3d_glb_url: '/models/vaso-voronoi-rbs.glb',
      images_json: JSON.stringify([]),
      featured: false,
    },
    {
      id: 'prod-luminaria-lua',
      sku: 'RBS-PRE-002',
      slug: 'luminaria-lua-litofania',
      name: 'Luminária Lua Cheia Litofania 3D + Base Madeira',
      subtitle: 'Relevo lunar ou fotografia personalizada revelada quando a luz acende',
      short_description: 'Esfera de 16 cm impressa em branco difusor com iluminação LED bivolt e gravação opcional na base.',
      description: 'Desenvolvida a partir do relevo lunar ou da sua fotografia preferida, nossa luminária utiliza variações precisas de espessura para revelar a imagem com nitidez quando iluminada.',
      category_id: 'cat-presentes',
      collection_id: 'col-luz',
      material: 'PLA',
      finish: 'Fosco Difusor de Luz',
      availability_type: 'made_to_order',
      lead_time_days: 3,
      dimensions_mm: '160 × 160 × 185 mm',
      dimensional_tolerance: '± 0,25 mm',
      weight_grams: 280,
      package_weight_grams: 450,
      package_dimensions_cm: '20x20x24',
      filament_grams_per_unit: 255,
      support_purge_grams_per_unit: 25,
      print_time_minutes: 420,
      price_cents: 18990,
      compare_at_price_cents: null,
      cost_cents: 5400,
      stock_qty: 8,
      allow_customization: true,
      customization_instructions: 'Informe o nome ou data para gravação no anel da base (até 30 caracteres).',
      care_instructions: 'Utilizar exclusivamente com lâmpadas LED frias (inclusa). Limpar a seco com pincel macio.',
      layer_notice: defaultLayerNotice,
      license_origin: 'Design Autoral RBS Criação',
      model_3d_glb_url: '/models/vaso-voronoi-rbs.glb',
      images_json: JSON.stringify([]),
      featured: false,
    },
    {
      id: 'prod-suporte-headset',
      sku: 'RBS-ORG-003',
      slug: 'suporte-headset-geometrico',
      name: 'Suporte de Headset & Controle de Mesa',
      subtitle: 'Estrutura firme com apoio anatômico que preserva a espuma do fone e organiza o cabo',
      short_description: 'Suporte de bancada com base estável e curvatura superior pensada para não marcar a haste do fone.',
      description: 'Projetado para escritórios e bancadas de trabalho, o suporte mantém fones e controles organizados com encaixe traseiro para o cabo de carregamento.',
      category_id: 'cat-org',
      collection_id: 'col-setup',
      material: 'PETG',
      finish: 'Preto Texturizado',
      availability_type: 'ready_stock',
      lead_time_days: 1,
      dimensions_mm: '130 × 145 × 265 mm',
      dimensional_tolerance: '± 0,3 mm',
      weight_grams: 240,
      package_weight_grams: 360,
      package_dimensions_cm: '16x18x29',
      filament_grams_per_unit: 225,
      support_purge_grams_per_unit: 15,
      print_time_minutes: 260,
      price_cents: 9490,
      compare_at_price_cents: null,
      cost_cents: 3120,
      stock_qty: 19,
      allow_customization: true,
      customization_instructions: 'Gravação opcional de iniciais na placa frontal (até 15 caracteres).',
      care_instructions: 'Alta resistência térmica e mecânica. Pode ser limpo com pano úmido.',
      layer_notice: defaultLayerNotice,
      license_origin: 'Design Autoral RBS Criação',
      model_3d_glb_url: '/models/vaso-voronoi-rbs.glb',
      images_json: JSON.stringify([]),
      featured: false,
    },
    {
      id: 'prod-organizador-grid',
      sku: 'RBS-ORG-004',
      slug: 'organizador-modular-gridfinity',
      name: 'Kit Organizador Modular de Mesa (7 Peças)',
      subtitle: 'Base modular com 6 compartimentos intercambiáveis para canetas, cartões e cabos',
      short_description: 'Conjunto modular de mesa para manter ferramentas de trabalho, blocos e acessórios sempre à mão.',
      description: 'Composto por 1 base organizadora e 6 módulos de diferentes alturas com encaixe preciso para canetas, cartões de memória, adaptadores e pequenos objetos.',
      category_id: 'cat-org',
      collection_id: 'col-setup',
      material: 'PLA',
      finish: 'Fosco Suave',
      availability_type: 'ready_stock',
      lead_time_days: 1,
      dimensions_mm: '240 × 160 × 65 mm',
      dimensional_tolerance: '± 0,2 mm',
      weight_grams: 310,
      package_weight_grams: 420,
      package_dimensions_cm: '26x18x10',
      filament_grams_per_unit: 295,
      support_purge_grams_per_unit: 15,
      print_time_minutes: 310,
      price_cents: 13990,
      compare_at_price_cents: null,
      cost_cents: 4200,
      stock_qty: 11,
      allow_customization: false,
      customization_instructions: null,
      care_instructions: 'Uso interno em escritório ou bancada. Limpar com pano úmido e detergente neutro.',
      layer_notice: defaultLayerNotice,
      license_origin: 'Licença Comercial Autorizada & Adaptação RBS',
      model_3d_glb_url: '/models/vaso-voronoi-rbs.glb',
      images_json: JSON.stringify([]),
      featured: false,
    },
    {
      id: 'prod-dragao-articulado',
      sku: 'RBS-PRE-005',
      slug: 'dragao-articulado-imperial',
      name: 'Dragão Imperial Articulado (45 cm)',
      subtitle: '38 elos móveis impressos em peça única com acabamento bicolor cobre e esmeralda',
      short_description: 'Peça colecionável articulada que reflete tons de cobre e verde esmeralda conforme a luz.',
      description: 'Todas as 38 articulações saem prontas diretamente da impressão, sem colas ou emendas, com movimento fluido ao longo dos 45 cm de comprimento.',
      category_id: 'cat-presentes',
      collection_id: 'col-voronoi',
      material: 'PLA',
      finish: 'Seda Bicolor Cobre & Esmeralda',
      availability_type: 'ready_stock',
      lead_time_days: 2,
      dimensions_mm: '450 × 85 × 60 mm',
      dimensional_tolerance: '± 0,2 mm',
      weight_grams: 190,
      package_weight_grams: 310,
      package_dimensions_cm: '22x22x9',
      filament_grams_per_unit: 175,
      support_purge_grams_per_unit: 15,
      print_time_minutes: 290,
      price_cents: 11490,
      compare_at_price_cents: null,
      cost_cents: 3450,
      stock_qty: 7,
      allow_customization: false,
      customization_instructions: null,
      care_instructions: 'Peça decorativa e colecionável. Não recomendado para crianças menores de 3 anos.',
      layer_notice: defaultLayerNotice,
      license_origin: 'Licença Comercial Autorizada',
      model_3d_glb_url: '/models/vaso-voronoi-rbs.glb',
      images_json: JSON.stringify([]),
      featured: false,
    },
    {
      id: 'prod-chaveiro-nfc-lote',
      sku: 'RBS-B2B-006',
      slug: 'chaveiro-nfc-corporativo-lote',
      name: 'Kit 25 Chaveiros Corporativos em Relevo com Tag NFC',
      subtitle: 'Brinde com logotipo em relevo colorido e aproximação para abrir Instagram ou WhatsApp',
      short_description: 'Lote empresarial produzido nas cores da sua marca com chip NFC embutido internamente.',
      description: 'Ideal para eventos, clínicas, estúdios e escritórios. Inserimos o chip NFC de forma invisível no interior da peça e destacamos a sua marca em relevo colorido sem uso de tintas que descascam.',
      category_id: 'cat-b2b',
      collection_id: 'col-setup',
      material: 'PETG',
      finish: 'Relevo Bicolor Personalizado',
      availability_type: 'made_to_order',
      lead_time_days: 4,
      dimensions_mm: '55 × 55 × 4,5 mm (cada)',
      dimensional_tolerance: '± 0,15 mm',
      weight_grams: 450,
      package_weight_grams: 580,
      package_dimensions_cm: '20x16x10',
      filament_grams_per_unit: 380,
      support_purge_grams_per_unit: 70,
      print_time_minutes: 390,
      price_cents: 29990,
      compare_at_price_cents: null,
      cost_cents: 9800,
      stock_qty: 15,
      allow_customization: true,
      customization_instructions: 'Informe o nome da marca e o link do Instagram ou WhatsApp que deve abrir ao aproximar o celular.',
      care_instructions: 'Alta resistência mecânica, lavável e resistente à água.',
      layer_notice: defaultLayerNotice,
      license_origin: 'Projeto Corporativo RBS Criação',
      model_3d_glb_url: '/models/vaso-voronoi-rbs.glb',
      images_json: JSON.stringify([]),
      featured: false,
    },
    {
      id: 'prod-escultura-resina',
      sku: 'RBS-RES-007',
      slug: 'escultura-busto-minimalista-resina',
      name: 'Escultura Busto Minimalista em Resina 8K',
      subtitle: 'Superfície acetinada de alta definição para estantes e projetos de interiores',
      short_description: 'Peça de galeria impressa em resina fotopolimérica com superfície suave e acabamento manual.',
      description: 'Desenvolvida para colecionadores e projetos de arquitetura de interiores que buscam acabamento liso e traços contemporâneos.',
      category_id: 'cat-resina',
      collection_id: 'col-voronoi',
      material: 'Resina',
      finish: 'Cinza Acetinado 8K',
      availability_type: 'made_to_order',
      lead_time_days: 3,
      dimensions_mm: '110 × 110 × 210 mm',
      dimensional_tolerance: '± 0,1 mm',
      weight_grams: 340,
      package_weight_grams: 520,
      package_dimensions_cm: '18x18x26',
      filament_grams_per_unit: 310,
      support_purge_grams_per_unit: 45,
      print_time_minutes: 330,
      price_cents: 24990,
      compare_at_price_cents: null,
      cost_cents: 7800,
      stock_qty: 5,
      allow_customization: false,
      customization_instructions: null,
      care_instructions: 'Uso interno. Evitar quedas ou impactos secos. Limpar com flanela macia.',
      layer_notice: 'Peça produzida em resina de alta resolução (camadas de 0,05 mm quase imperceptíveis a olho nu), com acabamento manual na base.',
      license_origin: 'Design Autoral RBS Criação',
      model_3d_glb_url: '/models/vaso-voronoi-rbs.glb',
      images_json: JSON.stringify([]),
      featured: false,
    },
  ];

  for (const p of products) {
    await db.query(
      `INSERT INTO products (
        id, sku, slug, name, subtitle, short_description, description,
        category_id, collection_id, material, finish, availability_type, lead_time_days,
        dimensions_mm, dimensional_tolerance, weight_grams, package_weight_grams, package_dimensions_cm,
        filament_grams_per_unit, support_purge_grams_per_unit, print_time_minutes,
        price_cents, compare_at_price_cents, cost_cents, stock_qty,
        allow_customization, customization_instructions, care_instructions, layer_notice,
        license_origin, model_3d_glb_url, images_json, featured
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33
      ) ON CONFLICT (id) DO NOTHING`,
      [
        p.id, p.sku, p.slug, p.name, p.subtitle, p.short_description, p.description,
        p.category_id, p.collection_id, p.material, p.finish, p.availability_type, p.lead_time_days,
        p.dimensions_mm, p.dimensional_tolerance, p.weight_grams, p.package_weight_grams, p.package_dimensions_cm,
        p.filament_grams_per_unit, p.support_purge_grams_per_unit, p.print_time_minutes,
        p.price_cents, p.compare_at_price_cents, p.cost_cents, p.stock_qty,
        p.allow_customization, p.customization_instructions, p.care_instructions, p.layer_notice,
        p.license_origin, p.model_3d_glb_url, p.images_json, p.featured,
      ]
    );
  }

  // Variations for each product
  const variations = [
    ['var-furtacor-cobre', 'prod-vaso-furta-cor', 'RBS-VAS-009-COB', 'Cobre & Âmbar Furta-Cor', '#B4693E', 'PLA', 'Médio (24 cm)', 0, 6],
    ['var-furtacor-violeta', 'prod-vaso-furta-cor', 'RBS-VAS-009-VIO', 'Violeta & Esmeralda Furta-Cor', '#563487', 'PLA', 'Médio (24 cm)', 0, 4],
    ['var-furtacor-grande', 'prod-vaso-furta-cor', 'RBS-VAS-009-GRD', 'Cobre & Âmbar Furta-Cor', '#B4693E', 'PLA', 'Grande (30 cm)', 3500, 3],
    ['var-voronoi-terracota', 'prod-vaso-voronoi', 'RBS-DEC-001-TER', 'Cobre Terracota Seda', '#B4693E', 'PLA', 'Médio (22 cm)', 0, 8],
    ['var-voronoi-obsidiana', 'prod-vaso-voronoi', 'RBS-DEC-001-OBS', 'Preto Obsidiana Fosco', '#24232A', 'PLA', 'Médio (22 cm)', 0, 4],
    ['var-voronoi-champagne', 'prod-vaso-voronoi', 'RBS-DEC-001-CHA', 'Ouro Champagne Seda', '#C49A45', 'PLA', 'Grande (28 cm)', 3500, 2],
    ['var-sabre-obiwan', 'prod-sabre-colecionavel', 'RBS-COL-010-OBI', 'Prata Seda, Grafite & Bronze', '#94A3B8', 'PLA', '28,5 cm (Escala 1:1)', 0, 4],
    ['var-sabre-dark', 'prod-sabre-colecionavel', 'RBS-COL-010-DRK', 'Preto Carbono & Cobre', '#24232A', 'PLA', '28,5 cm (Escala 1:1)', 0, 2],
    ['var-sensations-areia', 'prod-vaso-sensations', 'RBS-VAS-011-ARE', 'Areia Suave Fosco', '#D6D1C7', 'PLA', '20 cm', 0, 5],
    ['var-sensations-grafite', 'prod-vaso-sensations', 'RBS-VAS-011-GRF', 'Grafite Contemporâneo', '#24232A', 'PLA', '20 cm', 0, 4],
    ['var-lua-quente', 'prod-luminaria-lua', 'RBS-PRE-002-QNT', 'Branco Lunar (Luz Quente 3000K)', '#F5EFE6', 'PLA', '16 cm', 0, 5],
    ['var-lua-bicolor', 'prod-luminaria-lua', 'RBS-PRE-002-RGB', 'Branco Lunar (Touch 3 Tons)', '#EFECE6', 'PLA', '20 cm', 4000, 3],
    ['var-headset-carbon', 'prod-suporte-headset', 'RBS-ORG-003-CRB', 'Preto Grafite Texturizado', '#24232A', 'PETG', 'Padrão', 0, 12],
    ['var-headset-titaniun', 'prod-suporte-headset', 'RBS-ORG-003-TIT', 'Cinza Titânio', '#64748B', 'PETG', 'Padrão', 0, 7],
    ['var-grid-grafite', 'prod-organizador-grid', 'RBS-ORG-004-GRF', 'Grafite & Areia', '#334155', 'PLA', 'Kit 7 Peças', 0, 11],
    ['var-dragao-cobre', 'prod-dragao-articulado', 'RBS-PRE-005-CBE', 'Bicolor Cobre & Esmeralda', '#0F766E', 'PLA', '45 cm', 0, 7],
    ['var-chaveiro-25', 'prod-chaveiro-nfc-lote', 'RBS-B2B-006-P25', 'Personalizado Cores da Marca', '#563487', 'PETG', 'Lote 25 un', 0, 10],
    ['var-chaveiro-50', 'prod-chaveiro-nfc-lote', 'RBS-B2B-006-P50', 'Personalizado Cores da Marca', '#563487', 'PETG', 'Lote 50 un', 24000, 5],
    ['var-resina-cinza', 'prod-escultura-resina', 'RBS-RES-007-GRY', 'Cinza Galeria Acetinado', '#64748B', 'Resina', '21 cm', 0, 5],
    ['var-cachepot-bicolor', 'prod-cachepot-autodrenante', 'RBS-VAS-008-BIC', 'Preto Fosco & Base Cobre Seda', '#24232A', 'PETG', 'Trio (3 tamanhos)', 0, 8],
    ['var-cachepot-areia', 'prod-cachepot-autodrenante', 'RBS-VAS-008-ARE', 'Areia & Base Cobre Seda', '#D6D3D1', 'PETG', 'Trio (3 tamanhos)', 0, 4],
  ];

  for (const v of variations) {
    await db.query(
      `INSERT INTO product_variations (id, product_id, sku_variation, color_name, color_hex, material_override, size_label, price_delta_cents, stock_qty)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      v
    );
  }

  // 4. Partners
  await db.query(
    `INSERT INTO partners (id, user_id, partner_code, name, business_name, document_cpf_cnpj, email, phone, city, state, partner_type, commission_rate_pct, coupon_code, customer_discount_pct, pix_key, status, notes)
     VALUES
     ('prt-01', 'usr-partner', 'PARCEIRO10', 'Camila Design & Decor', 'Ateliê Botânico & Decor Jardim LTDA', '23.456.789/0001-12', 'parceiro@rbscriacao.com', '(21) 99666-5544', 'Rio de Janeiro', 'RJ', 'hybrid', 15.00, 'PARCEIRO10', 5.00, 'parceiro@rbscriacao.com', 'active', 'Parceira com ponto físico em consignação + divulgação no Instagram.'),
     ('prt-02', NULL, 'ARQRIO15', 'Estúdio Traço Arquitetura', 'Traço Interiores & Projetos S/S', '34.567.890/0001-45', 'contato@tracoarquitetura.com.br', '(21) 98811-2233', 'Niterói', 'RJ', 'affiliate', 12.00, 'ARQRIO15', 5.00, '34567890000145', 'active', 'Escritório parceiro especificador de peças decorativas.')
     ON CONFLICT (id) DO NOTHING`
  );

  // 5. Inventory Locations & Supplies (Bought in kg -> Consumed in g)
  const locations = [
    ['loc-factory', 'LOC-FAB', 'Fábrica & Fazenda de Impressão 3D (Caxias/RJ)', 'internal_factory', null, 'Duque de Caxias - RJ (CEP 25020-140)'],
    ['loc-expedition', 'LOC-EXP', 'Expedição & Embalagem RBS', 'internal_expedition', null, 'Duque de Caxias - RJ'],
    ['loc-showroom', 'LOC-SHOW', 'Showroom RBS Criação', 'internal_showroom', null, 'Duque de Caxias - RJ'],
    ['loc-consig-01', 'LOC-CONSIG-01', 'Ponto Físico Consignado — Ateliê Camila Decor', 'consignment_partner', 'prt-01', 'Jardim Botânico - Rio de Janeiro/RJ'],
    ['loc-comod-01', 'LOC-COMOD-01', 'Expositor em Comodato — Ateliê Camila Decor', 'comodato_partner', 'prt-01', 'Jardim Botânico - Rio de Janeiro/RJ'],
  ];

  for (const loc of locations) {
    await db.query(
      `INSERT INTO inventory_locations (id, code, name, location_type, partner_id, address_summary)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      loc
    );
  }

  const supplies = [
    ['sup-pla-terracota', 'INS-PLA-TER-1KG', 'Filamento PLA Seda Terracota 1,75mm', 'filament', 'PLA', 'Terracota Seda', 'kg', 'g', 1000, 4250, 390, 1000, 12000, 12.0000, '3D Prime Filamentos Brasil', 4],
    ['sup-pla-branco', 'INS-PLA-BRC-1KG', 'Filamento PLA Branco Puro Litofania 1,75mm', 'filament', 'PLA', 'Branco Lunar', 'kg', 'g', 1000, 3800, 280, 1000, 11000, 11.0000, '3D Prime Filamentos Brasil', 4],
    ['sup-petg-carbon', 'INS-PETG-CRB-1KG', 'Filamento PETG Carbon Tech Preto 1,75mm', 'filament', 'PETG', 'Preto Carbono', 'kg', 'g', 1000, 2900, 240, 1000, 13500, 13.5000, 'Voolt3D Polímeros', 5],
    ['sup-pla-dual', 'INS-PLA-DUAL-1KG', 'Filamento PLA Seda Dual Cobre/Esmeralda 1,75mm', 'filament', 'PLA', 'Cobre/Esmeralda', 'kg', 'g', 1000, 680, 190, 1000, 15500, 15.5000, 'Importadora Bambu Brasil', 7],
    ['sup-resina-8k', 'INS-RES-8K-1L', 'Resina Fotopolimérica SLA 8K Cinza Galeria', 'resin', 'Resina', 'Cinza Galeria', 'litro', 'ml', 1000, 1450, 355, 500, 19000, 19.0000, 'Anycubic / Elegoo Pro', 6],
    ['sup-caixa-kraft', 'INS-EMB-KRF-M', 'Caixa Kraft Dupla Onda + Berço Colmeia Protetor', 'packaging', 'Papelão', 'Kraft Natural', 'un', 'un', 1, 85, 6, 25, 350, 350.0000, 'Klabin Embalagens Express', 3],
  ];

  for (const s of supplies) {
    await db.query(
      `INSERT INTO inventory_supplies (
        id, sku, name, category, material_type, color_name,
        purchase_unit, consumption_unit, conversion_factor,
        stock_consumption_units, reserved_consumption_units, min_threshold_units,
        cost_per_purchase_unit_cents, cost_per_consumption_unit_cents, supplier_name, lead_time_days
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (id) DO NOTHING`,
      s
    );
  }

  // Authoritative product balances per location
  for (const p of products) {
    await db.query(
      `INSERT INTO inventory_balances (id, product_id, variation_id, location_id, on_hand_qty, reserved_qty, min_stock_qty)
       VALUES ($1, $2, NULL, 'loc-expedition', $3, 1, 3) ON CONFLICT (id) DO NOTHING`,
      [`bal-exp-${p.id}`, p.id, p.stock_qty]
    );
  }
  // Consigned balance at partner store (separated from own available online stock!)
  await db.query(
    `INSERT INTO inventory_balances (id, product_id, variation_id, location_id, on_hand_qty, reserved_qty, min_stock_qty)
     VALUES
     ('bal-consig-voronoi', 'prod-vaso-voronoi', 'var-voronoi-terracota', 'loc-consig-01', 4, 0, 2),
     ('bal-consig-cachepot', 'prod-cachepot-autodrenante', 'var-cachepot-bicolor', 'loc-consig-01', 3, 0, 2)
     ON CONFLICT (id) DO NOTHING`
  );

  // Consignment shipment & Comodato assets
  await db.query(
    `INSERT INTO consignment_shipments (id, shipment_code, partner_id, location_id, status, expected_audit_date, notes)
     VALUES ('csg-001', 'REM-CONSIG-2026-01', 'prt-01', 'loc-consig-01', 'active', '2026-11-30', 'Remessa vitrine de primavera — Ateliê Camila Decor')
     ON CONFLICT (id) DO NOTHING`
  );
  await db.query(
    `INSERT INTO consignment_items (id, shipment_id, product_id, variation_id, dispatched_qty, sold_qty, returned_qty, damaged_qty, agreed_unit_price_cents, partner_commission_pct)
     VALUES
     ('csgi-01', 'csg-001', 'prod-vaso-voronoi', 'var-voronoi-terracota', 6, 2, 0, 0, 12990, 20.00),
     ('csgi-02', 'csg-001', 'prod-cachepot-autodrenante', 'var-cachepot-bicolor', 4, 1, 0, 0, 10990, 20.00)
     ON CONFLICT (id) DO NOTHING`
  );
  await db.query(
    `INSERT INTO comodato_assets (id, asset_code, partner_id, location_id, asset_name, asset_type, quantity, declared_value_cents, condition_status, loaned_at, return_due_date, notes)
     VALUES
     ('cmd-01', 'COMOD-EXP-001', 'prt-01', 'loc-comod-01', 'Totem Expositor Iluminado RBS + Mostruário 5 Materiais (PLA/PETG/ABS/TPU/Resina)', 'expositor_acrilico_3d', 1, 68000, 'bom_estado', '2026-09-15', '2027-03-15', 'Bem patrimonial da RBS Criação cedido em comodato para demonstração física de camadas e cores.')
     ON CONFLICT (id) DO NOTHING`
  );

  // 6. Orders, Order Items, Kanban Production Jobs & Logged Print Failure
  const orders = [
    {
      id: 'ord-1001',
      order_number: 'RBS-2026-1001',
      user_id: 'usr-customer',
      guest_name: 'Mariana Costa',
      guest_email: 'cliente@rbscriacao.com',
      guest_phone: '(11) 98765-4321',
      guest_cpf_cnpj: '345.678.901-23',
      shipping_address_json: JSON.stringify({
        cep: '01310-100', street: 'Avenida Paulista', number: '1578', complement: 'Apto 82',
        neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP',
      }),
      shipping_service_name: 'SEDEX (Melhor Envio)',
      shipping_carrier: 'Correios',
      shipping_tracking_code: 'QE849201925BR',
      shipping_days: 2,
      manufacturing_days: 1,
      total_estimated_days: 3,
      subtotal_cents: 22480,
      discount_cents: 1124,
      shipping_cents: 2190,
      total_cents: 23546,
      gateway_fee_estimated_cents: 1175,
      gateway_fee_actual_cents: 1215, // R$ 0,40 divergence reconciled in Financial module!
      coupon_code: 'PARCEIRO10',
      partner_id: 'prt-01',
      partner_code: 'PARCEIRO10',
      payment_method: 'pix',
      payment_external_id: 'mp_pay_99812301',
      idempotency_key: 'idem-ord-1001',
      financial_status: 'paid',
      production_status: 'shipped',
      fulfillment_status: 'in_transit',
      cart_selection_mode: 'partial',
      unselected_items_preserved_count: 1,
      claim_token: 'claim-token-1001',
    },
    {
      id: 'ord-1002',
      order_number: 'RBS-2026-1002',
      user_id: null,
      guest_name: 'Rafael Albuquerque',
      guest_email: 'rafael.albuquerque@empresa.com.br',
      guest_phone: '(21) 99123-4567',
      guest_cpf_cnpj: '112.233.445-56',
      shipping_address_json: JSON.stringify({
        cep: '22410-003', street: 'Rua Visconde de Pirajá', number: '414', complement: 'Sala 502',
        neighborhood: 'Ipanema', city: 'Rio de Janeiro', state: 'RJ',
      }),
      shipping_service_name: 'Jadlog .Package',
      shipping_carrier: 'Jadlog',
      shipping_tracking_code: null,
      shipping_days: 2,
      manufacturing_days: 3,
      total_estimated_days: 5,
      subtotal_cents: 18990,
      discount_cents: 0,
      shipping_cents: 1690,
      total_cents: 20680,
      gateway_fee_estimated_cents: 1032,
      gateway_fee_actual_cents: 1032,
      coupon_code: null,
      partner_id: null,
      partner_code: null,
      payment_method: 'credit_card',
      payment_external_id: 'mp_pay_99812302',
      idempotency_key: 'idem-ord-1002',
      financial_status: 'paid',
      production_status: 'printing',
      fulfillment_status: 'unfulfilled',
      cart_selection_mode: 'full',
      unselected_items_preserved_count: 0,
      claim_token: 'claim-token-1002',
    },
    {
      id: 'ord-1003',
      order_number: 'RBS-2026-1003',
      user_id: null,
      guest_name: 'Clínica Odonto Prime LTDA',
      guest_email: 'compras@odontoprime.com.br',
      guest_phone: '(31) 98444-3322',
      guest_cpf_cnpj: '45.678.901/0001-88',
      shipping_address_json: JSON.stringify({
        cep: '30140-071', street: 'Rua dos Aimorés', number: '980', complement: 'Conj 1101',
        neighborhood: 'Funcionários', city: 'Belo Horizonte', state: 'MG',
      }),
      shipping_service_name: 'SEDEX Corporativo',
      shipping_carrier: 'Correios',
      shipping_tracking_code: null,
      shipping_days: 3,
      manufacturing_days: 4,
      total_estimated_days: 7,
      subtotal_cents: 29990,
      discount_cents: 0,
      shipping_cents: 2490,
      total_cents: 32480,
      gateway_fee_estimated_cents: 322,
      gateway_fee_actual_cents: 322,
      coupon_code: null,
      partner_id: null,
      partner_code: null,
      payment_method: 'pix',
      payment_external_id: 'mp_pay_99812303',
      idempotency_key: 'idem-ord-1003',
      financial_status: 'paid',
      production_status: 'queued',
      fulfillment_status: 'unfulfilled',
      cart_selection_mode: 'full',
      unselected_items_preserved_count: 0,
      claim_token: 'claim-token-1003',
    },
    {
      id: 'ord-1004',
      order_number: 'RBS-2026-1004',
      user_id: null,
      guest_name: 'Fernanda Lemos',
      guest_email: 'fernanda.lemos@email.com',
      guest_phone: '(41) 99871-1122',
      guest_cpf_cnpj: '556.677.889-90',
      shipping_address_json: JSON.stringify({
        cep: '80420-090', street: 'Avenida do Batel', number: '1230', complement: 'Casa',
        neighborhood: 'Batel', city: 'Curitiba', state: 'PR',
      }),
      shipping_service_name: 'PAC (Melhor Envio)',
      shipping_carrier: 'Correios',
      shipping_tracking_code: null,
      shipping_days: 5,
      manufacturing_days: 2,
      total_estimated_days: 7,
      subtotal_cents: 11490,
      discount_cents: 0,
      shipping_cents: 2290,
      total_cents: 13780,
      gateway_fee_estimated_cents: 136,
      gateway_fee_actual_cents: null,
      coupon_code: null,
      partner_id: null,
      partner_code: null,
      payment_method: 'pix',
      payment_external_id: 'mp_pay_99812304',
      idempotency_key: 'idem-ord-1004',
      financial_status: 'pending',
      production_status: 'awaiting_payment',
      fulfillment_status: 'unfulfilled',
      cart_selection_mode: 'partial',
      unselected_items_preserved_count: 2,
      claim_token: 'claim-token-1004',
    },
  ];

  for (const o of orders) {
    await db.query(
      `INSERT INTO orders (
        id, order_number, user_id, guest_name, guest_email, guest_phone, guest_cpf_cnpj,
        shipping_address_json, shipping_service_name, shipping_carrier, shipping_tracking_code,
        shipping_days, manufacturing_days, total_estimated_days,
        subtotal_cents, discount_cents, shipping_cents, total_cents,
        gateway_fee_estimated_cents, gateway_fee_actual_cents,
        coupon_code, partner_id, partner_code, payment_method, payment_external_id, idempotency_key,
        financial_status, production_status, fulfillment_status,
        cart_selection_mode, unselected_items_preserved_count, post_purchase_claim_token
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
      ) ON CONFLICT (id) DO NOTHING`,
      [
        o.id, o.order_number, o.user_id, o.guest_name, o.guest_email, o.guest_phone, o.guest_cpf_cnpj,
        o.shipping_address_json, o.shipping_service_name, o.shipping_carrier, o.shipping_tracking_code,
        o.shipping_days, o.manufacturing_days, o.total_estimated_days,
        o.subtotal_cents, o.discount_cents, o.shipping_cents, o.total_cents,
        o.gateway_fee_estimated_cents, o.gateway_fee_actual_cents,
        o.coupon_code, o.partner_id, o.partner_code, o.payment_method, o.payment_external_id, o.idempotency_key,
        o.financial_status, o.production_status, o.fulfillment_status,
        o.cart_selection_mode, o.unselected_items_preserved_count, o.claim_token,
      ]
    );
  }

  const orderItems = [
    ['oi-1001-1', 'ord-1001', 'prod-vaso-voronoi', 'var-voronoi-terracota', 'RBS-DEC-001-TER', 'Vaso Voronoi Orgânico Escultural', 'Terracota Seda • Médio (22 cm)', 'PLA', 'ready_stock', 1, 1, 12990, 3850, 'Para Mamãe 2026', null, 215, 215],
    ['oi-1001-2', 'ord-1001', 'prod-suporte-headset', 'var-headset-carbon', 'RBS-ORG-003-CRB', 'Suporte de Headset & Controle Low-Poly Carbon', 'Preto Carbono PEI', 'PETG', 'ready_stock', 1, 1, 9490, 3120, 'MARI_DEV', null, 240, 240],
    ['oi-1002-1', 'ord-1002', 'prod-luminaria-lua', 'var-lua-quente', 'RBS-PRE-002-QNT', 'Luminária Lua Cheia Litofania 3D + Base Madeira', 'Branco Lunar (LED Quente 3000K)', 'PLA', 'made_to_order', 3, 1, 18990, 5400, 'Rafael & Júlia • 12/11', 'Favor revisar contraste da cratera Tycho', 280, 280],
    ['oi-1003-1', 'ord-1003', 'prod-chaveiro-nfc-lote', 'var-chaveiro-25', 'RBS-B2B-006-P25', 'Pack 25 Chaveiros Corporativos 3D Relevo Dupla Cor + Tag NFC', 'Personalizado Cores da Marca • Lote 25 un', 'PETG', 'made_to_order', 4, 1, 29990, 9800, 'OdontoPrime', 'Link NFC: https://instagram.com/rbscriacao', 450, null],
    ['oi-1004-1', 'ord-1004', 'prod-dragao-articulado', 'var-dragao-cobre', 'RBS-PRE-005-CBE', 'Dragão Imperial Articulado Print-in-Place (45 cm)', 'Dual Cobre & Esmeralda', 'PLA', 'ready_stock', 2, 1, 11490, 3450, null, null, 190, null],
  ];

  for (const oi of orderItems) {
    await db.query(
      `INSERT INTO order_items (
        id, order_id, product_id, variation_id, sku_snapshot, product_name_snapshot, variation_label_snapshot,
        material_snapshot, availability_snapshot, lead_time_days_snapshot, quantity, unit_price_cents, unit_cost_cents,
        custom_text, custom_notes, filament_grams_estimated, filament_grams_actual
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO NOTHING`,
      oi
    );
  }

  // Production Kanban Jobs
  const jobs = [
    ['job-1001', 'ord-1001', 'oi-1001-1', 'prod-vaso-voronoi', 'LOTE-2026-10A', 'Bambu Lab X1C #01', 'sup-pla-terracota', 'shipped', 'normal', 1, 215, 215, 0, 245, true, 'Inspeção de superfície aprovada e despachado via SEDEX.'],
    ['job-1002', 'ord-1002', 'oi-1002-1', 'prod-luminaria-lua', 'LOTE-2026-10B', 'Bambu Lab P1S #02', 'sup-pla-branco', 'printing', 'high', 1, 280, 280, 42, 420, false, 'Reimpressão iniciada após queda de aderência parcial no suporte inicial (42g registrados como perda).'],
    ['job-1003', 'ord-1003', 'oi-1003-1', 'prod-chaveiro-nfc-lote', 'LOTE-2026-10C', 'Bambu Lab X1C #01 (AMS)', 'sup-petg-carbon', 'queued', 'high', 1, 450, 0, 0, 390, false, 'Pausa programada na camada #14 (2,20 mm) para inserção das 25 tags NFC NTAG213.'],
    ['job-1004', 'ord-1004', 'oi-1004-1', 'prod-dragao-articulado', 'LOTE-2026-10D', 'Bambu Lab A1 #03', 'sup-pla-dual', 'awaiting_payment', 'normal', 1, 190, 0, 0, 290, false, 'Aguardando compensação do Pix para liberar fila de máquina.'],
    ['job-1005', 'ord-1001', 'oi-1001-2', 'prod-suporte-headset', 'LOTE-2026-10E', 'Bambu Lab P1S #02', 'sup-petg-carbon', 'ready_to_ship', 'normal', 1, 240, 240, 0, 260, true, 'Acabamento de borda concluído e conferido com paquímetro digital.'],
    ['job-1006', null, null, 'prod-cachepot-autodrenante', 'LOTE-2026-REP', 'Bambu Lab A1 #03', 'sup-petg-carbon', 'post_processing', 'normal', 2, 520, 520, 0, 550, false, 'Reposição de estoque interno — removendo brim e testando rosca do reservatório.'],
  ];

  for (const j of jobs) {
    await db.query(
      `INSERT INTO production_jobs (
        id, order_id, order_item_id, product_id, batch_code, printer_name, supply_id,
        stage, priority, quantity, estimated_grams, actual_grams_consumed, wasted_grams,
        estimated_minutes, quality_checklist_passed, operator_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (id) DO NOTHING`,
      j
    );
  }

  await db.query(
    `INSERT INTO production_failures (id, production_job_id, order_id, supply_id, wasted_grams, waste_cost_cents, failure_reason, reprint_triggered, recorded_by)
     VALUES ('fail-01', 'job-1002', 'ord-1002', 'sup-pla-branco', 42, 462, 'Descolamento de suporte árvore na altura 38mm — mesa higienizada com IPA e reimpressão disparada.', true, 'Lucas Bancada 3D')
     ON CONFLICT (id) DO NOTHING`
  );

  // Inventory movements ledger
  const movements = [
    ['mov-01', 'supply', null, null, 'sup-pla-terracota', null, 'loc-factory', 'purchase_entry', 5000, 12, 'supply_purchase', 'FIN-PAY-001', 'Compra de 5 bobinas de 1kg (5.000g) PLA Seda Terracota', 'Rodrigo Souza'],
    ['mov-02', 'supply', null, null, 'sup-pla-terracota', 'loc-factory', null, 'supply_consumption', 215, 12, 'production_job', 'job-1001', 'Consumo real de filamento na O.P. LOTE-2026-10A (Pedido RBS-2026-1001)', 'Lucas Bancada 3D'],
    ['mov-03', 'supply', null, null, 'sup-pla-branco', 'loc-factory', null, 'print_failure_waste', 42, 11, 'production_failure', 'fail-01', 'Perda por falha de aderência em suporte — O.P. LOTE-2026-10B', 'Lucas Bancada 3D'],
    ['mov-04', 'supply', null, null, 'sup-pla-branco', 'loc-factory', null, 'reprint_consumption', 280, 11, 'production_job', 'job-1002', 'Consumo de reimpressão da Luminária Lua Litofania', 'Lucas Bancada 3D'],
    ['mov-05', 'product', 'prod-vaso-voronoi', 'var-voronoi-terracota', null, 'loc-expedition', 'loc-consig-01', 'consignment_send', 6, 3850, 'consignment_shipment', 'csg-001', 'Envio de 6 unidades em consignação para Ateliê Camila Decor', 'Rodrigo Souza'],
  ];

  for (const m of movements) {
    await db.query(
      `INSERT INTO inventory_movements (
        id, item_type, product_id, variation_id, supply_id, from_location_id, to_location_id,
        movement_type, quantity, unit_cost_cents, reference_type, reference_id, reason, actor_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO NOTHING`,
      m
    );
  }

  // 7. Custom Quotes (/personalizados workflow)
  await db.query(
    `INSERT INTO custom_quotes (
      id, quote_number, user_id, client_name, client_email, client_phone, company_name,
      project_title, description, intended_use, preferred_material, preferred_color,
      dimensions_description, quantity, deadline_desired, file_name, file_size_bytes,
      file_checksum_sha256, file_private_path, status, estimated_grams, estimated_print_minutes,
      quoted_price_cents, quoted_manufacturing_days, quoted_validity_date, admin_internal_notes
    ) VALUES
    (
      'quo-2001', 'ORC-2026-2001', 'usr-customer', 'Mariana Costa', 'cliente@rbscriacao.com', '(11) 98765-4321', NULL,
      'Suporte Sob Medida para Cafeteira Espresso + Porta Tamper 58mm',
      'Preciso de uma estação organizadora para tamper 58mm, distribuidor e funil, resistente a respingos de água e café quente.',
      'contato_agua', 'PETG', 'Preto Carbono PEI', '210 x 140 x 75 mm', 1, '15/11/2026',
      'estacao-barista-58mm.stl', 2845120, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      '/private-storage/quotes/ORC-2026-2001/estacao-barista-58mm.stl', 'quoted', 340, 390,
      16800, 3, '2026-11-20', 'Geometria validada no fatiador; parede de 4 perímetros e preenchimento gyroid 25%.'
    ),
    (
      'quo-2002', 'ORC-2026-2002', NULL, 'Eng. Roberto Mendes', 'roberto@mendesautomacao.com.br', '(21) 98222-3344', 'Mendes Automação Industrial',
      'Gabinete Técnico Din-Rail com Aletas de Ventilação (Lote 15 pçs)',
      'Caixa de proteção para placa controladora IoT com suporte para trilho DIN 35mm e resistência térmica em painel.',
      'funcional_mecanico', 'ABS', 'Cinza Industrial', '115 x 90 x 55 mm', 15, '25/11/2026',
      'case-iot-din35-v4.step', 5412800, '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
      '/private-storage/quotes/ORC-2026-2002/case-iot-din35-v4.step', 'analyzing', 1650, 1420,
      NULL, NULL, NULL, 'Analisando contração térmica em ABS fechado na Bambu X1C.'
    ),
    (
      'quo-2003', 'ORC-2026-2003', NULL, 'Agência Vértice Live Marketing', 'producao@verticelive.com.br', '(11) 97111-9090', 'Vértice Eventos',
      'Troféu Geométrico Premiação Anual Tech Summit (30 unidades)',
      'Troféu facetado em PLA Seda Dourado Champagne com base preta pesada e plaqueta com nome individual de cada premiado.',
      'lote_corporativo', 'PLA', 'Ouro Champagne Seda', '95 x 95 x 240 mm', 30, '30/11/2026',
      'trofeu-tech-summit-2026.3mf', 8192000, '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      '/private-storage/quotes/ORC-2026-2003/trofeu-tech-summit-2026.3mf', 'approved', 5400, 4800,
      285000, 6, '2026-11-18', 'Orçamento aprovado pelo cliente; aguardando compensação do faturamento B2B.'
    )
    ON CONFLICT (id) DO NOTHING`
  );

  await db.query(
    `INSERT INTO custom_quote_revisions (id, quote_id, revision_number, author_role, author_name, message, proposed_price_cents, proposed_days)
     VALUES
     ('qrev-01', 'quo-2001', 1, 'client', 'Mariana Costa', 'Enviei o STL na versão 58mm. Gostaria que suportasse lavagem em água corrente.', NULL, NULL),
     ('qrev-02', 'quo-2001', 2, 'admin', 'Rodrigo Souza (Engenharia RBS)', 'Analisamos seu arquivo! Recomendamos PETG Carbon Tech com 4 perímetros para impermeabilidade total e alta rigidez. Segue proposta formal pronta para aprovação online.', 16800, 3)
     ON CONFLICT (id) DO NOTHING`
  );

  // 8. Financial Accounts, Entries (Separating Cash vs. Accrual & Asset Purchase vs. COGS Consumption!)
  await db.query(
    `INSERT INTO financial_accounts (id, name, account_type, institution, balance_cents)
     VALUES
     ('acc-bank', 'Conta Empresarial Principal (Inter / Itaú PJ)', 'bank', 'Banco Inter PJ', 485200),
     ('acc-mp', 'Conta Digital Mercado Pago (Gateway)', 'gateway', 'Mercado Pago', 74159),
     ('acc-cash', 'Caixa Operacional Estúdio RBS', 'cash', 'Caixa Interno', 35000)
     ON CONFLICT (id) DO NOTHING`
  );

  const financialEntries = [
    // Receivables from orders
    ['fin-rec-1001', 'REC-2026-1001', 'receivable', 'product_sale', 'gross_revenue', 'Pedido RBS-2026-1001 — Mariana Costa (Seleção Parcial)', 'Mariana Costa', 'order', 'ord-1001', '2026-10-28', '2026-10-28', 23546, 23546, 1175, 1215, 22331, 'reconciled', 'acc-mp'],
    ['fin-rec-1002', 'REC-2026-1002', 'receivable', 'product_sale', 'gross_revenue', 'Pedido RBS-2026-1002 — Rafael Albuquerque (Luminária Lua)', 'Rafael Albuquerque', 'order', 'ord-1002', '2026-10-29', '2026-10-29', 20680, 20680, 1032, 1032, 19648, 'paid', 'acc-mp'],
    ['fin-rec-1003', 'REC-2026-1003', 'receivable', 'b2b_sale', 'gross_revenue', 'Pedido RBS-2026-1003 — Clínica Odonto Prime (Lote 25 Chaveiros NFC)', 'Clínica Odonto Prime LTDA', 'order', 'ord-1003', '2026-10-30', '2026-10-30', 32480, 32480, 322, 322, 32158, 'paid', 'acc-mp'],
    ['fin-rec-1004', 'REC-2026-1004', 'receivable', 'product_sale', 'gross_revenue', 'Pedido RBS-2026-1004 — Fernanda Lemos (Aguardando Pix)', 'Fernanda Lemos', 'order', 'ord-1004', '2026-10-31', '2026-11-01', 13780, 0, 136, null, 13644, 'pending', 'acc-mp'],

    // Filament Purchase = Inventory Asset Purchase + Cash Outflow (NOT double-counted as DRE COGS!)
    ['fin-pay-001', 'PAY-2026-001', 'payable', 'raw_material_purchase', 'inventory_asset_purchase', 'Compra 5kg Filamento PLA Seda Terracota (Entrada em Estoque de Insumos)', '3D Prime Filamentos Brasil', 'supply_purchase', 'sup-pla-terracota', '2026-10-20', '2026-10-25', 60000, 60000, 0, 0, 60000, 'paid', 'acc-bank'],

    // COGS = Actual consumption of filament + packaging on produced orders (Accrual basis / Competência)
    ['fin-cogs-1001', 'CMV-2026-1001', 'payable', 'raw_material_purchase', 'cogs_supply_consumed', 'CMV Insumos Consumidos (455g Filamento + Embalagem) — Pedido RBS-2026-1001', 'Consumo Interno Estoque 3D', 'production_job', 'job-1001', '2026-10-28', '2026-10-28', 6970, 6970, 0, 0, 6970, 'paid', 'acc-cash'],
    ['fin-cogs-1002', 'CMV-2026-1002', 'payable', 'raw_material_purchase', 'cogs_supply_consumed', 'CMV Insumos Consumidos (280g + 42g Perda Reimpressão) — Pedido RBS-2026-1002', 'Consumo Interno Estoque 3D', 'production_job', 'job-1002', '2026-10-29', '2026-10-29', 5862, 5862, 0, 0, 5862, 'paid', 'acc-cash'],

    // Partner commission payable
    ['fin-pay-comm-01', 'PAY-COM-1001', 'payable', 'partner_commission', 'partner_commission', 'Comissão Parceiro 15% (Cupom PARCEIRO10 — Pedido RBS-2026-1001)', 'Camila Design & Decor', 'partner_commission', 'ord-1001', '2026-10-28', '2026-11-10', 3203, 0, 0, 0, 3203, 'pending', 'acc-bank'],

    // Operating expenses (Energy & Maintenance)
    ['fin-pay-energy', 'PAY-ENE-1026', 'payable', 'energy_utility', 'operating_expense', 'Fatura Energia Elétrica Fazenda de Impressoras 3D (Outubro)', 'Enel Distribuição RJ', 'manual', 'ENE-2026-10', '2026-10-25', '2026-11-05', 38900, 0, 0, 0, 38900, 'pending', 'acc-bank'],
    ['fin-pay-shipping', 'PAY-FRT-1001', 'payable', 'shipping_cost', 'shipping_expense', 'Etiqueta SEDEX Melhor Envio — Pedido RBS-2026-1001', 'Melhor Envio / Correios', 'order', 'ord-1001', '2026-10-28', '2026-10-28', 1940, 1940, 0, 0, 1940, 'paid', 'acc-mp'],
  ];

  for (const fe of financialEntries) {
    await db.query(
      `INSERT INTO financial_entries (
        id, entry_code, direction, category_code, accounting_class, description, counterparty_name,
        reference_type, reference_id, competence_date, due_date,
        gross_amount_cents, paid_amount_cents, fee_estimated_cents, fee_actual_cents, net_amount_cents,
        status, account_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT (id) DO NOTHING`,
      fe
    );
  }

  await db.query(
    `INSERT INTO financial_reconciliations (
      id, entry_id, order_id, gateway_name, expected_gross_cents, expected_fee_cents, actual_fee_cents, fee_divergence_cents, net_settled_cents, reconciled_by, notes
    ) VALUES (
      'rec-log-01', 'fin-rec-1001', 'ord-1001', 'Mercado Pago', 23546, 1175, 1215, 40, 22331, 'Rodrigo Souza (Admin RBS)',
      'Divergência de R$ 0,40 identificada na tarifa de liquidação instantânea do gateway e conciliada no razão financeiro.'
    ) ON CONFLICT (id) DO NOTHING`
  );

  await db.query(
    `INSERT INTO partner_commissions (
      id, partner_id, order_id, origin_type, calculation_base_cents, commission_rate_pct, commission_amount_cents, status, financial_entry_id
    ) VALUES (
      'pcom-01', 'prt-01', 'ord-1001', 'coupon', 21356, 15.00, 3203, 'approved', 'fin-pay-comm-01'
    ) ON CONFLICT (id) DO NOTHING`
  );

  // 9. Pricing Presets & Simulations (including the exact mathematical R$ 49,24 audit benchmark!)
  await db.query(
    `INSERT INTO pricing_presets (
      id, name, filament_cost_per_kg_cents, kwh_rate_cents, printer_power_watts,
      machine_value_cents, machine_lifespan_hours, maintenance_per_hour_cents,
      operator_hour_rate_cents, default_failure_rate_pct, default_packaging_cents, is_default
    ) VALUES (
      'preset-bambu-x1c', 'Padrão Estúdio RBS — Bambu Lab X1C / P1S (FDM)', 11000, 95, 350,
      850000, 6000, 80, 3500, 5.00, 350, true
    ) ON CONFLICT (id) DO NOTHING`
  );

  await db.query(
    `INSERT INTO pricing_simulations (
      id, product_id, simulation_name, channel, lot_quantity,
      part_grams, support_purge_grams, filament_cost_per_kg_cents, print_minutes, post_process_minutes,
      packaging_cents, extra_inputs_cents, energy_cost_cents, depreciation_cost_cents, labor_cost_cents,
      failure_rate_pct, unit_direct_cost_cents, fixed_fee_cents, variable_fee_pct, target_margin_pct,
      suggested_unit_price_cents, suggested_lot_price_cents, net_unit_profit_cents, real_margin_pct, applied_to_product
    ) VALUES
    (
      'sim-benchmark-4924', 'prod-suporte-headset', 'Cenário Referência Auditoria (Custo R$ 30 + Taxa R$ 2 + 10% + Margem 25%)',
      'loja_propria_cartao', 1, 160, 15, 11000, 150, 10,
      350, 0, 83, 355, 583, 5.00, 3000, 200, 10.00, 25.00,
      4924, 4924, 1232, 25.02, false
    ),
    (
      'sim-vaso-voronoi', 'prod-vaso-voronoi', 'Precificação Oficial Vaso Voronoi Orgânico (Loja Própria)',
      'loja_propria_pix', 1, 195, 20, 12000, 245, 15,
      350, 220, 136, 580, 875, 5.00, 3850, 150, 4.99, 45.00,
      12990, 12990, 8342, 64.22, true
    )
    ON CONFLICT (id) DO NOTHING`
  );

  // 10. Promotions & Banners
  await db.query(
    `INSERT INTO promotions (
      id, code, name, promotion_type, discount_value, min_order_cents, min_quantity,
      applies_to_product_id, status, min_margin_guard_pct, simulated_impact_json
    ) VALUES
    ('promo-bemvindo', 'BEMVINDO10', 'Boas-Vindas Primeira Compra 10% OFF', 'percentage', 10.00, 8000, 1, NULL, 'active', 20.00, '{"estimatedMarginAfterDiscountPct":46.5,"protected":true}'),
    ('promo-parceiro10', 'PARCEIRO10', 'Cupom Parceira Camila Decor (5% OFF Cliente + 15% Comissão)', 'percentage', 5.00, 5000, 1, NULL, 'active', 22.00, '{"estimatedMarginAfterDiscountPct":41.2,"protected":true}'),
    ('promo-lote-b2b', 'CORP15', 'Desconto Progressivo Lotes Corporativos (Acima de R$ 500)', 'percentage', 15.00, 50000, 2, NULL, 'scheduled', 18.00, '{"estimatedMarginAfterDiscountPct":34.8,"protected":true}')
    ON CONFLICT (id) DO NOTHING`
  );

  await db.query(
    `INSERT INTO banners (
      id, title, subtitle, cta_label, cta_href, placement,
      desktop_image_url, mobile_image_url, focal_point_x, focal_point_y, badge_text, sort_order, is_active, clicks_count, views_count
    ) VALUES
    (
      'ban-hero-1', 'Uma forma. Vários tons.',
      'O Vaso Premium Furta-Cor revela reflexos entre o cobre e o dourado conforme a luz natural percorre suas facetas em espiral.',
      'Conhecer o vaso', '/produto/vaso-premium-furta-cor', 'home_hero',
      '/products/real/ambiente-sala-vaso-espiral.png', '/products/real/vaso-espiral-cobre-mesa.png', 48, 58, 'Vaso Premium Furta-Cor', 1, true, 148, 1920
    ),
    (
      'ban-hero-2', 'Peças feitas a partir da sua ideia',
      'Desenvolvemos objetos sob medida, peças de reposição e séries especiais a partir de referências, medidas ou arquivos tridimensionais.',
      'Solicitar orçamento', '/personalizados', 'home_secondary',
      '/products/real/vasos-canelados-bicolor-macro.png', '/products/real/vasos-canelados-bicolor-macro.png', 50, 50, 'Feito sob medida', 2, true, 89, 1140
    ),
    (
      'ban-promo-strip', '5% de desconto no Pix e prazo de fabricação informado antes da entrega',
      'Veja o tempo de preparo da peça e o prazo da transportadora de forma clara antes de finalizar o pedido.',
      'Conhecer materiais', '/guia-de-materiais', 'promo_strip',
      '/products/real/vasos-canelados-bicolor-square.png', '/products/real/vasos-canelados-bicolor-square.png', 50, 50, 'Compra transparente', 3, true, 54, 980
    )
    ON CONFLICT (id) DO NOTHING`
  );

  // 11. Instagram (@rbscriacao) Posts & Product Tagging
  const socialPosts = [
    ['soc-01', '@rbscriacao', 'ig_post_001', 'IMAGE', '/products/real/vaso-espiral-cobre-mesa.png', 'https://www.instagram.com/rbscriacao/', 'Luz de fim de tarde sobre as facetas em espiral do Vaso Premium Furta-Cor na sala de estar.', true, true, 42],
    ['soc-02', '@rbscriacao', 'ig_post_002', 'IMAGE', '/products/real/vasos-canelados-bicolor-square.png', 'https://www.instagram.com/rbscriacao/', 'Contraste entre a textura canelada preta fosca e a base em cobre acetinado no Trio de Cachepots.', true, true, 37],
    ['soc-03', '@rbscriacao', 'ig_post_003', 'IMAGE', '/products/real/esfera-voronoi-only.png', 'https://www.instagram.com/rbscriacao/', 'Geometria orgânica vazada para compor livros de centro, aparadores e estantes.', true, true, 29],
    ['soc-04', '@rbscriacao', 'ig_post_004', 'IMAGE', '/products/real/sabre-jedi-colecionavel-card.png', 'https://www.instagram.com/rbscriacao/', 'Precisão de encaixe multicolorido no Sabre Colecionável impresso em partes independentes.', true, true, 51],
  ];

  for (const sp of socialPosts) {
    await db.query(
      `INSERT INTO social_posts (id, instagram_handle, external_post_id, media_type, media_url, permalink, caption, is_featured_on_home, is_visible_on_page, clicks_to_product_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      sp
    );
  }

  await db.query(
    `INSERT INTO social_post_products (id, post_id, product_id, hotspot_x, hotspot_y)
     VALUES
     ('spp-01', 'soc-01', 'prod-vaso-furta-cor', 48, 55),
     ('spp-02', 'soc-02', 'prod-cachepot-autodrenante', 52, 50),
     ('spp-03', 'soc-03', 'prod-vaso-voronoi', 45, 60),
     ('spp-04', 'soc-04', 'prod-sabre-colecionavel', 50, 50)
     ON CONFLICT (id) DO NOTHING`
  );

  // 12. Interest Alerts & Commercial Intelligence Observable Events
  await db.query(
    `INSERT INTO interest_alerts (
      id, product_id, variation_id, user_id, visitor_name, visitor_email, visitor_whatsapp,
      alert_type, target_price_cents, channel, opt_in_confirmed, unsubscribe_token, status
    ) VALUES
    ('alrt-01', 'prod-escultura-resina', 'var-resina-cinza', 'usr-customer', 'Mariana Costa', 'cliente@rbscriacao.com', '(11) 98765-4321', 'price_drop', 21990, 'both', true, 'unsub-tok-001', 'active'),
    ('alrt-02', 'prod-dragao-articulado', 'var-dragao-cobre', NULL, 'Bruno Azevedo', 'bruno.azevedo@email.com', '(21) 99441-1020', 'restock', NULL, 'whatsapp', true, 'unsub-tok-002', 'active'),
    ('alrt-03', 'prod-vaso-voronoi', 'var-voronoi-champagne', NULL, 'Patrícia Vieira', 'patricia.vieira@arquitetura.com', '(11) 98112-3344', 'variation_return', 14990, 'email', true, 'unsub-tok-003', 'notified')
    ON CONFLICT (id) DO NOTHING`
  );

  // Seed observable commercial events for funnel analytics & opportunities
  const eventSeeds: Array<[string, string, string, string | null, string | null, string]> = [
    // Product views, wishlist adds, cart adds, selective checkout leaves, purchases
    ['evt-01', 'product_view', 'sess-vis-01', 'prod-vaso-voronoi', null, 'instagram'],
    ['evt-02', 'product_view', 'sess-vis-02', 'prod-vaso-voronoi', null, 'organico'],
    ['evt-03', 'product_view', 'sess-vis-03', 'prod-vaso-voronoi', null, 'direto'],
    ['evt-04', 'wishlist_add', 'sess-vis-01', 'prod-vaso-voronoi', null, 'instagram'],
    ['evt-05', 'cart_add', 'sess-vis-01', 'prod-vaso-voronoi', null, 'instagram'],
    ['evt-06', 'checkout_selective_confirm', 'sess-vis-01', 'prod-vaso-voronoi', 'ord-1001', 'instagram'],
    ['evt-07', 'payment_success', 'sess-vis-01', 'prod-vaso-voronoi', 'ord-1001', 'instagram'],

    // Escultura Resina: high views & wishlist & cart adds, left unselected in partial checkout (Price sensitivity signal!)
    ['evt-08', 'product_view', 'sess-vis-04', 'prod-escultura-resina', null, 'instagram'],
    ['evt-09', 'product_view', 'sess-vis-05', 'prod-escultura-resina', null, 'organico'],
    ['evt-10', 'product_view', 'sess-vis-06', 'prod-escultura-resina', null, 'direto'],
    ['evt-11', 'wishlist_add', 'sess-vis-04', 'prod-escultura-resina', null, 'instagram'],
    ['evt-12', 'wishlist_add', 'sess-vis-05', 'prod-escultura-resina', null, 'organico'],
    ['evt-13', 'cart_add', 'sess-vis-04', 'prod-escultura-resina', null, 'instagram'],
    ['evt-14', 'cart_save_for_later', 'sess-vis-04', 'prod-escultura-resina', null, 'instagram'],
    ['evt-15', 'cart_select_toggle', 'sess-vis-01', 'prod-escultura-resina', null, 'instagram'],

    // Luminaria Lua
    ['evt-16', 'product_view', 'sess-vis-07', 'prod-luminaria-lua', null, 'instagram'],
    ['evt-17', 'wishlist_add', 'sess-vis-07', 'prod-luminaria-lua', null, 'instagram'],
    ['evt-18', 'cart_add', 'sess-vis-07', 'prod-luminaria-lua', null, 'instagram'],
    ['evt-19', 'payment_success', 'sess-vis-07', 'prod-luminaria-lua', 'ord-1002', 'instagram'],

    // Chaveiro NFC B2B
    ['evt-20', 'product_view', 'sess-vis-08', 'prod-chaveiro-nfc-lote', null, 'organico'],
    ['evt-21', 'cart_add', 'sess-vis-08', 'prod-chaveiro-nfc-lote', null, 'organico'],
    ['evt-22', 'payment_success', 'sess-vis-08', 'prod-chaveiro-nfc-lote', 'ord-1003', 'organico'],

    // Search queries without result or high demand
    ['evt-23', 'search_query', 'sess-vis-09', null, null, 'suporte alexa echo dot'],
    ['evt-24', 'search_query', 'sess-vis-10', null, null, 'vaso voronoi terracota'],
    ['evt-25', 'search_query', 'sess-vis-11', null, null, 'trofeu corporativo 3d'],
  ];

  for (const [id, evtName, sess, prodId, ordId, extra] of eventSeeds) {
    const isSearch = evtName === 'search_query';
    await db.query(
      `INSERT INTO commercial_events (id, event_name, session_key, product_id, order_id, search_term, channel_source, metadata_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [
        id,
        evtName,
        sess,
        prodId,
        ordId,
        isSearch ? extra : null,
        isSearch ? 'busca_interna' : extra,
        JSON.stringify({ selected: evtName !== 'cart_select_toggle' }),
      ]
    );
  }

  // 13. Store Settings
  const settings: Array<[string, Record<string, unknown>]> = [
    ['brand', {
      name: 'RBS Criação',
      domain: 'https://www.rbscriacao.com',
      instagram: '@rbscriacao',
      whatsapp: '5521998887766',
      email: 'contato@rbscriacao.com',
      originCep: '25020-140',
      cityState: 'Duque de Caxias / RJ',
      pixDiscountPct: 5,
      freeShippingThresholdCents: 29900,
    }],
    ['integrations', {
      mercadoPagoConfigured: Boolean(process.env.MP_ACCESS_TOKEN),
      mercadoPagoSandboxMode: true,
      melhorEnvioConfigured: Boolean(process.env.MELHOR_ENVIO_TOKEN),
      metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || 'RBS_PIXEL_HOMOLOG',
      metaCapiConfigured: Boolean(process.env.META_CAPI_TOKEN),
      googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID || 'G-RBSCRIACAO3',
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
    }],
  ];

  for (const [key, val] of settings) {
    await db.query(
      `INSERT INTO store_settings (key, value_json) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [key, JSON.stringify(val)]
    );
  }
}
