export interface HelpArticle {
  id: string;
  key: string;
  moduleSlug: string;
  moduleName: string;
  title: string;
  summary: string;
  targetRoute: string;
  relatedScreenUrl: string;
  relatedScreenLabel: string;
  menuLabel: string;
  requiredRole: string;
  steps: string[];
  practicalExample: string;
  commonMistakes: string[];
  keywords: string[];
}

export const HELP_ARTICLES_LIST: HelpArticle[] = [
  {
    id: 'help-visao-geral',
    key: 'visao-geral',
    moduleSlug: 'visao-geral',
    moduleName: 'Visão Geral (Cockpit)',
    title: 'Cockpit & Visão Geral Operacional',
    summary: 'Como acompanhar fila de impressão 3D, contas do dia, estoque crítico de filamentos e atalhos rápidos.',
    targetRoute: '/admin',
    relatedScreenUrl: '/admin',
    relatedScreenLabel: 'Ir para Visão Geral',
    menuLabel: 'Admin → Visão Geral',
    requiredRole: 'admin_master | operations',
    steps: [
      'Verifique no topo os indicadores em tempo real: Receita Paga, Pedidos na Fila de Impressão, Insumos Críticos e Orçamentos Sob Medida.',
      'Clique em qualquer card de alerta (ex: Filamento abaixo de 1.000 g ou Conta a Vencer) para abrir diretamente a tela de ação.',
      'Use o bloco de Ações Rápidas para lançar compra de bobina, simular preço ou mover ordens no Kanban.',
    ],
    practicalExample: 'Se o Filamento PLA Dual Cobre/Esmeralda estiver com 680 g (abaixo do mínimo de 1.000 g), o card de Estoque Crítico destaca o item e leva direto ao registro de compra.',
    commonMistakes: [
      'Iniciar impressão longa sem conferir se o saldo em gramas da bobina cobre peça + suporte + margem de falha.',
    ],
    keywords: ['dashboard', 'cockpit', 'visão geral', 'alertas', 'resumo', 'fila'],
  },
  {
    id: 'help-carrinho-seletivo',
    key: 'carrinho-seletivo',
    moduleSlug: 'carrinho-seletivo',
    moduleName: 'Carrinho Seletivo & Checkout',
    title: 'Carrinho com Seleção Parcial e Salvar para Depois',
    summary: 'Como funciona a compra parcial sem perder os produtos não marcados no carrinho.',
    targetRoute: '/carrinho',
    relatedScreenUrl: '/carrinho',
    relatedScreenLabel: 'Abrir Carrinho Seletivo',
    menuLabel: 'Loja Pública → Carrinho Seletivo (/carrinho)',
    requiredRole: 'Público / Visitante / Cliente',
    steps: [
      'No carrinho (/carrinho), marque ou desmarque individualmente o checkbox de cada peça ou use "Selecionar todos".',
      'Observe que Subtotal, Desconto de Cupom, Frete, Desconto Pix e Total calculam EXCLUSIVAMENTE os itens marcados.',
      'Ao concluir o pedido no Checkout (/checkout), apenas as quantidades compradas saem do carrinho; os itens desmarcados permanecem intactos para compra futura.',
    ],
    practicalExample: 'Cliente tem 4 itens no carrinho, marca apenas 2 para pagar agora via Pix e mantém os outros 2 guardados no carrinho sem gerar pedido pendente duplicado.',
    commonMistakes: [
      'Desmarcar todos os itens: o botão "Comprar selecionados (0)" fica bloqueado e exibe aviso claro explicando que é necessário selecionar ao menos 1 produto.',
    ],
    keywords: ['carrinho', 'seleção parcial', 'comprar selecionados', 'salvar para depois', 'checkout'],
  },
  {
    id: 'help-precificador-3d',
    key: 'precificador-3d',
    moduleSlug: 'precificador',
    moduleName: 'Precificador 3D',
    title: 'Precificador e Simulador de Impressão 3D',
    summary: 'Cálculo exato de custo de filamento (g), suporte/purga, energia (kWh), depreciação, mão de obra, taxas e margem sobre o preço de venda.',
    targetRoute: '/admin/precificador',
    relatedScreenUrl: '/admin/precificador',
    relatedScreenLabel: 'Abrir Precificador 3D',
    menuLabel: 'Admin → Precificador 3D',
    requiredRole: 'admin_master | finance | operations',
    steps: [
      'Informe a massa da peça (g), massa de suporte/purga (g), tempo de impressão (min), custo do kg do filamento e consumo da impressora.',
      'Defina as taxas do canal (taxa percentual variável + tarifa fixa em R$) e a Margem Líquida Desejada sobre o preço final.',
      'O motor aplica Preço = (CustoTotal + TaxaFixa) / (1 - TaxaVariável - MargemDesejada), arredondando para cima no centavo.',
      'Clique em "Aplicar Preço ao Produto" para atualizar o catálogo e gravar log de auditoria.',
    ],
    practicalExample: 'Para Custo Total R$ 30,00, Taxa Fixa R$ 2,00, Taxa Variável 10% e Margem Desejada 25%: Preço = (30 + 2) / (1 - 0,10 - 0,25) = 32 / 0,65 = R$ 49,24.',
    commonMistakes: [
      'Somar markup simples sobre o custo em vez de dividir pelo fator (1 - taxas - margem), o que corrói a margem real após o desconto do gateway.',
      'Esquecer de incluir gramas de suporte/purga ou percentual de falha técnica.',
    ],
    keywords: ['precificador', 'preço', 'margem', 'filamento', 'energia', 'kwh', 'depreciação', '49,24'],
  },
  {
    id: 'help-estoque-insumos',
    key: 'estoque-insumos',
    moduleSlug: 'estoque',
    moduleName: 'Estoque & Insumos (g/kg)',
    title: 'Estoque Multi-Local e Conversão Automática kg → g',
    summary: 'Como registrar compras de bobinas em kg/rolos, controlar saldo em gramas e evitar tripla contagem contábil.',
    targetRoute: '/admin/estoque',
    relatedScreenUrl: '/admin/estoque',
    relatedScreenLabel: 'Abrir Estoque & Insumos',
    menuLabel: 'Admin → Estoque & Insumos',
    requiredRole: 'admin_master | operations',
    steps: [
      'Ao comprar filamentos ou resinas, use o formulário "Registrar Compra de Insumo" informando a quantidade em kg (ou rolos) e o valor total da nota.',
      'O sistema converte automaticamente 1 kg em +1.000 g no estoque e recalcula o custo médio por grama.',
      'A opção "Gerar Conta a Pagar" cria o lançamento financeiro na categoria de Entrada de Ativo/Estoque, evitando duplicar despesa quando o filamento for consumido na produção.',
    ],
    practicalExample: 'Compra de 2 bobinas de 1 kg de PLA Silk por R$ 250,00 adiciona +2.000 g ao saldo disponível e cria Conta a Pagar de R$ 250,00 vinculada à entrada de estoque.',
    commonMistakes: [
      'Lançar a compra da bobina como despesa operacional avulsa e depois lançar novamente o custo do filamento consumido no pedido.',
    ],
    keywords: ['estoque', 'filamento', 'gramas', 'quilos', 'bobina', 'conversão', '1000g', 'insumos'],
  },
  {
    id: 'help-producao-kanban',
    key: 'producao-kanban',
    moduleSlug: 'producao',
    moduleName: 'Produção / Kanban 3D',
    title: 'Kanban de Produção 3D, Consumo Real e Registro de Falhas',
    summary: 'Como operar a fila de impressão, dar baixa automática em gramas de filamento e registrar perdas/reimpressões.',
    targetRoute: '/admin/producao',
    relatedScreenUrl: '/admin/producao',
    relatedScreenLabel: 'Abrir Kanban 3D',
    menuLabel: 'Admin → Produção / Kanban 3D',
    requiredRole: 'admin_master | operations',
    steps: [
      'Cada pedido confirmado ou projeto sob medida gera um card no Kanban com impressora, cor, filamento e gramas planejadas.',
      'Avance o card pelas etapas: Aguardando Pagamento → Fila de Impressão → Em Impressão → Acabamento → Pronto p/ Envio → Enviado.',
      'Ao concluir a impressão, o sistema abate as gramas reais da bobina vinculada.',
      'Se ocorrer falha (ex: queda de energia ou descolamento da mesa), clique em "Registrar Falha/Perda" informando as gramas perdidas para abater do estoque e apurar o custo real.',
    ],
    practicalExample: 'Ordem consome 185 g na peça aprovada, mas teve 28 g perdidas por falha de aderência na primeira tentativa: ambas as baixas ficam auditadas no lote.',
    commonMistakes: [
      'Não registrar gramas perdidas em impressões abortadas, causando divergência entre o saldo do sistema e o peso real da bobina.',
    ],
    keywords: ['kanban', 'produção', 'impressão 3d', 'falha', 'refugo', 'perda', 'bambu lab', 'creality'],
  },
  {
    id: 'help-financeiro-dre',
    key: 'financeiro-dre',
    moduleSlug: 'financeiro',
    moduleName: 'Financeiro & DRE',
    title: 'Financeiro, Conciliação de Taxas e DRE por Competência vs. Caixa',
    summary: 'Como conciliar taxas cobradas pelos gateways (Mercado Pago/Pix/Cartão) e analisar o Resultado Gerencial (DRE).',
    targetRoute: '/admin/financeiro',
    relatedScreenUrl: '/admin/financeiro',
    relatedScreenLabel: 'Abrir Financeiro & DRE',
    menuLabel: 'Admin → Financeiro & DRE',
    requiredRole: 'admin_master | finance',
    steps: [
      'Acompanhe em "Contas a Receber e a Pagar" os títulos previstos, pagos e vencidos por conta bancária ou carteira de gateway.',
      'Na aba de Conciliação de Taxas, confira a Taxa Prevista vs. Taxa Efetivamente Cobrada pelo gateway; divergências geram alerta automático.',
      'No demonstrativo DRE, visualize Receita Bruta, Deduções/Taxas, Custo de Produção Consumido (CPV/CMV), Perdas de Impressão, Comissões e Lucro Líquido sem duplicar a compra do estoque.',
    ],
    practicalExample: 'Venda de R$ 217,32 no Cartão com taxa prevista de 4,49% (R$ 9,76): se o gateway descontar R$ 10,90, a conciliação destaca a divergência de R$ 1,14.',
    commonMistakes: [
      'Misturar Regime de Caixa (data do desembolso da bobina) com Regime de Competência (custo das gramas consumidas no pedido vendido).',
    ],
    keywords: ['financeiro', 'dre', 'conciliação', 'taxas', 'caixa', 'competência', 'contas a pagar', 'lucro'],
  },
  {
    id: 'help-inteligencia-comercial',
    key: 'inteligencia-comercial',
    moduleSlug: 'inteligencia',
    moduleName: 'Inteligência Comercial',
    title: 'Inteligência Comercial, Funil e Oportunidades Acionáveis',
    summary: 'Como identificar peças muito favoritadas ou abandonadas no carrinho e disparar ações comerciais.',
    targetRoute: '/admin/inteligencia',
    relatedScreenUrl: '/admin/inteligencia',
    relatedScreenLabel: 'Abrir Inteligência Comercial',
    menuLabel: 'Admin → Inteligência Comercial',
    requiredRole: 'admin_master | marketing',
    steps: [
      'Analise o Funil de Conversão: Visualizações → Favoritos → Adições ao Carrinho → Seleção no Carrinho → Pedidos Pagos.',
      'Verifique a matriz de "Diagnóstico Automático por Produto": itens com muitos favoritos e baixa compra sugerem ajuste de preço ou campanha.',
      'Use os botões de ação direta ("Simular no Precificador", "Criar Cupom" ou "Repor Estoque") para agir imediatamente.',
    ],
    practicalExample: 'O "Vaso Orgânico Espiral" recebeu muitos favoritos mas baixa conversão: o painel sugere simular redução de 8% no Precificador ou criar promoção relâmpago.',
    commonMistakes: [
      'Criar cupom agressivo sem antes simular no Precificador se a margem líquida continuará positiva.',
    ],
    keywords: ['inteligência', 'funil', 'favoritos', 'abandono', 'oportunidades', 'conversão'],
  },
  {
    id: 'help-parceiros-consignacao',
    key: 'parceiros-consignacao',
    moduleSlug: 'parceiros',
    moduleName: 'Parceiros & Consignação',
    title: 'Parceiros, Cupons de Afiliados e Estoque em Consignação/Comodato',
    summary: 'Como gerenciar lojas parceiras, arquitetos afiliados e acerto de peças deixadas em exposição física.',
    targetRoute: '/admin/parceiros',
    relatedScreenUrl: '/admin/parceiros',
    relatedScreenLabel: 'Abrir Parceiros & Consignação',
    menuLabel: 'Admin → Parceiros & Consignação',
    requiredRole: 'admin_master | operations | finance',
    steps: [
      'Cadastre o parceiro com percentual de comissão, código de cupom vinculado e local de estoque consignado.',
      'Acompanhe as comissões geradas automaticamente a cada pedido pago com cupom ou link do parceiro.',
      'Nas remessas consignadas, registre quantidades enviadas, vendidas e devolvidas para gerar o acerto financeiro exato.',
    ],
    practicalExample: 'O cupom PARCEIRO10 concede 5% de desconto ao cliente final e credita 15% de comissão sobre o valor líquido da venda para a parceira.',
    commonMistakes: [
      'Liberar pagamento de comissão sobre pedido cujo pagamento ainda está pendente ou foi estornado.',
    ],
    keywords: ['parceiros', 'comissão', 'afiliado', 'cupom', 'consignação', 'comodato'],
  },
  {
    id: 'help-marketing-banners',
    key: 'marketing-banners',
    moduleSlug: 'marketing',
    moduleName: 'Marketing & Banners',
    title: 'Banners Responsivos Desktop (16:6) & Mobile (4:5) e Promoções',
    summary: 'Como configurar ponto focal X/Y, enquadramento desktop/mobile independente e trava de margem mínima.',
    targetRoute: '/admin/marketing',
    relatedScreenUrl: '/admin/marketing',
    relatedScreenLabel: 'Abrir Marketing & Banners',
    menuLabel: 'Admin → Marketing & Promoções',
    requiredRole: 'admin_master | marketing',
    steps: [
      'No editor de Banners, configure imagens e enquadramentos independentes para Desktop (16:6) e Mobile (4:5), ajustando o ponto focal X/Y.',
      'Ao criar uma Promoção ou Cupom, verifique a Trava de Margem Mínima para garantir que o desconto não gere margem negativa.',
      'Em /admin/instagram, vincule posts reais do perfil @rbscriacao aos produtos do catálogo e copie a URL do Feed de Catálogo Meta.',
    ],
    practicalExample: 'O cupom BEMVINDO10 (10% OFF) é validado contra a trava de margem mínima de 18% antes de ser ativado.',
    commonMistakes: [
      'Usar banner com texto pequeno nas bordas sem testar o corte vertical do celular.',
    ],
    keywords: ['marketing', 'banners', 'promoções', 'cupom', 'instagram', 'meta', 'pixel'],
  },
  {
    id: 'help-instagram-meta',
    key: 'instagram-meta',
    moduleSlug: 'instagram',
    moduleName: 'Instagram @rbscriacao & Meta CAPI',
    title: 'Feed Comprável @rbscriacao, Sacolinha XML e Meta CAPI',
    summary: 'Como marcar produtos 3D nos posts do Instagram e sincronizar o catálogo XML/JSON com o Meta Commerce Manager.',
    targetRoute: '/admin/instagram',
    relatedScreenUrl: '/admin/instagram',
    relatedScreenLabel: 'Abrir Instagram @rbscriacao',
    menuLabel: 'Admin → Instagram @rbscriacao',
    requiredRole: 'admin_master | marketing',
    steps: [
      'Copie a URL do Feed XML (/api/catalog/meta?format=xml) e cadastre no Meta Commerce Manager como Lista Programada.',
      'Vincule os SKUs 3D às fotos do perfil @rbscriacao para que apareçam na vitrine /instagram com compra em 1 clique.',
      'Verifique a chave de deduplicação meta_event_id entre navegador (Pixel) e servidor (Conversions API).',
    ],
    practicalExample: 'Um seguidor vê o Vaso Voronoi no @rbscriacao, abre /instagram e adiciona a peça na cor Terracota direto ao carrinho.',
    commonMistakes: [
      'Marcar produto sem estoque disponível sem ativar a modalidade Sob Encomenda.',
    ],
    keywords: ['instagram', 'sacolinha', 'meta', 'xml', 'capi', 'pixel', 'rbscriacao'],
  },
  {
    id: 'help-orcamentos-3d',
    key: 'orcamentos-3d',
    moduleSlug: 'orcamentos',
    moduleName: 'Orçamentos Sob Medida',
    title: 'Análise Técnica de Arquivos 3D (.STL, .STEP, .3MF) e Propostas',
    summary: 'Como avaliar geometria, definir gramas e horas de máquina e enviar link de aprovação para projetos personalizados.',
    targetRoute: '/admin/orcamentos',
    relatedScreenUrl: '/admin/orcamentos',
    relatedScreenLabel: 'Abrir Orçamentos Sob Medida',
    menuLabel: 'Admin → Orçamentos Sob Medida',
    requiredRole: 'admin_master | operations',
    steps: [
      'Confira o arquivo anexado pelo cliente (.STL, .STEP, .OBJ, .3MF), o hash SHA-256 de integridade e os requisitos mecânicos/térmicos.',
      'Fatie a peça no slicer (Bambu Studio / OrcaSlicer) para obter as gramas exatas e o tempo de máquina.',
      'Preencha o valor e prazo da proposta para liberar o pagamento e enviar o item aprovado direto ao Kanban 3D.',
    ],
    practicalExample: 'Lote de 15 suportes técnicos em PETG Preto: fatiado em 85 g/peça, proposta enviada a R$ 48,00/un com prazo de 4 dias úteis.',
    commonMistakes: [
      'Aprovar peça mecânica exposta ao sol em PLA comum em vez de recomendar PETG ou ASA.',
    ],
    keywords: ['orçamentos', 'stl', 'step', 'personalizados', 'b2b', 'fatiamento'],
  },
  {
    id: 'help-pedidos-expedicao',
    key: 'pedidos-expedicao',
    moduleSlug: 'pedidos',
    moduleName: 'Pedidos & Expedição',
    title: 'Gestão de Pedidos com 3 Estados Independentes (Pagamento, Produção e Logística)',
    summary: 'Como acompanhar cada pedido separando aprovação financeira, fila de impressão 3D e rastreio de entrega.',
    targetRoute: '/admin/pedidos',
    relatedScreenUrl: '/admin/pedidos',
    relatedScreenLabel: 'Abrir Pedidos & Expedição',
    menuLabel: 'Admin → Pedidos & Expedição',
    requiredRole: 'admin_master | operations | finance',
    steps: [
      'Verifique a coluna Status Pagamento antes de liberar peças sob encomenda para impressão.',
      'Acompanhe o Prazo de Fabricação separado do Prazo de Transporte prometido ao cliente no checkout.',
      'Assim que o Kanban marcar o pedido como Pronto para Embalar, gere a etiqueta e informe o código de rastreio.',
    ],
    practicalExample: 'Pedido RBS-2026-1002: Pagamento Pago (Pix) → Produção Em Impressão (Bambu P1S) → Expedição Aguardando Embalagem.',
    commonMistakes: [
      'Despachar peça recém-impressa sem aguardar cura/limpeza de suportes na etapa de pós-processamento.',
    ],
    keywords: ['pedidos', 'expedição', 'rastreio', 'frete', 'status', 'logística'],
  },
  {
    id: 'help-catalogo-produtos',
    key: 'catalogo-produtos',
    moduleSlug: 'produtos',
    moduleName: 'Produtos & Catálogo 3D',
    title: 'Cadastro de Produtos 3D, Macro 8x de Camadas e Modelo .GLB',
    summary: 'Como cadastrar especificações técnicas de manufatura aditiva (gramas, tempo, altura de camada) e mídias.',
    targetRoute: '/admin/produtos',
    relatedScreenUrl: '/admin/produtos',
    relatedScreenLabel: 'Abrir Produtos & Catálogo',
    menuLabel: 'Admin → Produtos & Catálogo',
    requiredRole: 'admin_master | operations | marketing',
    steps: [
      'Cadastre o peso líquido em gramas, gramas de suporte, tempo de impressão em minutos e altura de camada (ex: 0.16mm).',
      'Escolha a modalidade: Pronta Entrega, Produção Sob Encomenda (informando dias úteis de fabricação) ou Personalizado.',
      'Associe foto de estúdio, foto macro 8x da textura das camadas, foto de escala com medidas e arquivo 3D .GLB.',
    ],
    practicalExample: 'Vaso Voronoi cadastrado com 185 g + 10 g purga, 260 min de máquina, camada 0.16mm e visualizador 3D .GLB ativo.',
    commonMistakes: [
      'Cadastrar produto Sob Encomenda com 0 dias de fabricação, prometendo envio imediato irreal.',
    ],
    keywords: ['produtos', 'catálogo', 'glb', '3d', 'macro', 'camada', 'sku'],
  },
  {
    id: 'help-integracoes-seguranca',
    key: 'integracoes-seguranca',
    moduleSlug: 'integracoes',
    moduleName: 'Integrações, RBAC & Auditoria',
    title: 'Webhooks, Fila Assíncrona (Outbox), Perfis RBAC e Auditoria',
    summary: 'Como inspecionar integrações externas, fila de eventos assíncronos e trilha imutável de auditoria.',
    targetRoute: '/admin/integracoes',
    relatedScreenUrl: '/admin/integracoes',
    relatedScreenLabel: 'Abrir Integrações & Auditoria',
    menuLabel: 'Admin → Integrações & Auditoria',
    requiredRole: 'admin_master',
    steps: [
      'Verifique o status operacional de Mercado Pago, Melhor Envio, ViaCEP, Meta CAPI e PostgreSQL.',
      'Consulte a fila async_jobs para auditar webhooks e notificações processadas sem bloquear o checkout.',
      'Na Trilha de Auditoria (audit_logs), confira quem alterou preços, estoques ou conciliações com o JSON Antes → Depois.',
    ],
    practicalExample: 'Toda alteração de preço feita pelo Precificador grava automaticamente o preço anterior e o novo preço em audit_logs.',
    commonMistakes: [
      'Compartilhar a conta admin_master com toda a equipe em vez de usar os perfis específicos (operations, finance, marketing).',
    ],
    keywords: ['integrações', 'webhooks', 'auditoria', 'rbac', 'segurança', 'logs'],
  },
];

// Dictionary alias so both HELP_ARTICLES["key"] and HELP_ARTICLES.find(...) work seamlessly
export const HELP_ARTICLES: Record<string, HelpArticle> & HelpArticle[] = Object.assign(
  [...HELP_ARTICLES_LIST],
  Object.fromEntries(
    HELP_ARTICLES_LIST.flatMap((a) => [
      [a.key, a],
      [a.moduleSlug, a],
      [a.id, a],
    ])
  )
) as any;

export function getHelpArticleByModule(moduleSlug: string): HelpArticle {
  return (
    HELP_ARTICLES_LIST.find((a) => a.moduleSlug === moduleSlug || a.key === moduleSlug || a.id === moduleSlug) ||
    HELP_ARTICLES_LIST[0]
  );
}
