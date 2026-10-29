# Ikeda · Portal do Parceiro

Aplicação demonstrativa B2B em português, construída com Next.js App Router, React, PostgreSQL e Drizzle ORM. Não é um portal oficial da Distribuidora Ikeda. Clientes, CNPJs, contratos, valores, títulos e pedidos são fictícios.

## Funcionalidades implementadas

- Dashboard com crédito, pedidos, entregas previstas e economia sobre preços de referência.
- Catálogo com 26 produtos, fotos locais, busca por nome, marca e EAN, categorias com contagem e favoritos persistentes. Inclui mais 17 itens pesquisados: guaraná, água, refrigerantes, feijão, macarrão, farinha, milho, extrato de tomate, atum, laticínios, biscoito, sabão para roupas, papel higiênico, creme dental e shampoo.
- Contas com tabelas negociadas distintas, senhas com scrypt e sessões opacas em cookies HttpOnly/SameSite.
- Carrinho persistente por cliente, compra por caixa/fardo, peso físico, volume e peso cubado estimado (300 kg/m³).
- Fechamento direto via WhatsApp: o pedido é formatado com caixas, unidades, códigos EAN, tabela de preços contratual do cliente, condição de pagamento e cubagem estimada, abrindo diretamente na conversa oficial da Distribuidora Ikeda (Matriz SP · Junqueirópolis ou Filial MS · Campo Grande).
- Redução de complexidade: dispensa integração imediata com ERP ou banco de dados externo para a operação de vendas — o vendedor recebe o pedido limpo, pronto para faturamento, eliminando erros de digitação e mensagens de voz confusas.
- Histórico, detalhes, recompra com preços/estoques atuais e exportação CSV de pedidos.
- Extrato financeiro e download de demonstrativos PDF autenticados e segregados por cliente.
- Cadastro editável e solicitações de atendimento com protocolo armazenado no banco.
- Área comercial protegida por perfil, campanhas de desconto por volume e leve 3/pague 2, com ativação e pausa.
- Layout responsivo, atalhos de busca, navegação por teclado e modais com contenção de foco.

## Demonstração

[**Ver demonstração**](https://ikeda-distribuidora.vercel.app) · Next.js 16 (App Router) · React 19 · TypeScript · PostgreSQL + Drizzle ORM · Tailwind CSS 4

O portal abre na conta demonstrativa Mercadinho São João. Para trocar, clique no avatar do cabeçalho e em **Acessar outra conta**. Senha das três contas: `ikeda2026`.

| E-mail fictício | Perfil |
| --- | --- |
| cliente@exemplo.com | Cliente · tabela Parceiro Ouro |
| padaria@exemplo.com | Cliente · tabela Diamante, 5% de desconto |
| comercial@exemplo.com | Administrador comercial · promoções |

As alterações são persistidas no PostgreSQL. A demonstração pública compartilha a conta inicial entre visitantes. Não use dados pessoais ou comerciais reais nesse ambiente.

## Execução

1. Configure `DATABASE_URL` no ambiente.
2. Instale as dependências: `npm install`.
3. Aplique as tabelas: `npx drizzle-kit push`.
4. Inicie o desenvolvimento: `npm run dev`.

Os dados fictícios são carregados de forma idempotente na primeira requisição. O endpoint `/api/health` verifica a conexão com o banco.

## Catálogo pesquisado

Os 17 novos itens foram conferidos no catálogo público de produtos do [Mambo Supermercados](https://www.mambo.com.br/), usando busca VTEX por descrição e consulta de embalagem, código EAN, marca e fotografia. As fotos foram copiadas para `public/images/` para não depender de carregamento de imagem de terceiros.

Nomes comerciais, marcas e identificadores servem para reconhecer os produtos. **Preço promocional, preço de referência, estoque, tamanho das caixas/fardos, peso e cubagem são dados inventados para esta demonstração.** Confirme SKU, embalagem de venda e tabela real diretamente com a distribuidora antes de qualquer implantação.

## Limites e integração futura

**Não existe conexão com um ERP real, emissão de boleto, pagamento, NF-e, rastreamento ao vivo ou envio de mensagens externas.** Os PDFs são identificados como demonstrativos sem valor de cobrança. O suporte registra uma solicitação local. Os status e prazos de entrega são ilustrativos.

Uma implantação real depende da documentação e das credenciais do ERP/banco escolhido pela empresa. Substitua a consulta financeira local por um adaptador server-side, sincronize clientes/tabelas/estoques/títulos, integre a confirmação de pedidos e webhooks e remova a conta pública de demonstração. Também são necessários provisionamento de usuários, recuperação de senha, limitação de tentativas, auditoria, monitoramento, políticas LGPD, backups e aprovação da identidade visual.

## Validação

```sh
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run build
```

O projeto também é verificado com o runtime de preview gerenciado da plataforma.
