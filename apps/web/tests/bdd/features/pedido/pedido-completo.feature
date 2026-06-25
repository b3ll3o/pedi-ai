# language: pt
# Spec BDD para o BC `pedido` — fluxo completo.
# Referência: .openspec/specs/pedido/design.md

Funcionalidade: Fazer pedido ponta-a-ponta
  Como um cliente no restaurante
  Eu quero montar um pedido e pagar
  Para receber minha comida na mesa

  Contexto:
    Dado que estou autenticado como cliente
    E estou no cardápio da Mesa 5
    E o cardápio tem pelo menos 5 produtos ativos

  @RF-ORDER-01 @smoke @critical
  Cenário: Adicionar item ao carrinho
    Quando eu clico em "X-Burger"
    E clico em "Adicionar ao carrinho"
    Então o carrinho deve ter 1 item
    E o subtotal deve ser o preço do X-Burger

  @RF-ORDER-05 @RF-PAY-01 @smoke @critical
  Cenário: Fechar pedido e gerar PIX
    Dado que tenho 2 itens no carrinho com total R$ 45,00
    Quando eu clico em "Fechar pedido"
    E seleciono "Pagar com PIX"
    Então devo ver o QR code PIX
    E o pedido deve estar com status "AGUARDANDO_PAGAMENTO"

  @RF-ORDER-06 @smoke @critical
  Cenário: Pedido é confirmado após pagamento
    Dado que tenho um pedido aguardando pagamento
    Quando o webhook de pagamento é processado
    Então o pedido deve mudar para "CONFIRMADO"
    E a cozinha deve receber notificação via socket

  @RF-ORDER-12 @RF-PAY-08 @slow
  Cenário: Cancelar pedido pago com reembolso
    Dado que tenho um pedido "CONFIRMADO" e pago
    Quando eu clico em "Cancelar pedido"
    E confirmo o cancelamento
    Então o pedido deve mudar para "CANCELADO"
    E o pagamento deve iniciar reembolso
    E eu devo ver o ID de reembolso

  @RF-ORDER-10 @smoke
  Cenário: Pedido offline é sincronizado ao reconectar
    Dado que estou offline
    E fechei um pedido
    Quando eu fico online
    Então o pedido deve aparecer em "/pedidos"
    E deve ter status igual ao do servidor