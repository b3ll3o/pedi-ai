# language: pt
# Spec BDD para o BC `admin` — subset de gestão de restaurante.
# Referência: .openspec/specs/admin/design.md

Funcionalidade: Gestão de restaurante pelo owner
  Como um owner de restaurante
  Eu quero gerenciar as configurações do meu restaurante
  Para manter o cardápio e as mesas atualizados

  Contexto:
    Dado que estou autenticado como owner do restaurante "Pedi Demo"

  @RF-ADM-02 @smoke @critical
  Cenário: Atualizar configurações básicas
    Dado que estou na página "/admin/configuracoes"
    Quando eu altero o tempo de preparo para 25 minutos
    E clico em "Salvar"
    Então devo ver a mensagem "Configurações atualizadas"
    E o tempo de preparo deve estar como 25 minutos

  @RF-ADM-07 @smoke
  Cenário: Desativar restaurante
    Dado que estou na página "/admin"
    Quando eu clico em "Desativar restaurante"
    E confirmo a ação no diálogo
    Então devo ver a mensagem "Restaurante desativado"
    E o restaurante não deve aparecer em "/restaurantes"

  @RF-ADM-08 @smoke
  Cenário: Reativar restaurante
    Dado que o restaurante "Pedi Demo" está desativado
    E estou na página "/admin"
    Quando eu clico em "Reativar restaurante"
    E confirmo a ação
    Então devo ver a mensagem "Restaurante reativado"
    E o restaurante deve aparecer em "/restaurantes"