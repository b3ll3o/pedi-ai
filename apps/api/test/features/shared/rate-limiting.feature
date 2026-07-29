# language: pt
# BDD — Rate Limiting (P0-02)
#
# Mapeia: RNF-SEC-FF-01, RF-SEC-01, RNF-AVAIL-01
# Cobertura: garante que o `ThrottlerGuard` está registrado como APP_GUARD no
# AppModule e que os decorators `@Throttle()` e `@SkipThrottle()` SÃO
# HONRADOS — ou seja, atacante NÃO pode enumerar credenciais em
# `/auth/login` ou disparar webhooks forjados sem ser limitado.
#
# **Estratégia (atualizada após BLOCKER #4 — code review):**
# Os cenários "comportamento" usam os controllers REAIS do codebase
# (`AuthController`, `HealthController`, `PaymentsController`) em vez de
# stubs. O `ThrottlerModule.forRoot([...])` é instanciado com a MESMA
# config do `AppModule` (apenas o tier `default`), garantindo que os
# decorators `@Throttle({ default: ... })` e `@SkipThrottle({ default: true })`
# batem com os tiers registrados. Em outras palavras: o BDD agora reflete
# a configuração de produção — se houver drift entre AppModule e feature,
# o teste falha.
#
@shared @security @rate-limit @RF-SEC-01 @RNF-SEC-FF-01
Funcionalidade: Rate limiting global com ThrottlerGuard
  Como um operador do sistema
  Quero que o ThrottlerGuard esteja registrado como APP_GUARD no AppModule
  Para que os decorators @Throttle em controllers públicos efetivamente
  bloqueiem requisições além do limite e protejam contra brute-force

  Contexto:
    Dado que o AppModule declara ThrottlerModule com o tier default 300/min

  # ────────────────────────────────────────────────────────────────
  # P0-02 — ThrottlerGuard registrado como APP_GUARD
  # ────────────────────────────────────────────────────────────────

  @P0-02 @feliz @registro
  Cenário: AppModule registra ThrottlerGuard como APP_GUARD
    Quando o AppModule é instanciado
    Então a lista de providers deve conter um provider APP_GUARD com useClass ThrottlerGuard

  @P0-02 @feliz @comportamento
  Cenário: ThrottlerGuard bloqueia a requisicao alem do limite do decorator @Throttle
    Dado o AuthController real (decorado com @Throttle default 5/min)
    E o ThrottlerGuard registrado como APP_GUARD em um NestJS testing module
    Quando o mesmo IP faz 6 requisicoes ao endpoint /auth/login
    Então as primeiras 5 requisicoes devem ser permitidas
    E a 6a requisicao deve ser bloqueada

  @P0-02 @feliz @skip @health
  Cenário: SkipThrottle permite que health checks ignorem o rate limiter
    Dado o HealthController real (decorado com @SkipThrottle default)
    E o ThrottlerGuard registrado como APP_GUARD em um NestJS testing module
    Quando o mesmo IP faz 100 requisicoes ao endpoint /health
    Então todas as 100 requisicoes devem ser permitidas

  @P0-02 @feliz @security @RF-SEC-01
  Cenário: Decorator Throttle sem guard registrado nao bloqueia nada (P0-02)
    Dado o AuthController real (decorado com @Throttle default 5/min)
    E o ThrottlerGuard NÃO está registrado como APP_GUARD
    Quando o mesmo IP faz 50 requisicoes ao endpoint /auth/login
    Então todas as 50 requisicoes devem ser permitidas (decorator ignorado - bug P0-02)