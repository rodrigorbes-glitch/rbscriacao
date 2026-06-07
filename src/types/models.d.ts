// Interfaces TypeScript baseadas na modelagem do banco de dados (Prompt 2 + Clientes)

export interface Produto {
  id?: string;
  nome: string;
  descricao?: string;
  custo_aquisicao: number;
  preco_venda_sugerido: number;
  estoque_central: number;
  foto_url: string;
  fotos_adicionais?: string[]; // Arrays para até 6 fotos a mais
  video_url?: string; // Link para YouTube ou vídeo MP4/Drive
  categoria: string;
  destaque?: boolean;
  dimensoes?: {
    peso: number; // em kg
    altura: number; // em cm
    largura: number; // em cm
    comprimento: number; // em cm
  };
  createdAt?: number;
  updatedAt?: number;
}

export interface Distribuidor {
  id?: string;
  nome_loja: string;
  responsavel: string;
  endereco: string;
  telefone: string;
  percentual_comissao: number;
  status: 'ativo' | 'inativo';
  createdAt?: number;
  updatedAt?: number;
}

export interface Cliente {
  id?: string;
  user_id?: string; // UID do Firebase Auth
  tipo?: 'b2c' | 'b2b_pendente' | 'b2b_aprovado';
  nome: string;
  telefone: string;
  email?: string;
  endereco?: string;
  cpf_cnpj?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Consignacao {
  id?: string;
  id_distribuidor: string;
  data_entrega: number;
  data_retorno_prevista: number;
  produtos_deixados: Array<{ id_produto: string; quantidade: number }>;
  status: 'pendente' | 'concluida' | 'cancelada';
  createdAt?: number;
  updatedAt?: number;
}

export interface Transacao {
  id?: string;
  tipo: 'venda_direta' | 'venda_consignada' | 'devolucao' | 'despesa';
  valor_total: number;
  lucro_estimado: number;
  data: number;
  referencia: string; // Ex: ID do Distribuidor, Cliente ou Pedido
  categoria?: string; // Ex: Aluguel, Impostos, Material
  excluida?: boolean; // Para manter o rastro (soft delete)
  createdAt?: number;
  updatedAt?: number;
}

export interface Alerta {
  id?: string;
  tipo: 'estoque_baixo' | 'recolhimento_vencido' | 'sistema';
  mensagem: string;
  link_acao?: string;
  lido: boolean;
  createdAt?: number;
}

export interface Configuracao {
  id?: string;
  nome_loja: string;
  telefone_publico: string;
  mensagem_rodape: string;
  cep_origem?: string;
  instagram?: string;
  banner_titulo?: string;
  banner_subtitulo?: string;
  banner_alinhamento_horizontal?: 'flex-start' | 'center' | 'flex-end';
  banner_alinhamento_vertical?: 'flex-start' | 'center' | 'flex-end';
  banner_imagem_posicao?: 'top' | 'center' | 'bottom';
  createdAt?: number;
  updatedAt?: number;
}

export interface Pedido {
  id?: string;
  user_id?: string; // Para ligar o pedido ao usuário logado
  cliente_nome: string;
  cliente_email?: string;
  cliente_whatsapp: string;
  cliente_endereco: string;
  itens: Array<{
    id_produto: string;
    nome: string;
    quantidade: number;
    preco_unitario: number;
  }>;
  subtotal: number;
  frete_valor?: number;
  frete_transportadora?: string;
  prazo_estimado?: number;
  valor_total?: number;
  transacao_id?: string; // ID da transação no Mercado Pago
  status: 'pendente' | 'pago' | 'confirmado' | 'enviado' | 'entregue' | 'cancelado' | 'rejeitado';
  createdAt?: number;
  updatedAt?: number;
}
