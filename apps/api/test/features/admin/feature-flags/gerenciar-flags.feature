# language: pt
# BDD — Feature Flags Runtime
# Mapeia: RF-ADM-FF-01..04 (CRUD de flags)
# Cobertura: 1 happy + 1 erro por RF, conforme design.md §9
#
@admin @feature-flags @RF-ADM-FF-01 @RF-ADM-FF-02 @RF-ADM-FF-03 @RF-ADM-FF-04
Funcionalidade: Gerenciar feature flags (CRUD)
  Como um owner autenticado no painel admin
  Quero criar, listar, obter e atualizar feature flags
  Para controlar dinamicamente o comportamento do sistema em produção

  Contexto:
    Dado que existe um restaurante "Restaurante XPTO" cadastrado
    E que "owner@pedi.ai" possui papel "owner" no restaurante "Restaurante XPTO"
    E que "manager@pedi.ai" possui papel "manager" no restaurante "Restaurante XPTO"
    E que o ambiente está com 8 flags seedadas (offline_enabled, pix_enabled, waiter_mode_enabled, qr_code_enabled, combos_enabled, analytics_enabled, cashback_enabled, multi_restaurant_enabled)

  # ────────────────────────────────────────────────────────────────
  # RF-ADM-FF-01 — Listar feature flags
  # ────────────────────────────────────────────────────────────────

  @RF-ADM-FF-01 @feliz
  Cenário: Owner lista todas as flags com contagem de overrides
    Dado que o owner está autenticado com JWT válido
    Quando o owner solicita "GET /api/v1/admin/feature-flags"
    Então o status da resposta deve ser 200
    E o corpo deve conter a chave "data" com 8 elementos
    E cada elemento deve possuir os campos "key", "description", "valueType", "defaultValue", "enabled", "overrideCount"
    E a flag "pix_enabled" deve ter "overrideCount" igual a 0
    E a flag "multi_restaurant_enabled" deve ter "enabled" igual a true

  @RF-ADM-FF-01 @feliz
  Cenário: Manager lista as flags com a mesma resposta que owner
    Dado que o manager está autenticado com JWT válido
    Quando o manager solicita "GET /api/v1/admin/feature-flags"
    Então o status da resposta deve ser 200
    E o corpo deve ter a mesma estrutura retornada para o owner
    E nenhum campo sensível (senha, token, hash) deve aparecer na resposta

  @RF-ADM-FF-01 @erro
  Cenário: Usuário sem token recebe 401 ao listar flags
    Quando um cliente anônimo solicita "GET /api/v1/admin/feature-flags"
    Então o status da resposta deve ser 401
    E o corpo deve conter a mensagem "Token de autenticação ausente"

  @RF-ADM-FF-01 @erro
  Cenário: Staff recebe 403 ao listar flags administrativas
    Dado que "staff@pedi.ai" possui papel "staff" no restaurante "Restaurante XPTO"
    Quando o staff solicita "GET /api/v1/admin/feature-flags"
    Então o status da resposta deve ser 403
    E o corpo deve conter a mensagem "Acesso restrito a owner ou manager"

  # ────────────────────────────────────────────────────────────────
  # RF-ADM-FF-02 — Obter feature flag por chave
  # ────────────────────────────────────────────────────────────────

  @RF-ADM-FF-02 @feliz
  Cenário: Owner obtém flag existente com overrides inline
    Dado que a flag "pix_enabled" possui 2 overrides ativos (RESTAURANT e USER)
    Quando o owner solicita "GET /api/v1/admin/feature-flags/pix_enabled"
    Então o status da resposta deve ser 200
    E o corpo deve conter "key" igual a "pix_enabled"
    E o corpo deve conter "overrides" com 2 elementos
    E o primeiro override deve ter "scope" igual a "RESTAURANT"
    E o campo "defaultValue" deve ser do tipo "BOOLEAN"

  @RF-ADM-FF-02 @erro
  Cenário: Owner recebe 404 ao consultar chave inexistente
    Quando o owner solicita "GET /api/v1/admin/feature-flags/flag_inexistente"
    Então o status da resposta deve ser 404
    E o corpo deve conter a mensagem "Feature flag não encontrada"

  # ────────────────────────────────────────────────────────────────
  # RF-ADM-FF-03 — Criar feature flag
  # ────────────────────────────────────────────────────────────────

  @RF-ADM-FF-03 @feliz @auditoria
  Cenário: Owner cria flag booleana com sucesso
    Quando o owner envia "POST /api/v1/admin/feature-flags" com o corpo:
      | campo        | valor                                        |
      | key          | nova_flag_experimental                       |
      | description  | Flag de teste para nova feature experimental |
      | valueType    | BOOLEAN                                      |
      | defaultValue | false                                        |
    Então o status da resposta deve ser 201
    E o corpo deve conter "key" igual a "nova_flag_experimental"
    E o campo "enabled" deve ser true (default)
    E uma entrada deve existir em "feature_flag_audit_logs" com action "CREATE" e actorId do owner

  @RF-ADM-FF-03 @erro
  Cenário: Criação é rejeitada quando key não segue snake_case
    Quando o owner envia "POST /api/v1/admin/feature-flags" com o corpo:
      | campo        | valor              |
      | key          | FlagComMaiuscula   |
      | valueType    | BOOLEAN            |
      | defaultValue | false              |
    Então o status da resposta deve ser 400
    E o corpo deve conter a mensagem "key deve seguir o padrão snake_case ^[a-z0-9_]{3,64}$"

  @RF-ADM-FF-03 @erro
  Esquema do Cenário: Criação rejeitada quando defaultValue é incompatível com valueType
    Dado que o owner envia "POST /api/v1/admin/feature-flags" com valueType "<valueType>" e defaultValue "<defaultValue>"
    Quando a requisição é processada
    Então o status da resposta deve ser 400
    E o corpo deve conter a mensagem "defaultValue incompatível com valueType"

    Exemplos:
      | valueType | defaultValue |
      | BOOLEAN   | "texto"      |
      | NUMBER    | "abc"        |
      | STRING    | 123          |
      | JSON      | "não-objeto" |

  @RF-ADM-FF-03 @erro
  Cenário: Criação de flag duplicada retorna 409
    Dado que já existe a flag "pix_enabled"
    Quando o owner tenta criar outra flag com key "pix_enabled"
    Então o status da resposta deve ser 409
    E o corpo deve conter a mensagem "Já existe uma feature flag com esta key"

  @RF-ADM-FF-03 @rbac
  Cenário: Manager recebe 403 ao tentar criar flag
    Quando o manager envia "POST /api/v1/admin/feature-flags" com uma flag válida
    Então o status da resposta deve ser 403
    E o corpo deve conter a mensagem "Apenas owner pode criar feature flags"
    E nenhuma entrada deve ser criada em "feature_flag_audit_logs"

  # ────────────────────────────────────────────────────────────────
  # RF-ADM-FF-04 — Atualizar feature flag
  # ────────────────────────────────────────────────────────────────

  @RF-ADM-FF-04 @feliz @auditoria
  Cenário: Owner desabilita flag e auditoria registra before/after
    Dado que a flag "cashback_enabled" está com "enabled" igual a true e "defaultValue" igual a false
    Quando o owner envia "PATCH /api/v1/admin/feature-flags/cashback_enabled" com:
      | campo   | valor |
      | enabled | false |
    Então o status da resposta deve ser 200
    E o corpo deve conter "enabled" igual a false
    E deve existir uma entrada em "feature_flag_audit_logs" com:
      | campo   | valor              |
      | action  | UPDATE             |
      | before  | enabled=true       |
      | after   | enabled=false      |
      | actorId | id do owner        |

  @RF-ADM-FF-04 @erro
  Cenário: Atualização rejeita tentativa de alterar key
    Quando o owner envia "PATCH /api/v1/admin/feature-flags/pix_enabled" com:
      | campo | valor          |
      | key   | outro_nome_key |
    Então o status da resposta deve ser 400
    E o corpo deve conter a mensagem "Campo 'key' é imutável"

  @RF-ADM-FF-04 @erro
  Cenário: Atualização rejeita tentativa de alterar valueType
    Quando o owner envia "PATCH /api/v1/admin/feature-flags/pix_enabled" com:
      | campo     | valor   |
      | valueType | STRING  |
    Então o status da resposta deve ser 400
    E o corpo deve conter a mensagem "Campo 'valueType' é imutável após criação"

  @RF-ADM-FF-04 @rbac
  Cenário: Manager recebe 403 ao tentar atualizar flag
    Quando o manager envia "PATCH /api/v1/admin/feature-flags/pix_enabled" com:
      | campo   | valor |
      | enabled | false |
    Então o status da resposta deve ser 403
    E o corpo deve conter a mensagem "Apenas owner pode atualizar feature flags"