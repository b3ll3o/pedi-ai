# language: pt
# BDD — Feature Flags Runtime
# Mapeia: RF-ADM-FF-08 (Evaluator — núcleo do sistema)
# Cobertura: precedência completa + rollout determinístico + fallback
# conforme design.md §6.1 e §6.2.
#
@admin @feature-flags @RF-ADM-FF-08 @RF-ADM-FF-10 @RNF-PERF-FF-01 @RNF-AVAIL-FF-01
Funcionalidade: Avaliar feature flags (resolver valor final)
  Como um sistema cliente (front ou back)
  Quero chamar o endpoint /evaluate para resolver o valor final de uma flag
  Para que o comportamento da aplicação respeite overrides por escopo, rollout e fallback em falha

  Contexto:
    Dado que existe a flag "pix_enabled" com valueType BOOLEAN, enabled=true, defaultValue=false
    E que existe a flag "combos_enabled" com valueType BOOLEAN, enabled=true, defaultValue=true
    E que existe a flag "analytics_enabled" com valueType BOOLEAN, enabled=true, defaultValue=false
    E que o contexto de avaliação é { restaurantId: "rest_aurora", userId: "user_42" }

  # ────────────────────────────────────────────────────────────────
  # Precedência (design.md §6.1)
  # ────────────────────────────────────────────────────────────────

  @RF-ADM-FF-08 @feliz @precedencia
  Cenário: Flag global default ON sem override retorna defaultValue
    Quando o evaluator resolve "combos_enabled" para o contexto atual
    Então o resultado deve ser true (defaultValue)

  @RF-ADM-FF-08 @feliz @precedencia
  Cenário: Override RESTAURANT tem precedência sobre GLOBAL
    Dado que existe override GLOBAL { value: false } para "pix_enabled"
    E que existe override RESTAURANT { scopeId: "rest_aurora", value: true } para "pix_enabled"
    Quando o evaluator resolve "pix_enabled" para { restaurantId: "rest_aurora" }
    Então o resultado deve ser true (override RESTAURANT)

  @RF-ADM-FF-08 @feliz @precedencia
  Cenário: Override USER(restaurantId+userId) tem precedência sobre RESTAURANT
    Dado que existe override RESTAURANT { scopeId: "rest_aurora", value: false } para "pix_enabled"
    E que existe override USER { scopeId: "rest_aurora:user_42", value: true } para "pix_enabled"
    Quando o evaluator resolve "pix_enabled" para { restaurantId: "rest_aurora", userId: "user_42" }
    Então o resultado deve ser true (override USER composto)

  @RF-ADM-FF-08 @feliz @precedencia
  Cenário: Override USER(userId) tem precedência sobre GLOBAL mas não sobre RESTAURANT
    Dado que existe override GLOBAL { value: false } para "pix_enabled"
    E que existe override USER { scopeId: "user_42", value: true } para "pix_enabled"
    Quando o evaluator resolve "pix_enabled" para { restaurantId: "rest_outra", userId: "user_42" }
    Então o resultado deve ser true (override USER global)
    Quando o evaluator resolve "pix_enabled" para { restaurantId: "rest_aurora", userId: "user_42" }
    Então o resultado deve cair para a próxima regra aplicável (RESTAURANT, USER global ou GLOBAL)

  @RF-ADM-FF-08 @feliz @precedencia
  Cenário: enabled=false zera tudo e retorna defaultValue antes de qualquer override
    Dado que a flag "pix_enabled" está com "enabled" igual a false e "defaultValue" igual a false
    E que existe override RESTAURANT { scopeId: "rest_aurora", value: true } para "pix_enabled"
    Quando o evaluator resolve "pix_enabled" para { restaurantId: "rest_aurora" }
    Então o resultado deve ser false (defaultValue, pois enabled=false)

  # ────────────────────────────────────────────────────────────────
  # Rollout determinístico (FNV-1a 64-bit)
  # ────────────────────────────────────────────────────────────────

  @RF-ADM-FF-08 @feliz @rollout @determinismo
  Cenário: Rollout 50% — mesma chave+userId retorna sempre o mesmo valor
    Dado que existe override USER { scopeId: "user_42", rolloutPct: 50, value: true } para "analytics_enabled"
    Quando o evaluator resolve "analytics_enabled" para { userId: "user_42" } 1000 vezes
    Então o resultado deve ser o mesmo em todas as 1000 invocações

  @RF-ADM-FF-08 @feliz @rollout @estatistico @lento
  Cenário: Rollout 50% em 1000 usuários distintos distribui próximo de 500/500
    Dado que existe override GLOBAL { rolloutPct: 50, value: true } para "analytics_enabled"
    Quando o evaluator resolve "analytics_enabled" para 1000 userIds distintos ("user_000" a "user_999")
    Então o número de resultados true deve estar entre 400 e 600 (intervalo 95% de confiança para p=0.5, n=1000)

  @RF-ADM-FF-08 @feliz @rollout
  Cenário: rolloutPct=100 sempre aplica o valor
    Dado que existe override USER { scopeId: "user_42", rolloutPct: 100, value: true } para "analytics_enabled"
    Quando o evaluator resolve "analytics_enabled" para { userId: "user_42" }
    Então o resultado deve ser true

  @RF-ADM-FF-08 @feliz @rollout
  Cenário: rolloutPct=0 nunca aplica o valor
    Dado que existe override USER { scopeId: "user_42", rolloutPct: 0, value: true } para "analytics_enabled"
    Quando o evaluator resolve "analytics_enabled" para { userId: "user_42" }
    Então o resultado deve cair para a próxima regra da cadeia (GLOBAL ou defaultValue)

  # ────────────────────────────────────────────────────────────────
  # Cache + Fallback (RNF-PERF-FF-01, RNF-AVAIL-FF-01)
  # ────────────────────────────────────────────────────────────────

  @RF-ADM-FF-08 @feliz @cache @performance
  Cenário: 1000 avaliações com cache hit têm p99 < 5 ms
    Dado que a flag "combos_enabled" está em cache Redis (camada L1)
    Quando o evaluator é chamado 1000 vezes para "combos_enabled" em ambiente controlado
    Então o p99 da latência deve ser inferior a 5 ms
    E a métrica "feature_flag_cache_hits_total{layer=\"redis\"}" deve ter sido incrementada 1000 vezes

  @RF-ADM-FF-08 @feliz @cache @performance
  Cenário: 1000 avaliações com cache miss têm p99 < 50 ms
    Dado que a flag "combos_enabled" não está em nenhuma camada de cache
    Quando o evaluator é chamado 1000 vezes para "combos_enabled"
    Então o p99 da latência deve ser inferior a 50 ms
    E a métrica "feature_flag_cache_hits_total{layer=\"miss\"}" deve ter sido incrementada

  @RF-ADM-FF-08 @feliz @cache
  Cenário: Cache LRU in-process é consultado quando Redis falha
    Dado que o Redis está fora do ar
    E que "combos_enabled" está no cache LRU in-process
    Quando o evaluator resolve "combos_enabled"
    Então o resultado deve ser retornado a partir do cache LRU
    E a métrica "feature_flag_cache_hits_total{layer=\"lru\"}" deve ter sido incrementada
    E a métrica "feature_flag_fallback_total{reason=\"redis_down\"}" NÃO deve ter sido incrementada (LRU já cobriu)

  @RF-ADM-FF-08 @feliz @fallback @RNF-AVAIL-FF-01
  Cenário: Fallback env-var quando DB e Redis estão indisponíveis
    Dado que tanto Postgres quanto Redis estão fora do ar
    E que a env-var "NEXT_PUBLIC_FEATURE_PIX_ENABLED" está definida como "true"
    Quando o evaluator resolve "pix_enabled"
    Então o resultado deve ser true (env-var legado)
    E a métrica "feature_flag_fallback_total{reason=\"db_down\"}" deve ter sido incrementada
    E nenhum erro 500 deve ser retornado ao cliente

  @RF-ADM-FF-08 @feliz @fallback @RNF-AVAIL-FF-01
  Cenário: Fallback para defaultValue quando DB cai e flag não tem env-var
    Dado que tanto Postgres quanto Redis estão fora do ar
    E que NÃO existe env-var para "combos_enabled"
    Quando o evaluator resolve "combos_enabled"
    Então o resultado deve ser true (defaultValue persistido em cache LRU pré-aquecido)
    E a métrica "feature_flag_fallback_total{reason=\"db_down\"}" deve ter sido incrementada

  @RF-ADM-FF-08 @feliz @fallback @RNF-AVAIL-FF-01
  Cenário: Circuit breaker bypassa DB após 5 falhas consecutivas em 10s
    Dado que o DB está retornando timeout consistentemente
    Quando o evaluator é chamado 5 vezes em 10 segundos e todas falham
    Então nas próximas 30 segundos o evaluator deve bypassar o DB
    E deve retornar valor do cache LRU ou env-var legado
    E a métrica "feature_flag_fallback_total{reason=\"timeout\"}" deve ter sido incrementada ao menos 5 vezes

  # ────────────────────────────────────────────────────────────────
  # API pública /evaluate (RF-ADM-FF-08)
  # ────────────────────────────────────────────────────────────────

  @RF-ADM-FF-08 @feliz @api
  Cenário: Endpoint /evaluate retorna mapa de valores resolvidos
    Quando um cliente envia "GET /api/v1/admin/feature-flags/evaluate?keys=offline_enabled,pix_enabled,combos_enabled&restaurantId=rest_aurora&userId=user_42"
    Então o status da resposta deve ser 200
    E o corpo deve ser um objeto com as chaves "offline_enabled", "pix_enabled" e "combos_enabled"
    E cada valor deve estar tipado de acordo com o valueType da respectiva flag

  @RF-ADM-FF-08 @erro @api
  Cenário: /evaluate rejeita requisição com mais de 32 chaves
    Quando um cliente envia "GET /api/v1/admin/feature-flags/evaluate?keys=<33 chaves>"
    Então o status da resposta deve ser 400
    E o corpo deve conter a mensagem "keys deve conter no máximo 32 itens"

  @RF-ADM-FF-08 @erro @api @rate-limit @RNF-SEC-FF-01
  Cenário: /evaluate aplica rate limit de 100 req/min por IP
    Quando um cliente envia 101 requisições para "/evaluate" em 60 segundos a partir do mesmo IP
    Então a 101ª requisição deve retornar status 429
    E o corpo deve conter a mensagem "Limite de requisições excedido"