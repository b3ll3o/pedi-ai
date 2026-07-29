# language: pt
# BDD — Política de senha NIST 800-63B (P0-10)
#
# Mapeia: P0-10 (regex de composição viola NIST 800-63B §5.1.1.2),
#         RF-SEC-02 (política de senha), LGPD Art. 46 (minimização).
#
# **Contexto normativo:**
# NIST SP 800-63B §5.1.1.2 (memória secretas) recomenda:
#   - Mínimo 8 caracteres
#   - Sem exigência de composição (causam "password fatigue" → Password1!)
#   - Bloqueio contra senhas em vazamentos públicos (HIBP)
#
# Antes (regex antiga):
#   /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
# Esta regex OBRIGAVA 1 maiúscula + 1 número + 1 caractere especial. NIST
# afirma explicitamente que composition rules NÃO devem ser exigidas
# (§5.1.1.2: "Verifiers SHOULD NOT impose other composition rules").
#
# **Decisões de projeto:**
# - Mínimo: 8 caracteres (anti-brute-force sem composition rules)
# - Máximo: 128 caracteres (anti-DoS via bcrypt cost — bcrypt é O(length))
# - Sem regras de composição
# - HIBP breach check: já implementado (k-anonymity, fail-open em outage)
# - Senha vazia e só com espaços: rejeitada explicitamente
#
# **Estratégia de teste:** Exercita o `AuthService` real (apenas o método
# privado `validarForcaSenha` é privado; aqui validamos via `register()` e
# `resetPassword()` que são os call sites públicos). Não usamos BDD HTTP —
# a feature é unit-level e o foco é no contrato do validador.

@autenticacao @security @senha @P0-10 @NIST-800-63B @RF-SEC-02
Funcionalidade: Política de senha NIST 800-63B
  Como serviço de autenticação
  Quero validar senhas conforme NIST 800-63B
  Para evitar password fatigue e bloquear senhas em vazamentos públicos
  Sem impor regras de composição que reduzem o espaço de busca do atacante

  Contexto:
    Dado que o AuthService está pronto
    E o HIBP mockado para retornar cache vazio

  # ────────────────────────────────────────────────────────────────
  # Política: SEM composição (mudança principal do P0-10)
  # ────────────────────────────────────────────────────────────────

  @P0-10 @feliz @sem-composicao
  Cenário: Senha longa sem composição complexa é aceita
    Quando tento cadastrar com senha "longpasswordwithoutcomplex"
    Então o cadastro é aceito
    E a senha é armazenada como hash bcrypt

  @P0-10 @feliz @sem-composicao @passphrase
  Cenário: Passphrase longa é aceita sem exigir caractere especial
    Quando tento cadastrar com senha "correct horse battery staple"
    Então o cadastro é aceito

  @P0-10 @feliz @sem-composicao @numeros
  Cenário: Senha com números mas sem maiúscula é aceita
    Quando tento cadastrar com senha "verao2024"
    Então o cadastro é aceito (sem regex de composição)

  @P0-10 @feliz @sem-composicao @max-128
  Cenário: Senha com exatamente 128 caracteres é aceita
    Quando tento cadastrar com senha de 128 caracteres
    Então o cadastro é aceito

  # ────────────────────────────────────────────────────────────────
  # Política: limites mínimo e máximo
  # ────────────────────────────────────────────────────────────────

  @P0-10 @triste @min-8
  Cenário: Senha com menos de 8 caracteres é rejeitada
    Quando tento cadastrar com senha "short"
    Então recebo erro 400 "Senha deve ter no mínimo 8 caracteres"

  @P0-10 @feliz @min-8
  Cenário: Senha com exatamente 8 caracteres é aceita
    Quando tento cadastrar com senha "12345678"
    Então o cadastro é aceito

  @P0-10 @triste @max-128
  Cenário: Senha com mais de 128 caracteres é rejeitada
    Quando tento cadastrar com senha de 129 caracteres
    Então recebo erro 400 "Senha deve ter no máximo 128 caracteres"

  @P0-10 @triste @max-128 @doS
  Cenário: Senha com 1000 caracteres é rejeitada (proteção DoS bcrypt)
    Quando tento cadastrar com senha de 1000 caracteres
    Então recebo erro 400 "Senha deve ter no máximo 128 caracteres"

  # ────────────────────────────────────────────────────────────────
  # Política: rejeitar vazia / só espaços (não cobre trim em código de produção)
  # ────────────────────────────────────────────────────────────────

  @P0-10 @triste @vazia
  Cenário: Senha vazia é rejeitada
    Quando tento cadastrar com senha ""
    Então recebo erro 400

  @P0-10 @triste @vazia @espacos
  Cenário: Senha com 8 espaços é rejeitada (trim check)
    Quando tento cadastrar com senha "        "
    Então recebo erro 400 "Senha não pode ser apenas espaços"

  # ────────────────────────────────────────────────────────────────
  # Política: breach check HIBP (já implementado)
  # ────────────────────────────────────────────────────────────────

  @P0-10 @triste @hibp @vazamento
  Cenário: Senha em vazamento público HIBP é rejeitada (cache miss → API)
    Dado que o HIBP retorna vazamento para a senha "password"
    Quando tento cadastrar com senha "password"
    Então recebo erro 400 "Esta senha apareceu em vazamentos públicos conhecidos. Escolha outra."

  @P0-10 @triste @hibp @cache-hit
  Cenário: Senha em vazamento HIBP é rejeitada via cache (sem chamada HTTP)
    Dado que o HIBP está cacheado como vazada para a senha "qwerty123"
    Quando tento cadastrar com senha "qwerty123"
    Então recebo erro 400 "Esta senha apareceu em vazamentos públicos conhecidos. Escolha outra."

  @P0-10 @feliz @hibp @nao-vazada
  Cenário: Senha comum mas não em vazamento HIBP é aceita
    Dado que o HIBP NÃO retorna vazamento para a senha "minha-senha-2026"
    Quando tento cadastrar com senha "minha-senha-2026"
    Então o cadastro é aceito

  @P0-10 @feliz @hibp @fail-open
  Cenário: Outage do HIBP permite signup (fail-open, sem bloquear UX)
    Dado que o HIBP está fora do ar
    Quando tento cadastrar com senha "minha-senha-2026"
    Então o cadastro é aceito (fail-open no HIBP)

  # ────────────────────────────────────────────────────────────────
  # Política: aplicada também em resetPassword
  # ────────────────────────────────────────────────────────────────

  @P0-10 @triste @reset-password
  Cenário: Reset de senha com senha curta é rejeitado
    Quando tento redefinir senha com nova senha "abc"
    Então recebo erro 400 "Senha deve ter no mínimo 8 caracteres"

  @P0-10 @feliz @reset-password
  Cenário: Reset de senha com senha válida é aceito
    Quando tento redefinir senha com nova senha "novasenhaValida123"
    Então o reset é aceito
