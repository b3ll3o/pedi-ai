# language: pt
# BDD — Feature Flags Runtime
# Mapeia: RF-ADM-FF-09 (Audit log) + RNF-RELI-FF-01 (atomicidade)
#
@admin @feature-flags @RF-ADM-FF-09 @RNF-RELI-FF-01
Funcionalidade: Visualizar audit log imutável de feature flags
  Como um owner ou manager
  Quero consultar o histórico de mutações de uma flag
  Para auditoria e troubleshooting (saber quem/quando/o quê mudou)

  Contexto:
    Dado que existe a flag "pix_enabled" no sistema
    E que o owner "owner@pedi.ai" já criou 1 override e atualizou a flag 2 vezes

  # ────────────────────────────────────────────────────────────────
  # RF-ADM-FF-09 — Listagem
  # ────────────────────────────────────────────────────────────────

  @RF-ADM-FF-09 @feliz
  Cenário: Manager consulta audit log ordenado por data decrescente
    Quando o manager envia "GET /api/v1/admin/feature-flags/pix_enabled/audit?limit=50&offset=0"
    Então o status da resposta deve ser 200
    E o corpo deve conter "data" com 3 elementos
    E os elementos devem estar ordenados por "createdAt" decrescente
    E o primeiro elemento deve ter "action" igual a "OVERRIDE_ADD"
    E cada elemento deve conter os campos "id", "actorId", "action", "before", "after", "createdAt"

  @RF-ADM-FF-09 @feliz
  Cenário: Manager vê o mesmo conteúdo do audit log que owner (sem mascaramento)
    Quando o owner consulta "GET /api/v1/admin/feature-flags/pix_enabled/audit"
    E o manager consulta "GET /api/v1/admin/feature-flags/pix_enabled/audit"
    Então ambos devem receber o mesmo array de eventos
    E nenhum campo deve estar mascarado (auditoria é leitura, não mutação)

  @RF-ADM-FF-09 @feliz
  Cenário: Audit log diferencia ações CREATE, UPDATE, TOGGLE, OVERRIDE_ADD, OVERRIDE_REMOVE, ROLLOUT_CHANGE
    Dado que foram executadas as seguintes ações:
      | ação              | ator                  |
      | CREATE            | owner@pedi.ai         |
      | UPDATE            | owner@pedi.ai         |
      | TOGGLE            | owner@pedi.ai         |
      | OVERRIDE_ADD      | owner@pedi.ai         |
      | OVERRIDE_REMOVE   | owner@pedi.ai         |
      | ROLLOUT_CHANGE    | owner@pedi.ai         |
    Quando o manager consulta "GET /api/v1/admin/feature-flags/pix_enabled/audit?limit=10"
    Então o array retornado deve conter 6 elementos com as actions acima

  @RF-ADM-FF-09 @feliz @paginação
  Cenário: Audit log respeita paginação (limit + offset)
    Quando o manager consulta "GET /api/v1/admin/feature-flags/pix_enabled/audit?limit=2&offset=0"
    Então o status da resposta deve ser 200
    E o corpo deve conter exatamente 2 elementos

  @RF-ADM-FF-09 @erro
  Cenário: Audit log de flag inexistente retorna 404
    Quando o owner consulta "GET /api/v1/admin/feature-flags/flag_inexistente/audit"
    Então o status da resposta deve ser 404

  # ────────────────────────────────────────────────────────────────
  # RNF-RELI-FF-01 — Atomicidade
  # ────────────────────────────────────────────────────────────────

  @RNF-RELI-FF-01 @feliz @atomicidade
  Cenário: Mutação só persiste se auditoria também persistir (mesma transação Prisma)
    Dado que a tabela "feature_flag_audit_logs" está configurada para falhar na inserção (constraint violada)
    Quando o owner tenta criar uma override
    Então o status da resposta deve ser 500
    E a override NÃO deve ter sido persistida em "feature_flag_overrides"
    E nenhuma entrada parcial deve existir em "feature_flag_audit_logs"

  @RNF-RELI-FF-01 @feliz @imutabilidade
  Cenário: Entradas de audit log não podem ser editadas nem deletadas pela API
    Quando um cliente tenta "DELETE /api/v1/admin/feature-flags/pix_enabled/audit/<entry_id>"
    Então o status da resposta deve ser 405 (Method Not Allowed)
    E a entrada de audit log deve continuar existindo no banco