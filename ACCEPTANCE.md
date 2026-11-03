# Relatório de Aceite e Homologação (`ACCEPTANCE.md`)

## 1. Resultados da Suíte Automatizada de Testes Ponta a Ponta

Comando executado:
```bash
npx tsx --test src/tests/platform-journey.test.ts
```

Todos os 4 cenários críticos passaram com 100% de precisão matemática e transacional:
1. **`ok 1` — Benchmark Matemático do Precificador 3D (`R$ 49,24`)**:
   - Entrada: Custo `R$ 30,00`, Taxa fixa `R$ 2,00`, Taxa variável `10%`, Margem alvo sobre o preço de venda `25%`.
   - Fórmula: `(30 + 2) / (1 - 0,10 - 0,25) = 32 / 0,65 = 49,2307...` -> Arredondado para cima ao centavo: **`R$ 49,24`** (`4924` centavos).
2. **`ok 2` — Trava de Segurança de Soma Impossível (`Taxa Variável + Margem >= 100%`)**:
   - Rejeita configurações inválidas onde `variableFeePct + targetMarginPct >= 100%`, impedindo divisão por zero ou preço negativo.
3. **`ok 3` — Jornada Integrada Completa (Compra de Insumo `kg -> g` → Carrinho Seletivo → Kanban com Perda e Conclusão → Conciliação de Taxa → DRE)**:
   - Compra de `1 kg` de filamento adiciona `+1.000 g` ao saldo físico e gera título a pagar (`inventory_asset_purchase`) sem distorcer a DRE como despesa imediata.
   - Adição de 4 itens ao carrinho, desmarcação de 2 itens e finalização de compra contendo exclusivamente os 2 selecionados, preservando os 2 não-selecionados intactos no carrinho.
   - Registro de falha de impressão (`35 g` perdidos) + conclusão de lote (`215 g` consumidos) reduz exatamente `250 g` do estoque físico de filamento e registra `cogs_supply_consumed` + `waste_loss_expense` na DRE.
   - Conciliação de taxa do gateway com divergência de `+R$ 0,30` ajusta automaticamente a dedução da DRE e a entrada líquida prevista no caixa.
4. **`ok 4` — Bloqueio de Concorrência na Última Unidade em Estoque**:
   - Quando restam apenas `1` unidade física e dois clientes tentam comprar simultaneamente, a primeira transação confirma o pedido e a segunda é bloqueada com erro explícito de estoque insuficiente.

---

## 2. Mapa de Navegação, Percurso de Cliques, URLs Reais e Perfis RBAC

### 2.1 Painel Administrativo (`/admin`)

| Nome Visível no Menu | Percurso de Cliques | URL Real de Homologação | Perfil RBAC Necessário |
|---|---|---|---|
| **Visão Geral** | Menu Lateral → Visão Geral | `http://localhost:3000/admin` | `admin_master`, `operations`, `finance`, `marketing` |
| **Inteligência Comercial** | Menu Lateral → Inteligência Comercial | `http://localhost:3000/admin/inteligencia` | `admin_master`, `marketing` |
| **Financeiro & DRE** | Menu Lateral → Financeiro & DRE | `http://localhost:3000/admin/financeiro` | `admin_master`, `finance` |
| **Estoque & Insumos (g/kg)** | Menu Lateral → Estoque & Insumos (g/kg) | `http://localhost:3000/admin/estoque` | `admin_master`, `operations` |
| **Precificador 3D** | Menu Lateral → Precificador 3D | `http://localhost:3000/admin/precificador` | `admin_master`, `finance`, `operations` |
| **Produção / Kanban 3D** | Menu Lateral → Produção / Kanban 3D | `http://localhost:3000/admin/producao` | `admin_master`, `operations` |
| **Pedidos & Expedição** | Menu Lateral → Pedidos & Expedição | `http://localhost:3000/admin/pedidos` | `admin_master`, `operations`, `finance` |
| **Orçamentos Sob Medida** | Menu Lateral → Orçamentos Sob Medida | `http://localhost:3000/admin/orcamentos` | `admin_master`, `operations` |
| **Produtos & Catálogo** | Menu Lateral → Produtos & Catálogo | `http://localhost:3000/admin/produtos` | `admin_master`, `operations`, `marketing` |
| **Parceiros & Consignação** | Menu Lateral → Parceiros & Consignação | `http://localhost:3000/admin/parceiros` | `admin_master`, `operations`, `finance` |
| **Marketing & Promoções** | Menu Lateral → Marketing & Promoções | `http://localhost:3000/admin/marketing` | `admin_master`, `marketing` |
| **Instagram @rbscriacao** | Menu Lateral → Instagram @rbscriacao | `http://localhost:3000/admin/instagram` | `admin_master`, `marketing` |
| **Clientes & LGPD** | Menu Lateral → Clientes & LGPD | `http://localhost:3000/admin/clientes` | `admin_master`, `marketing`, `operations` |
| **Integrações & Auditoria** | Menu Lateral → Integrações & Auditoria | `http://localhost:3000/admin/integracoes` | `admin_master` |
| **Central de Ajuda** | Menu Lateral → Central de Ajuda (ou botão `? Como funciona?`) | `http://localhost:3000/admin/ajuda` | Todos os perfis administrativos |

### 2.2 Credenciais de Homologação (Acesso em `/login`)

| Perfil RBAC | E-mail | Senha Padrão de Homologação | Escopo de Acesso |
|---|---|---|---|
| **Administrador Master (Rodrigo)** | `rodrigorbes@gmail.com` | `Admin@RBS2026!` | Acesso irrestrito a todos os módulos administrativos |
| **Administrador Master (Rachel)** | `dra.rachelbeatriz@gmail.com` | `Admin@RBS2026!` | Acesso irrestrito a todos os módulos administrativos |
| **Administrador Master (Sistema)** | `admin@rbscriacao.com` | `Admin@RBS2026!` | Acesso irrestrito a todos os módulos administrativos |
| **Operações & Fábrica 3D** | `operacao@rbscriacao.com` | `RbsOperacao2026!` | Kanban 3D, Estoque (`kg -> g`), Pedidos, Orçamentos e Catálogo |
| **Financeiro & DRE** | `financeiro@rbscriacao.com` | `RbsFinanceiro2026!` | Contas a Pagar/Receber, Conciliação MDR, DRE e Precificador |
| **Marketing & Social** | `marketing@rbscriacao.com` | `RbsMarketing2026!` | Inteligência Comercial, Promoções, Banners e Instagram `@rbscriacao` |
| **Parceiro Consignado** | `parceiro@estudioverde.com.br` | `RbsParceiro2026!` | Portal do Parceiro (`/parceiros`), cupom de afiliado e lote consignado |
| **Cliente Final** | `mariana.costa@exemplo.com` | `Cliente2026!` | Minha Conta (`/minha-conta`), Favoritos (`/favoritos`) e Pedidos |
