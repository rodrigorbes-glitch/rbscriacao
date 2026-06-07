import { createDocument, getDocuments, getDocumentById, updateDocument, deleteDocument } from './db';
import { Produto, Distribuidor, Cliente, Consignacao, Transacao, Alerta, Configuracao, Pedido } from '@/types/models';
import { where } from 'firebase/firestore';

// =======================
// PRODUTOS
// =======================
const PRODUTOS_COLL = 'produtos';

export const produtosAPI = {
  create: (data: Omit<Produto, 'id'>) => createDocument<Omit<Produto, 'id'>>(PRODUTOS_COLL, data),
  getAll: () => getDocuments<Produto>(PRODUTOS_COLL),
  getById: (id: string) => getDocumentById<Produto>(PRODUTOS_COLL, id),
  update: (id: string, data: Partial<Produto>) => updateDocument<Produto>(PRODUTOS_COLL, id, data),
  delete: (id: string) => deleteDocument(PRODUTOS_COLL, id),
};

// =======================
// DISTRIBUIDORES
// =======================
const DISTRIBUIDORES_COLL = 'distribuidores';

export const distribuidoresAPI = {
  create: (data: Omit<Distribuidor, 'id'>) => createDocument<Omit<Distribuidor, 'id'>>(DISTRIBUIDORES_COLL, data),
  getAll: () => getDocuments<Distribuidor>(DISTRIBUIDORES_COLL),
  getById: (id: string) => getDocumentById<Distribuidor>(DISTRIBUIDORES_COLL, id),
  update: (id: string, data: Partial<Distribuidor>) => updateDocument<Distribuidor>(DISTRIBUIDORES_COLL, id, data),
  delete: (id: string) => deleteDocument(DISTRIBUIDORES_COLL, id),
};

// =======================
// CLIENTES (Varejo)
// =======================
const CLIENTES_COLL = 'clientes';

export const clientesAPI = {
  create: (data: Omit<Cliente, 'id'>) => createDocument<Omit<Cliente, 'id'>>(CLIENTES_COLL, data),
  getAll: () => getDocuments<Cliente>(CLIENTES_COLL),
  getByUserId: (userId: string) => getDocuments<Cliente>(CLIENTES_COLL, [where('user_id', '==', userId)]),
  getById: (id: string) => getDocumentById<Cliente>(CLIENTES_COLL, id),
  update: (id: string, data: Partial<Cliente>) => updateDocument<Cliente>(CLIENTES_COLL, id, data),
  delete: (id: string) => deleteDocument(CLIENTES_COLL, id),
};

// =======================
// CONSIGNACOES
// =======================
const CONSIGNACOES_COLL = 'consignacoes';

export const consignacoesAPI = {
  create: (data: Omit<Consignacao, 'id'>) => createDocument<Omit<Consignacao, 'id'>>(CONSIGNACOES_COLL, data),
  getAll: () => getDocuments<Consignacao>(CONSIGNACOES_COLL),
  getById: (id: string) => getDocumentById<Consignacao>(CONSIGNACOES_COLL, id),
  update: (id: string, data: Partial<Consignacao>) => updateDocument<Consignacao>(CONSIGNACOES_COLL, id, data),
  delete: (id: string) => deleteDocument(CONSIGNACOES_COLL, id),
};

// =======================
// PEDIDOS B2C (LOJA ONLINE)
// =======================
const PEDIDOS_COLL = 'pedidos';

export const pedidosAPI = {
  getAll: () => getDocuments<Pedido>(PEDIDOS_COLL),
  getByUserId: (userId: string) => getDocuments<Pedido>(PEDIDOS_COLL, [where('user_id', '==', userId)]),
  getById: (id: string) => getDocumentById<Pedido>(PEDIDOS_COLL, id),
  create: (data: Omit<Pedido, 'id'>) => createDocument<Omit<Pedido, 'id'>>(PEDIDOS_COLL, data),
  update: (id: string, data: Partial<Pedido>) => updateDocument(PEDIDOS_COLL, id, data),
  delete: (id: string) => deleteDocument(PEDIDOS_COLL, id),
};

// =======================
// TRANSAÇÕES (PEDIDOS)
// =======================
const TRANSACOES_COLL = 'transacoes';

export const transacoesAPI = {
  getAll: () => getDocuments<Transacao>(TRANSACOES_COLL),
  getById: (id: string) => getDocumentById<Transacao>(TRANSACOES_COLL, id),
  create: async (data: Omit<Transacao, 'id'>) => {
    // Registra a transação com data atual
    const transacaoComData = {
      ...data,
      data_transacao: Date.now()
    };
    return await createDocument<Omit<Transacao, 'id'>>(TRANSACOES_COLL, transacaoComData);
  },
  update: (id: string, data: Partial<Transacao>) => updateDocument(TRANSACOES_COLL, id, data),
  delete: (id: string) => deleteDocument(TRANSACOES_COLL, id),
};

const CONFIGURACOES_COLL = 'configuracoes';

// Singleton configuration (we only ever need one document, so we can use a hardcoded ID or just get the first one)
export const configuracoesAPI = {
  getGeral: async () => {
    const docs = await getDocuments<Configuracao>(CONFIGURACOES_COLL);
    if (docs.length > 0) return docs[0];
    return null;
  },
  saveGeral: async (data: Omit<Configuracao, 'id'>, existingId?: string) => {
    if (existingId) {
      await updateDocument(CONFIGURACOES_COLL, existingId, data);
      return existingId;
    } else {
      return await createDocument<Omit<Configuracao, 'id'>>(CONFIGURACOES_COLL, data);
    }
  }
};

// =======================
// ALERTAS
// =======================
const ALERTAS_COLL = 'alertas';

export const alertasAPI = {
  create: (data: Omit<Alerta, 'id'>) => createDocument<Omit<Alerta, 'id'>>(ALERTAS_COLL, data),
  getAll: () => getDocuments<Alerta>(ALERTAS_COLL),
  getById: (id: string) => getDocumentById<Alerta>(ALERTAS_COLL, id),
  update: (id: string, data: Partial<Alerta>) => updateDocument<Alerta>(ALERTAS_COLL, id, data),
  delete: (id: string) => deleteDocument(ALERTAS_COLL, id),
};
