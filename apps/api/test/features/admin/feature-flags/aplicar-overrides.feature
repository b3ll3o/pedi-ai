# language: pt
# BDD — Feature Flags Runtime
# Mapeia: RF-ADM-FF-05, RF-ADM-FF-06, RF-ADM-FF-07 (Overrides)
# Cobertura: happy + erro/borda por RF, conforme design.md §9
#
@admin @feature-flags @RF-ADM-FF-05 @RF-ADM-FF-06 @RF-ADM-FF-07
Funcionalidade: Aplicar e gerenciar overrides de feature flags
  Como um owner autenticado
  Quero adicionar, remover e listar overrides por escopo (GLOBAL, RESTAURANT, USER)
  Para customizar o comportamento de uma flag para subconjuntos de tenants sem deploy

  Contexto:
    Dado que existe o restaurante "Restaurante Aurora" com id "rest_aurora"
    Dado que existe o restaurante "Restaurante Polaris" com id "rest_polaris"
    E que a flag "pix_enabled" está com "enabled" igual a true e "defaultValue" igual a false
    E que a flag "combos_enabled" está com "enabled" igual a true e "defaultValue" igual a true

  # ────────────────────────────────────────────────────────────────
  # RF-ADM-FF-05 — Adicionar override
  # ────────────────────────────────────────────────────────────────

  @RF-ADM-FF-05 @feliz @feliz @auditoria
  Cenário: Owner adiciona override RESTAURANT para restaurante X
    Quando o owner envia "POST /api/v1/admin/feature-flags/pix_enabled/overrides" com:
      | campo      | valor            |
      | scope      | RESTAURANT       |
      | scopeId    | rest_aurora      |
      | value      | true             |
    Então o status da resposta deve ser 201
    E o corpo deve conter "scope" igual a "RESTAURANT"
    E o corpo deve conter "scopeId" igual a "rest_aurora"
    E deve existir uma entrada em "feature_flag_audit_logs" com action "OVERRIDE_ADD"
    E a chave Redis "ff:pix_enabled" deve ter sido invalidada

  @RF-ADM-FF-05 @feliz
  Cenário: Owner adiciona override GLOBAL sem scopeId
    Quando o owner envia "POST /api/v1/admin/feature-flags/pix_enabled/overrides" com:
      | campo   | valor  |
      | scope   | GLOBAL |
      | value   | true   |
    Então o status da resposta deve ser 201
    E o corpo deve conter "scope" igual a "GLOBAL"
    E o corpo deve conter "scopeId" igual a null

  @RF-ADM-FF-05 @erro
  Cenário: Rejeita override GLOBAL com scopeId não-nulo
    Quando o owner envia "POST /api/v1/admin/feature-flags/pix_enabled/overrides" com:
      | campo   | valor        |
      | scope   | GLOBAL       |
      | scopeId | rest_aurora  |
      | value   | true         |
    Então o status da resposta deve ser 400
    E o corpo deve conter a mensagem "scopeId deve ser nulo para escopo GLOBAL"

  @RF-ADM-FF-05 @erro
  Cenário: Rejeita override RESTAURANT sem scopeId
    Quando o owner envia "POST /api/v1/admin/feature-flags/pix_enabled/overrides" com:
      | campo | valor      |
      | scope | RESTAURANT |
      | value | true       |
    Então o status da resposta deve ser 400
    E o corpo deve conter a mensagem "scopeId é obrigatório para escopo RESTAURANT ou USER"

  @RF-ADM-FF-05 @erro
  Cenário: Rejeita override com expiresAt no passado
    Quando o owner envia "POST /api/v1/admin/feature-flags/pix_enabled/overrides" com:
      | campo      | valor                       |
      | scope      | RESTAURANT                  |
      | scopeId    | rest_aurora                 |
      | value      | true                        |
      | expiresAt  | 2020-01-01T00:00:00.000Z    |
    Então o status da resposta deve ser 400
    E o corpo deve conter a mensagem "expiresAt deve ser uma data futura"

  @RF-ADM-FF-05 @erro
  Cenário: Rejeita override duplicado para mesma flag+scope+scopeId
    Dado que já existe override RESTAURANT "rest_aurora" para a flag "pix_enabled"
    Quando o owner tenta criar outro override para (RESTAURANT, "rest_aurora")
    Então o status da resposta deve ser 409
    E o corpo deve conter a mensagem "Já existe override para este escopo"

  @RF-ADM-FF-05 @determinismo @estatistico
  Cenário: Rollout 50% por usuário é determinístico pelo userId
    Dado que existe override USER com scopeId "user_42" e rolloutPct 50
    Quando o evaluator é invocado 100 vezes para a mesma chave e userId "user_42"
    Então o resultado deve ser o mesmo em todas as 100 invocações (estável)
    E o hash FNV-1a de "pix_enabled:user_42" módulo 100 deve estar consistentemente abaixo ou acima de 50

  # ────────────────────────────────────────────────────────────────
  # RF-ADM-FF-06 — Remover override
  # ────────────────────────────────────────────────────────────────

  @RF-ADM-FF-06 @feliz @auditoria @cache
  Cenário: Owner remove override RESTAURANT e cache invalida
    Dado que existe override RESTAURANT "rest_aurora" para a flag "pix_enabled"
    E a chave Redis "ff:pix_enabled" está populada no cache
    Quando o owner envia "DELETE /api/v1/admin/feature-flags/pix_enabled/overrides/<id>"
    Então o status da resposta deve ser 204
    E o override deve ter sido removido do banco
    E a chave Redis "ff:pix_enabled" deve ter sido invalidada
    E o cache LRU in-process não deve conter mais a entrada para "pix_enabled"
    E deve existir uma entrada em "feature_flag_audit_logs" com action "OVERRIDE_REMOVE" e snapshot "before" do override removido

  @RF-ADM-FF-06 @erro
  Cenário: Remoção de override inexistente retorna 404
    Quando o owner envia "DELETE /api/v1/admin/feature-flags/pix_enabled/overrides/00000000-0000-0000-0000-000000000000"
    Então o status da resposta deve ser 404
    E o corpo deve conter a mensagem "Override não encontrado"

  # ────────────────────────────────────────────────────────────────
  # RF-ADM-FF-07 — Listar overrides de uma flag
  # ────────────────────────────────────────────────────────────────

  @RF-ADM-FF-07 @feliz
  Cenário: Manager lista overrides ativos excluindo expirados
    Dado que a flag "combos_enabled" possui:
      | scope      | scopeId    | expiresAt                |
      | GLOBAL     | null       | null                     |
      | RESTAURANT | rest_aurora | null                    |
      | RESTAURANT | rest_polaris | 2020-01-01T00:00:00.000Z |
    Quando o manager solicita "GET /api/v1/admin/feature-flags/combos_enabled/overrides"
    Então o status da resposta deve ser 200
    E o corpo deve conter 2 overrides (excluindo o expirado)
    E os overrides devem estar ordenados por "scope" ascendente (GLOBAL antes de RESTAURANT)
    E o override expirado com scopeId "rest_polaris" NÃO deve aparecer na resposta

  @RF-ADM-FF-07 @feliz
  Cenário: Listagem respeita paginação (limit=50, offset=0)
    Dado que a flag "pix_enabled" possui 75 overrides ativos
    Quando o manager solicita "GET /api/v1/admin/feature-flags/pix_enabled/overrides?limit=50&offset=0"
    Então o status da resposta deve ser 200
    E o corpo deve conter 50 elementos em "data"

  @RF-ADM-FF-07 @erro
  Cenário: Listagem de overrides de flag inexistente retorna 404
    Quando o manager solicita "GET /api/v1/admin/feature-flags/flag_inexistente/overrides"
    Então o status da resposta deve ser 404