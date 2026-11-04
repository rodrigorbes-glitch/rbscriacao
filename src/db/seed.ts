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
    ['usr-admin-rodrigo', 'Rodrigo Souza (Admin RBS)', 'rodrigorbes@gmail.com', hashPassword('Admin@RBS2026!'), 'admin', '(21) 99888-7766', '12.345.678/0001-90', true, true],
    ['usr-admin-rachel', 'Dra. Rachel Beatriz (Admin RBS)', 'dra.rachelbeatriz@gmail.com', hashPassword('Admin@RBS2026!'), 'admin', '(21) 99888-7766', '12.345.678/0001-90', true, true],
    ['usr-admin', 'Administrador Master', 'admin@rbscriacao.com', hashPassword('Admin@RBS2026!'), 'admin', '(21) 99888-7766', '12.345.678/0001-90', true, true],
    ['usr-operator', 'Lucas Bancada 3D (Operador)', 'operacao@rbscriacao.com', hashPassword('Operador@RBS2026!'), 'operator', '(21) 99777-6655', '123.456.789-01', true, true],
    ['usr-partner', 'Camila Design & Decor (Parceira)', 'parceiro@rbscriacao.com', hashPassword('Parceiro@RBS2026!'), 'partner', '(21) 99666-5544', '23.456.789/0001-12', true, true],
    ['usr-customer', 'Mariana Costa', 'cliente@rbscriacao.com', hashPassword('Cliente@RBS2026!'), 'customer', '(11) 98765-4321', '345.678.901-23', true, true],
  ];

  for (const u of users) {
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, phone, document_cpf_cnpj, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO UPDATE SET
         role = EXCLUDED.role,
         is_active = TRUE`,
      u
    );
  }

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













  // 6. Financial Accounts (Clean operational accounts with initial 0 balance)
  await db.query(
    `INSERT INTO financial_accounts (id, name, account_type, institution, balance_cents)
     VALUES
     ('acc-bank', 'Conta Empresarial Principal (Inter / Itaú PJ)', 'bank', 'Banco Inter PJ', 0),
     ('acc-mp', 'Conta Digital Mercado Pago (Gateway)', 'gateway', 'Mercado Pago', 0),
     ('acc-cash', 'Caixa Operacional Estúdio RBS', 'cash', 'Caixa Interno', 0)
     ON CONFLICT (id) DO NOTHING`
  );

  // 7. Pricing Presets (Studio Parameters Bambu Lab X1C / P1S)
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

  // 8. Promotions & Banners
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

  // 10. Store Settings
  const settings: Array<[string, Record<string, unknown>]> = [
    ['brand', {
      name: 'RBS Criação',
      domain: 'https://www.rbscriacao.com',
      instagram: '@rbscriacao',
      instagramUrl: 'https://instagram.com/rbscriacao',
      facebook: '@rbscriacao',
      facebookUrl: 'https://facebook.com/rbscriacao',
      whatsapp: '(21) 99888-7766',
      phone: '(21) 99888-7766',
      email: 'contato@rbscriacao.com',
      shippingText: 'Envio para todo o Brasil',
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
