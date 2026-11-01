# Registro de Componentes Substituídos e Ativos Reaproveitados (`REMOVED_OR_REPLACED.md`)

Em conformidade com as diretrizes de segurança e preservação de dados, **nenhum arquivo dos projetos anteriores (`20260524-LOJA` e `rbscriacao-v2`) foi excluído**. Ambos permanecem preservados em suas pastas originais como backup imediato.

Abaixo está o registro técnico do que foi **reaproveitado** e do que foi **substituído** na nova arquitetura `rbscriacao-v3`:

## 1. Ativos Reaproveitados e Preservados
| Ativo | Origem | Destino em `rbscriacao-v3` | Motivo |
|---|---|---|---|
| **Logo Oficial RBS Criação** | `20260524-LOJA/public/logo_rbs.png` | `rbscriacao-v3/public/logo_rbs.png` | Identidade oficial da marca preservada no cabeçalho, rodapé e documentos |
| **Banner Institucional e Ícones PWA** | `20260524-LOJA/public/1_Banner_Vermelho.png` & `public/icons/*` | `rbscriacao-v3/public/1_Banner_Vermelho.png` & `public/icons/*` | Reaproveitados com suporte a recorte responsivo Desktop `16:6` e Mobile `4:5` |
| **Catálogo Base de Impressão 3D e Regras de Consignação** | `20260524-LOJA/src/pages/*` | `rbscriacao-v3/src/db/seed.ts` | Expandido com variações técnicas (PLA Silk, PETG, TPU), tempos de máquina, gramaturas e fotos de macro 8x |

---

## 2. Componentes e Tecnologias Substituídos na `rbscriacao-v3`
| Componente Anterior | Onde Estava | Substituído Por (`rbscriacao-v3`) | Justificativa Técnica e Operacional |
|---|---|---|---|
| **WordPress 6.9 + WooCommerce (`rbscriacao-v2`)** | `C:\Users\RodrigoC\Documents\IA IDEIAS\rbscriacao-v2` | Aplicação própria em **Next.js 16 (App Router) + TypeScript + PostgreSQL (`rbscriacao-v3`)** | Mandato explícito do projeto: eliminar dependência de WordPress/WooCommerce, corrigir lentidão, eliminar telas genéricas ("My Account" em inglês) e garantir UX de agência sob medida |
| **Coleções NoSQL Soltas no Firestore (`20260524-LOJA`)** | `20260524-LOJA/src/lib/firebase.ts` | Esquema relacional PostgreSQL versionado (`001_initial_schema.sql` com 28 tabelas ACID) | Impedir inconsistência financeira, garantir integridade referencial entre estoque em gramas, Kanban, pedidos e DRE, e bloquear venda duplicada da última unidade em estoque |
| **Carrinho Tradicional Tudo-ou-Nada** | `20260524-LOJA` | **Carrinho com Seleção Parcial Real (`src/lib/cart-checkout.ts`)** | Permitir ao cliente selecionar individualmente quais peças deseja comprar agora, preservando os itens desmarcados no carrinho |
| **Cálculo Simplista de Preço por Markup** | Planilhas / `20260524-LOJA` | **Motor de Precificação 3D (`src/lib/pricing.ts`)** | Calcular a margem líquida real sobre o preço de venda final considerando filamento em gramas, energia kWh, depreciação, falha, pós-processamento, embalagem e taxas do gateway (`R$ 49,24`) |
| **Caixa Único sem Separação de Competência** | `20260524-LOJA/src/pages/admin/Finances.tsx` | **Razão Contábil Duplo Regime (`src/lib/operations.ts`)** | Separar compra de ativo (`inventory_asset_purchase`), consumo de gramas no Kanban (`cogs_supply_consumed`), perda por falha (`waste_loss_expense`) e conciliação de taxa MDR (`fee_reconciliations`) |
