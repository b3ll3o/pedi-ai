# language: pt
# BDD — Rate Limiting (P0-02)
#
# Mapeia: RNF-SEC-FF-01, RF-SEC-01, RNF-AVAIL-01
# Cobertura: garante que o `ThrottlerGuard` está registrado como APP_GUARD no
# AppModule e que os decorators `@Throttle()` são HONRADOS — ou seja,
# atacante NÃO pode enumerar credenciais em `/auth/login` ou disparar
# webhooks forjados sem ser limitado.
#
# Contexto do bug (P0-02):
#   `ThrottlerModule` está importado em `app.module.ts` mas `ThrottlerGuard`
#   NÃO está na lista de providers com `APP_GUARD`. Resultado: todos os
#   `@Throttle()` decorators (auth/login: 5/min, orders: 30/min) são IGNORADOS.
#
@shared @security @rate-limit @RF-SEC-01 @RNF-SEC-FF-01
Funcionalidade: Rate limiting global com ThrottlerGuard
  Como um operador do sistema
  Quero que o ThrottlerGuard esteja registrado como APP_GUARD no AppModule
  Para que os decorators @Throttle em controllers públicos efetivamente
  bloqueiem requisições além do limite e protejam contra brute-force

  Contexto:
    Dado que o AppModule declara ThrottlerModule com os tiers short medium e long

  # ────────────────────────────────────────────────────────────────
  # P0-02 — ThrottlerGuard registrado como APP_GUARD
  # ────────────────────────────────────────────────────────────────

  @P0-02 @feliz @registro
  Cenário: AppModule registra ThrottlerGuard como APP_GUARD
    Quando o AppModule é instanciado
    Então a lista de providers deve conter um provider APP_GUARD com useClass ThrottlerGuard

  @P0-02 @feliz @comportamento
  Cenário: ThrottlerGuard bloqueia a requisicao alem do limite declarado via @Throttle
    Dado um controller decorado com decorator Throttle no tier "short" com limit 5
    E o ThrottlerGuard registrado como APP_GUARD em um NestJS testing module
    Quando o mesmo IP faz 6 requisicoes ao endpoint protegido
    Então as primeiras 5 requisicoes devem ser permitidas
    E a 6a requisicao deve ser bloqueada

  @P0-02 @feliz @skip @health
  Cenário: SkipThrottle permite que health checks ignorem o rate limiter
    Dado um controller decorado com decorator SkipThrottle
    E o ThrottlerGuard registrado como APP_GUARD em um NestJS testing module
    Quando o mesmo IP faz 100 requisicoes ao endpoint /health
    Então todas as 100 requisicoes devem ser permitidas

  @P0-02 @feliz @security @RF-SEC-01
  Cenário: Decorator Throttle sem guard registrado nao bloqueia nada (P0-02)
    Dado um controller decorado com decorator Throttle no tier "short" com limit 5
    E o ThrottlerGuard NÃO está registrado como APP_GUARD
    Quando o mesmo IP faz 50 requisicoes ao endpoint protegido
    Então todas as 50 requisicoes devem ser permitidas (decorator ignorado - bug P0-02)