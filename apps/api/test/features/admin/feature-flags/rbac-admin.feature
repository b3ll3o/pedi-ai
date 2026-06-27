# language: pt
# BDD — Feature Flags Runtime
# Mapeia: RNF-SEC-FF-01 (RBAC granular) — matriz owner × manager × staff
#
@admin @feature-flags @RNF-SEC-FF-01 @RF-ADM-FF-03 @RF-ADM-FF-04 @RF-ADM-FF-05 @RF-ADM-FF-06
Funcionalidade: Controle de acesso por papel (RBAC) — feature flags
  Como um sistema seguro
  Quero aplicar RBAC granular aos endpoints de feature flags
  Para garantir que apenas owner pode mutar e manager apenas ler

  Contexto:
    Dado que existem 3 usuários:
      | papel   | email                  |
      | owner   | owner@pedi.ai          |
      | manager | manager@pedi.ai        |
      | staff   | staff@pedi.ai          |

  # ────────────────────────────────────────────────────────────────
  # Matriz RBAC — endpoints admin (RNF-SEC-FF-01)
  # ────────────────────────────────────────────────────────────────

  @RNF-SEC-FF-01 @feliz @matriz
  Esquema do Cenário: Owner tem acesso a todos os métodos (CRUD + override + audit)
    Dado que <papel> está autenticado
    Quando <papel> chama <método> <endpoint>
    Então o status da resposta deve ser <status>

    Exemplos: papel=owner
      | papel | método | endpoint                                               | status |
      | owner | GET    | /api/v1/admin/feature-flags                            | 200    |
      | owner | GET    | /api/v1/admin/feature-flags/pix_enabled                | 200    |
      | owner | POST   | /api/v1/admin/feature-flags                            | 201    |
      | owner | PATCH  | /api/v1/admin/feature-flags/pix_enabled                | 200    |
      | owner | POST   | /api/v1/admin/feature-flags/pix_enabled/overrides      | 201    |
      | owner | DELETE | /api/v1/admin/feature-flags/pix_enabled/overrides/x    | 204    |
      | owner | GET    | /api/v1/admin/feature-flags/pix_enabled/overrides      | 200    |
      | owner | GET    | /api/v1/admin/feature-flags/pix_enabled/audit          | 200    |

  @RNF-SEC-FF-01 @feliz @matriz
  Esquema do Cenário: Manager tem acesso somente leitura (listar, obter, audit, evaluate)
    Dado que <papel> está autenticado
    Quando <papel> chama <método> <endpoint>
    Então o status da resposta deve ser <status>

    Exemplos: papel=manager
      | papel   | método | endpoint                                               | status |
      | manager | GET    | /api/v1/admin/feature-flags                            | 200    |
      | manager | GET    | /api/v1/admin/feature-flags/pix_enabled                | 200    |
      | manager | POST   | /api/v1/admin/feature-flags                            | 403    |
      | manager | PATCH  | /api/v1/admin/feature-flags/pix_enabled                | 403    |
      | manager | POST   | /api/v1/admin/feature-flags/pix_enabled/overrides      | 403    |
      | manager | DELETE | /api/v1/admin/feature-flags/pix_enabled/overrides/x    | 403    |
      | manager | GET    | /api/v1/admin/feature-flags/pix_enabled/overrides      | 200    |
      | manager | GET    | /api/v1/admin/feature-flags/pix_enabled/audit          | 200    |

  @RNF-SEC-FF-01 @feliz @matriz
  Esquema do Cenário: Staff NÃO tem acesso a nenhum endpoint admin
    Dado que <papel> está autenticado
    Quando <papel> chama <método> <endpoint>
    Então o status da resposta deve ser 403

    Exemplos: papel=staff (todos endpoints admin)
      | papel | método | endpoint                                               |
      | staff | GET    | /api/v1/admin/feature-flags                            |
      | staff | GET    | /api/v1/admin/feature-flags/pix_enabled                |
      | staff | POST   | /api/v1/admin/feature-flags                            |
      | staff | PATCH  | /api/v1/admin/feature-flags/pix_enabled                |

  @RNF-SEC-FF-01 @feliz @publico
  Cenário: /evaluate é público mas rate-limited
    Quando um cliente anônimo chama "GET /api/v1/admin/feature-flags/evaluate?keys=pix_enabled"
    Então o status da resposta deve ser 200
    E nenhuma autenticação é exigida
    E a resposta deve ser cacheável publicamente por até 60 segundos

  @RNF-SEC-FF-01 @erro @autenticacao
  Cenário: Token JWT expirado é rejeitado em qualquer endpoint
    Dado que o owner possui token JWT expirado há 1 hora
    Quando o owner chama "GET /api/v1/admin/feature-flags"
    Então o status da resposta deve ser 401
    E o corpo deve conter a mensagem "Token expirado"

  @RNF-SEC-FF-01 @erro @autenticacao
  Cenário: Token JWT assinado com chave incorreta é rejeitado
    Dado que o token JWT foi assinado com chave diferente da chave do servidor
    Quando o portador do token chama "GET /api/v1/admin/feature-flags"
    Então o status da resposta deve ser 401
    E o corpo deve conter a mensagem "Assinatura do token inválida"

  # ────────────────────────────────────────────────────────────────
  # Fail-closed (defesa em profundidade)
  # ────────────────────────────────────────────────────────────────

  @RNF-SEC-FF-01 @feliz @fail-closed
  Cenário: Guard fail-closed — sem role no token, manager NÃO escapa para owner
    Dado que o token JWT NÃO possui claim "role"
    Quando o portador chama "POST /api/v1/admin/feature-flags"
    Então o status da resposta deve ser 403
    E o corpo deve conter a mensagem "Papel (role) ausente no token"