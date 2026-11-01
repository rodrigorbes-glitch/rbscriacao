# Validações Externas Pendentes para Virada em Produção (`PENDING_EXTERNAL.md`)

Todos os fluxos de código, banco de dados relacional, precificador, estoque `kg -> g`, Kanban 3D, carrinho seletivo, checkout de visitante, conciliação financeira e feed XML/JSON para Meta Commerce estão **100% implementados e funcionais em homologação**.

Para a virada definitiva no domínio público `https://www.rbscriacao.com`, apenas as seguintes chaves e ativações externas dependem de ação do proprietário nas contas oficiais da empresa:

1. **Chaves de Produção do Gateway de Pagamento (`MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`)**:
   - **Situação atual**: Operando em modo de homologação seguro para evitar cobranças reais durante testes.
   - **Ação para produção**: Inserir o token `APP_USR-...` de produção do Mercado Pago e apontar a URL de Webhook para `https://www.rbscriacao.com/api/checkout`.
2. **Token de Produção de Logística (`MELHORENVIO_TOKEN`)**:
   - **Situação atual**: Cálculo de frete (PAC, SEDEX e Retirada no Estúdio) operando com tabela de cubagem 3D e separação entre prazo de fabricação e prazo da transportadora.
   - **Ação para produção**: Inserir o token de produção do Melhor Envio/Correios para geração de etiquetas PLP reais.
3. **Conexão do Feed XML no Meta Commerce Manager (`@rbscriacao`)**:
   - **Situação atual**: O endpoint `/api/catalog/meta?format=xml` já gera o feed RSS 2.0 completo em tempo real.
   - **Ação para produção**: No painel **Meta Business Suite → Gerenciador de Comércio → Fontes de Dados**, colar a URL `https://www.rbscriacao.com/api/catalog/meta?format=xml` e informar `META_PIXEL_ID` e `META_CAPI_ACCESS_TOKEN`.
4. **Disparo de E-mails Transacionais (`RESEND_API_KEY` / SMTP Hostinger)**:
   - **Situação atual**: Bloqueado intencionalmente em homologação (gravando apenas na tabela `async_jobs`) para não disparar mensagens a clientes reais durante testes.
   - **Ação para produção**: Configurar `RESEND_API_KEY` com o domínio `rbscriacao.com` verificado via DKIM/SPF na Hostinger.
5. **Autorização Explícita para Cutover DNS (`rbscriacao.com`)**:
   - Conforme determinado no mandato do projeto, nenhuma alteração no apontamento público de `rbscriacao.com` foi executada automaticamente. A virada ocorrerá somente após sua validação e autorização explícita.
