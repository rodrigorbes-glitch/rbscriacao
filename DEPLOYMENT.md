# Guia de Implantação, Migração e Rollback (`DEPLOYMENT.md`)

## 1. Topologia Recomendada de Produção (`rbscriacao.com`)

A aplicação `rbscriacao-v3` pode ser publicada em duas topologias compatíveis com os ativos contratados da RBS Criação:

### Opção A (Recomendada para Performance Global + Banco Gerenciado)
- **Aplicação Next.js 16 Full-Stack**: Hostinger Node.js Web App (Business Plan) ou Vercel conectada ao repositório GitHub da RBS Criação.
- **Banco de Dados PostgreSQL**: Instância PostgreSQL gerenciada (Supabase / Neon / Hostinger VPS PostgreSQL) conectada via variável de ambiente `DATABASE_URL`.
- **DNS e Proxy**: Domínio `rbscriacao.com` gerenciado na Hostinger / Cloudflare com SSL/TLS estrito e cache de ativos estáticos (`/models/*.glb`, `/products/*.svg`).

### Opção B (Auto-Contida em Servidor Node.js com Persistência Local)
- Se `DATABASE_URL` não for definida, o adaptador `src/db/index.ts` inicializa automaticamente o motor PostgreSQL embarcado persistente (`@electric-sql/pglite`) no volume local `.pgdata/rbs-v3-pg`, aplicando `001_initial_schema.sql` na primeira partida.

---

## 2. Variáveis de Ambiente (`.env.production`)

Crie o arquivo `.env.production` (ou configure no painel de variáveis do servidor) **sem expor chaves no repositório Git**:

```ini
# URL pública oficial
NEXT_PUBLIC_SITE_URL="https://www.rbscriacao.com"
NODE_ENV="production"

# Banco de Dados PostgreSQL de Produção
DATABASE_URL="postgresql://usuario:senha@host-postgres:5432/rbscriacao_prod?sslmode=require"

# Gateway de Pagamento (Mercado Pago)
MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
MERCADOPAGO_PUBLIC_KEY="APP_USR-..."
MERCADOPAGO_WEBHOOK_SECRET="segredo-assinatura-webhook"

# Logística e Frete (Melhor Envio / Correios)
MELHORENVIO_TOKEN="seu-token-melhor-envio"
ORIGIN_CEP="01310-100"

# Social Commerce Meta (@rbscriacao)
META_PIXEL_ID="seu-pixel-id"
META_CAPI_ACCESS_TOKEN="seu-token-capi"

# E-mail Transacional (Resend / SMTP Hostinger)
RESEND_API_KEY="re_..."
EMAIL_FROM="RBS Criação <contato@rbscriacao.com>"
```

---

## 3. Comandos Separados de Build, Migração e Execução

No ambiente de homologação e produção da Hostinger:

```bash
# 1. Instalar dependências exatas
npm ci

# 2. Executar migrações isoladas no banco de dados (PostgreSQL/PGlite)
npm run db:migrate

# 3. Executar a suíte de testes de prontidão (19 testes automatizados)
npm test

# 4. Compilar o bundle otimizado de produção (Next.js 16)
npm run build

# 5. Iniciar o servidor de produção
npm run start
```

---

## 4. Plano de Cutover (Virada de Chave Segura) e Rollback Instantâneo

> **IMPORTANTE**: A substituição do domínio público `https://www.rbscriacao.com` só deve ocorrer após validação e autorização explícita do proprietário.

1. **Pré-Virada (Homologação)**:
   - Validar o painel `/admin`, precificador, checkout seletivo e feed `/api/catalog/meta?format=xml` no endereço de homologação.
   - Cadastrar o Webhook do Mercado Pago apontando para `https://www.rbscriacao.com/api/checkout`.
2. **Virada (Cutover)**:
   - Apontar o registro `A` / `CNAME` de `rbscriacao.com` e `www.rbscriacao.com` para o serviço `rbscriacao-v3`.
3. **Plano de Rollback (< 2 minutos)**:
   - Os diretórios anteriores (`20260524-LOJA` e `rbscriacao-v2`) permanecem intactos e preservados fora de `rbscriacao-v3`.
   - Caso seja necessário reverter imediatamente, basta restaurar o apontamento DNS/repositório para a release anterior sem perda de nenhum dado histórico.
