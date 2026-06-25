# language: pt
# Spec BDD para o BC `mesa` — validação de QR.
# Referência: .openspec/specs/mesa/design.md

Funcionalidade: Validação de QR Code de mesa
  Como um cliente escaneando o QR Code da mesa
  Eu quero ser direcionado ao cardápio correto
  Para fazer meu pedido com confiança

  Contexto:
    Dado que o restaurante "Pedi Demo" tem a mesa "Mesa 5" cadastrada

  @RF-TABLE-03 @smoke @critical
  Cenário: QR válido abre cardápio da mesa correta
    Dado que escaneio o QR code da "Mesa 5"
    Quando a página carrega
    Então devo estar em "/cardapio/[mesaId]" da Mesa 5
    E devo ver o nome do restaurante

  @RF-TABLE-03 @smoke
  Cenário: QR adulterado é rejeitado
    Dado que alguém adulterou a assinatura do QR code
    Quando eu escaneio o QR adulterado
    Então devo ver a mensagem "QR code inválido"
    E não devo ser redirecionado para o cardápio

  @RF-TABLE-03 @slow
  Cenário: QR com timestamp expirado (>24h) é rejeitado
    Dado que existe um QR gerado há 25 horas
    Quando eu escaneio o QR antigo
    Então devo ver a mensagem "QR code expirado"

  @RF-TABLE-01 @smoke
  Cenário: Owner cria nova mesa e gera QR
    Dado que estou no painel admin em "/admin/mesas"
    Quando eu clico em "Nova mesa"
    E preencho o label "Mesa 10"
    E clico em "Criar"
    Então a mesa "Mesa 10" deve aparecer na lista
    E deve ter um QR code gerado