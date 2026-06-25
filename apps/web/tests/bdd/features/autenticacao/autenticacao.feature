# language: pt
# Spec BDD para o BC `autenticacao`.
# Referência: .openspec/specs/autenticacao/design.md

Funcionalidade: Autenticação de cliente
  Como um cliente do restaurante
  Eu quero me autenticar com e-mail e senha
  Para poder fazer pedidos e acompanhar o histórico

  Contexto:
    Dado que o restaurante "Pedi Demo" está cadastrado
    E o e-mail "cliente@example.com" já está registrado

  @RF-AUTH-01 @smoke @critical
  Cenário: Registrar novo cliente com sucesso
    Dado que estou na página "/register"
    Quando eu preencho o formulário com dados válidos
    E clico em "Cadastrar"
    Então devo ser redirecionado para "/"
    E devo estar autenticado como "cliente@example.com"

  @RF-AUTH-02 @smoke @critical
  Cenário: Login com credenciais válidas
    Dado que estou na página "/login"
    Quando eu preencho "cliente@example.com" e "senha-correta"
    E clico em "Entrar"
    Então devo ser redirecionado para "/cardapio"
    E devo ver a saudação "Olá"

  @RF-AUTH-02 @smoke
  Cenário: Login com senha incorreta
    Dado que estou na página "/login"
    Quando eu preencho "cliente@example.com" e "senha-errada"
    E clico em "Entrar"
    Então devo ver a mensagem "Credenciais inválidas"
    E devo permanecer na página "/login"

  @RF-AUTH-04 @slow
  Cenário: Recuperar senha via e-mail
    Dado que estou na página "/esqueci-senha"
    Quando eu preencho "cliente@example.com"
    E clico em "Enviar link"
    Então devo ver a mensagem de confirmação
    E devo receber um e-mail em "cliente@example.com" com link de redefinição

  @RF-AUTH-05 @slow
  Cenário: Redefinir senha com token válido
    Dado que tenho um token de redefinição válido
    E estou na página "/redefinir-senha"
    Quando eu preencho "nova-senha-123" e confirmo
    E clico em "Redefinir"
    Então devo ver a mensagem "Senha alterada com sucesso"
    E devo poder logar com a nova senha