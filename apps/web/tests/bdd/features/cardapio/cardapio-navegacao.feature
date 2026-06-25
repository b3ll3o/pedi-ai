# language: pt
# Spec BDD para o BC `cardapio` — navegação do cliente.
# Referência: .openspec/specs/cardapio/design.md

Funcionalidade: Navegação do cardápio pelo cliente
  Como um cliente escaneando o QR de uma mesa
  Eu quero navegar pelo cardápio
  Para escolher o que vou pedir

  Contexto:
    Dado que o restaurante "Pedi Demo" tem 3 categorias ativas
    E cada categoria tem pelo menos 2 produtos ativos

  @RF-MENU-02 @smoke @critical
  Cenário: Listar cardápio completo
    Dado que estou na página "/cardapio/[mesaId]"
    Quando a página carrega
    Então devo ver 3 categorias listadas
    E cada categoria deve ter pelo menos 2 itens

  @RF-MENU-03 @smoke @critical
  Cenário: Ver detalhe de um produto com modificadores
    Dado que estou no cardápio
    E o produto "X-Burger" tem modificador "Ponto da carne"
    Quando eu clico em "X-Burger"
    Então devo ver o detalhe do produto
    E devo ver o grupo de modificadores "Ponto da carne"

  @RF-MENU-02 @smoke
  Cenário: Navegação offline do cardápio
    Dado que estou com o cardápio carregado
    Quando eu fico offline
    E navego para outra categoria
    Então devo ver a categoria em cache
    E devo ver o indicador "Modo offline"

  @RF-MENU-07 @smoke
  Cenário: Adicionar combo ao carrinho
    Dado que existe o combo "Combo Família" no cardápio
    Quando eu clico em "Combo Família"
    E clico em "Adicionar ao carrinho"
    Então o carrinho deve ter 1 item
    E o preço do item deve ser igual ao preço do bundle