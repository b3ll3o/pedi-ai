# Delta for Testes - Otimização E2E

## ADDED Requirements

### Requirement: Network Blocking para Testes E2E

O sistema DEVE bloquear requests a recursos externos não essenciais durante a execução dos testes E2E para reduzir latência e tempo de execução.

#### Scenario: Bloquear fonts externas
- GIVEN um teste E2E está executando
- WHEN o navegador tenta carregar fonts de fonts.googleapis.com ou fonts.gstatic.com
- THEN o request DEVE ser interceptado e retornar resposta vazia/mocked

#### Scenario: Bloquear analytics e tracking
- GIVEN um teste E2E está executando
- WHEN o navegador tenta carregar scripts de analytics (google-analytics, facebook pixel, etc)
- THEN o request DEVE ser interceptado e bloqueado

#### Scenario: Permitir recursos essenciais
- GIVEN um teste E2E está executando
- WHEN o navegador tenta carregar recursos do localhost ou domínios da aplicação
- THEN o request DEVE prosseguir normalmente sem interceptação

---

### Requirement: Tags de Execução Seletiva

O sistema DEVE suportar tags para classificar testes E2E por criticidade, permitindo execução seletiva.

#### Scenario: Testes @critical executam rapidamente
- GIVEN o desenvolvedor executa `pnpm test:e2e:critical`
- WHEN existem testes marcados com @critical
- THEN apenas testes @critical DEVEM ser executados
- AND o tempo total DEVE ser menor que 2 minutos

#### Scenario: Testes @smoke validam fluxo principal
- GIVEN o desenvolvedor executa `pnpm test:e2e:smoke`
- WHEN existem testes marcados com @smoke
- THEN apenas testes @smoke DEVEM ser executados
- AND DEVEM cobrir login, navegação principal e checkout

#### Scenario: Testes @slow são isolados
- GIVEN o desenvolvedor executa `pnpm test:e2e` (completo)
- WHEN existem testes marcados com @slow
- THEN todos os testes DEVEM executar
- AND testes @slow DEVEM executar por último ou em workers dedicados

---

### Requirement: Soft Assertions

O sistema DEVE搜集 todas as falhas de asserção antes de reportar erro, permitindo debugging completo.

#### Scenario: Múltiplas falhas são coletadas
- GIVEN um teste tem 3 asserções que falham
- WHEN uma asserção falha
- THEN o teste DEVE continuar executando
- AND ao final, DEVE reportar todas as 3 falhas juntas

#### Scenario: Primeira falha para debug rápido
- GIVEN um desenvolvedor configura modo "fail fast"
- WHEN uma asserção falha
- THEN o teste DEVE parar imediatamente
- AND o reporter DEVE mostrar o stack trace completo

---

### Requirement: Fixture de Sessão Reutilizável

O sistema DEVE permitir reuse de sessão autenticada entre testes para evitar login redundante.

#### Scenario: Sessão autenticada é reutilizada
- GIVEN 5 testes precisam de usuário autenticado
- WHEN o primeiro teste faz login
- THEN os próximos 4 testes DEVEM reutilizar a mesma sessão
- AND o tempo total DEVE ser menor que fazer login 5 vezes

#### Scenario: Sessão expira é renovada
- GIVEN um teste tenta usar sessão autenticada expirada
- WHEN a API retorna 401 Unauthorized
- THEN o fixture DEVE fazer novo login automático
- AND o teste DEVE continuar normalmente

---

### Requirement: Sharding para CI

O sistema DEVE suportar sharding de testes em múltiplos workers para CI.

#### Scenario: Sharding 4-way
- GIVEN o CI configura 4 shards
- WHEN a suite de 100 testes executa
- THEN cada shard DEVE executar ~25 testes
- AND o tempo total DEVE ser ~4x mais rápido que execução sequencial

#### Scenario: Shard parcial por falha
- GIVEN um shard encontra falhas
- WHEN outros shards ainda estão executando
- THEN o shard com falha DEVE continuar executando os testes restantes
- AND ao final, TODOS os shards DEVEM completar antes do report

---

### Requirement: selectors Otimizados

O sistema DEVE usar role-based locators ao invés de CSS selectors hardcoded.

#### Scenario: Selector de botão de login
- GIVEN o Page Object precisa encontrar o botão de login
- WHEN busca pelo texto "Entrar" ou role="button"
- THEN o locator DEVE ser `getByRole('button', { name: /entrar/i })`
- AND NÃO DEVE usar `data-testid="login-button"` hardcoded

#### Scenario: Selector de input de email
- GIVEN o Page Object precisa encontrar o campo de email
- WHEN busca pelo label ou type="email"
- THEN o locator DEVE ser `getByLabel(/email/i)` ou `getByRole('textbox', { name: /email/i })`
- AND NÃO DEVE usar `#email-input` ou `[data-testid="email"]`

---

## MODIFIED Requirements

Nenhum.

## REMOVED Requirements

Nenhum.