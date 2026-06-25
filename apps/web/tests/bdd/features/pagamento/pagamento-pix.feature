# language: pt
# Spec BDD para o BC `pagamento` — fluxo PIX.
# Referência: .openspec/specs/pagamento/design.md

Funcionalidade: Pagamento via PIX
  Como um cliente fechando um pedido
  Eu quero pagar via PIX
  Para confirmar meu pedido rapidamente

  Contexto:
    Dado que tenho um pedido com total R$ 50,00 aguardando pagamento

  @RF-PAY-01 @smoke @critical
  Cenário: Gerar cobrança PIX com QR
    Quando o sistema cria a cobrança PIX
    Então devo receber um QR code para escanear
    E o código "copia e cola" deve ter o valor R$ 50,00

  @RF-PAY-02 @RF-PAY-03 @smoke @critical
  Cenário: Webhook válido confirma pagamento
    Dado que recebi um webhook com assinatura válida
    Quando o sistema processa o webhook
    Então o pagamento deve mudar para "APROVADO"
    E o pedido vinculado deve mudar para "CONFIRMADO"

  @RF-PAY-03 @smoke
  Cenário: Webhook com assinatura inválida é rejeitado
    Dado que recebi um webhook com assinatura inválida
    Quando o sistema processa o webhook
    Então devo retornar HTTP 401
    E o pagamento não deve ser alterado

  @RF-PAY-07 @smoke
  Cenário: Webhook duplicado é ignorado (idempotência)
    Dado que recebi o mesmo webhook 2 vezes
    Quando o sistema processa ambos
    Então o pagamento deve ser alterado apenas uma vez
    E o segundo processamento deve retornar "Evento já processado"

  @RF-PAY-06 @slow
  Cenário: Modo demo permite testar sem credenciais reais
    Dado que `NEXT_PUBLIC_DEMO_PAYMENT_MODE=true`
    Quando o sistema cria a cobrança PIX
    Então o QR code deve ser fictício (mas funcional)
    E devo poder simular o pagamento via endpoint admin