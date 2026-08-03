# language: pt
# BDD — Isolamento multi-tenant do modelo Product (P0-01)
#
# Mapeia: P0-01 (BOLA no endpoint de pedidos, 3 instâncias),
#         OWASP API #1 (Broken Object Level Authorization, 2023).
#
# **Cenários cobertos:**
# - Cliente de restaurante A NÃO pode ver produto de restaurante B via
#   `GET /products/:id` (BOLA clássico).
# - Cliente NÃO pode criar pedido com produto de outro restaurante
#   (cross-tenant product injection no POST /orders).
# - Listagem por categoria retorna apenas produtos do restaurante
#   informado (findByCategory requer tenant explícito).
# - Update/delete valida tenant antes de aplicar mutação (defesa em
#   profundidade no ProductsService).
#
# **Estratégia:** cada cenário valida que o ProductsService/OrdersService
# aplica `restaurantId` em TODA query Prisma sobre `Product` —
# sem o filtro, qualquer cliente autenticado vazaria dados de outros
# tenants. Os cenários BDD abaixo correspondem à API em
# `apps/api/src/products/products.controller.ts` e `apps/api/src/orders/orders.controller.ts`.

@shared @security @multi-tenant @P0-01 @BOLA @RNF-SEC-MT-01
Funcionalidade: Isolamento multi-tenant do modelo Product
  Como operador do sistema
  Quero que toda query sobre Product seja escopada por restaurantId
  Para que clientes de um restaurante não vazem dados de outros
  restaurantes (BOLA / OWASP API #1)

  Contexto:
    Dado dois restaurantes cadastrados no banco:
      | restaurante | id            |
      | A           | rest-a        |
      | B           | rest-b        |
    E dois produtos cadastrados:
      | produto       | restaurante | id      | preco |
      | Hambúrguer A  | A           | prod-a1 | 25.00 |
      | Pizza B       | B           | prod-b1 | 40.00 |
    E o JWT contém `restaurantId` do restaurante A

  # ────────────────────────────────────────────────────────────────
  # BOLA clássico — GET /products/:id cross-tenant
  # ────────────────────────────────────────────────────────────────

  @BOLA @feliz @read
  Cenário: Cliente de restaurante A NÃO pode ver produto de restaurante B via GET /products/:id
    Quando o cliente faz GET /products/prod-b1 com JWT do restaurante A
    Então a resposta deve ser 404 (produto não encontrado para este tenant)
    E nenhum dado do produto prod-b1 (preço, descrição) deve vazar na resposta

  @BOLA @triste @public-read
  Cenário: GET /products/:id sem autenticação NÃO vaza produtos cross-tenant
    Quando um cliente anônimo faz GET /products/prod-b1
    Então a resposta deve ser 404 (produto não encontrado)

  # ────────────────────────────────────────────────────────────────
  # Cross-tenant product injection no POST /orders
  # ────────────────────────────────────────────────────────────────

  @BOLA @triste @order-creation
  Cenário: Cliente NÃO pode criar pedido com produto de outro restaurante
    Dado um pedido com itens contendo:
      | productId | quantidade |
      | prod-a1   | 1          |
      | prod-b1   | 1          |
    Quando o cliente faz POST /orders
    Então a resposta deve ser 400 BadRequest
    E a mensagem deve indicar "Produtos indisponíveis ou inexistentes: prod-b1"
    E nenhum pedido deve ser persistido com item de outro tenant

  @BOLA @feliz @order-creation
  Cenário: Cliente cria pedido com produtos do seu próprio restaurante (succeed)
    Dado um pedido com itens contendo:
      | productId | quantidade |
      | prod-a1   | 2          |
    Quando o cliente faz POST /orders com restaurantId do restaurante A
    Então a resposta deve ser 201 Created
    E o pedido persistido deve ter todos os itens com productId prod-a1

  # ────────────────────────────────────────────────────────────────
  # findByCategory exige tenant explícito
  # ────────────────────────────────────────────────────────────────

  @BOLA @feliz @list-by-category
  Cenário: Listagem por categoria retorna apenas produtos do restaurante informado
    Quando o cliente faz GET /products/category/cat-a?restaurantId=rest-a
    Então a resposta deve conter apenas produtos do restaurante A
    E a resposta NÃO deve conter produtos com id prod-b1

  @BOLA @triste @list-by-category
  Cenário: Listagem por categoria sem restaurantId deve falhar (defesa em profundidade)
    Quando o cliente faz GET /products/category/cat-a sem informar restaurantId
    Então a resposta deve ser 400 BadRequest com mensagem exigindo restaurantId

  # ────────────────────────────────────────────────────────────────
  # Update/delete valida tenant antes de mutar
  # ────────────────────────────────────────────────────────────────

  @BOLA @triste @mutation
  Cenário: Update cross-tenant é bloqueado com 403 Forbidden
    Dado um JWT de gerente do restaurante A
    Quando o gerente faz PATCH /products/prod-b1 com `{ "price": 1 }`
    Então a resposta deve ser 403 Forbidden
    E o produto prod-b1 NÃO deve ter seu preço alterado

  @BOLA @triste @mutation
  Cenário: Delete cross-tenant é bloqueado com 403 Forbidden
    Dado um JWT de dono do restaurante A
    Quando o dono faz DELETE /products/prod-b1
    Então a resposta deve ser 403 Forbidden
    E o produto prod-b1 NÃO deve ser excluído do banco

  @BOLA @feliz @mutation
  Cenário: Update no próprio tenant é permitido
    Dado um JWT de gerente do restaurante A
    Quando o gerente faz PATCH /products/prod-a1 com `{ "price": 30 }`
    Então a resposta deve ser 200 OK
    E o produto prod-a1 deve ter o preço atualizado