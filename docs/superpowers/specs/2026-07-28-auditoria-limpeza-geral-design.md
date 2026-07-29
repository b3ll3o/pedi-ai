# Design da auditoria e limpeza geral incremental

**Data:** 2026-07-28  
**Status:** Aprovado para especificação; implementação ainda não iniciada  
**Escopo imediato:** Fase 0 — linha-base confiável  
**Repositório:** Pedi-AI

## 1. Objetivo

Conduzir uma revisão abrangente do Pedi-AI sem transformar a iniciativa em um patch único e inseguro. O trabalho deve produzir evidências reproduzíveis, corrigir somente problemas confirmados dentro de limites conservadores, atualizar a documentação conforme o estado validado do código e preservar alterações locais preexistentes.

A iniciativa cobre quatro frentes principais:

1. frontend e experiência offline-first;
2. backend, dados e integrações;
3. qualidade, segurança, CI/CD e operação;
4. documentação, requisitos e rastreabilidade.

## 2. Decisões aprovadas

- A execução será incremental e orientada por evidências.
- A primeira entrega será uma linha-base confiável.
- As validações poderão usar o ambiente local e Docker isolado.
- Produção e serviços externos reais não serão acessados.
- As mudanças serão organizadas em commits locais pequenos por fase.
- Nenhum push será realizado sem autorização adicional.
- Migrações de dados, mudanças profundas de schema, refatorações DDD extensas e alterações incompatíveis ficam fora da limpeza conservadora.

## 3. Estado inicial que deve ser preservado

Na primeira captura da sessão, o working tree continha alterações em:

- `apps/api/package.json`;
- `pnpm-lock.yaml`.

Antes da criação da branch desta iniciativa, essas mudanças passaram a integrar o `HEAD` atual por commits preexistentes ao documento. Elas não foram produzidas pela auditoria e não podem ser revertidas, absorvidas silenciosamente ou atribuídas a ela. A linha-base deve distinguir seus efeitos das mudanças futuras desta iniciativa.

## 4. Princípios de execução

### 4.1 Evidência antes de alteração

Um problema só pode gerar correção quando houver:

- reprodução ou inspeção direta suficiente;
- arquivo e localização identificados;
- impacto concreto descrito;
- causa provável confirmada em nível adequado ao risco;
- método de validação definido.

Hipóteses encontradas durante a exploração não são defeitos confirmados. Elas entram na fila de verificação e podem ser confirmadas, descartadas ou mantidas como risco não comprovado.

### 4.2 Mudança mínima

Cada correção deve ser o menor ajuste capaz de resolver a causa confirmada. Melhorias adjacentes só entram no mesmo lote quando forem necessárias para a correção ou reduzirem diretamente seu risco.

### 4.3 Preservação e reversibilidade

- Nenhum arquivo será excluído sem verificação de referências, uso e histórico.
- Documentos históricos serão preservados e identificados como históricos quando necessário.
- Mudanças independentes não serão misturadas no mesmo commit.
- Operações irreversíveis ou externas exigem autorização específica.

### 4.4 Relato fiel

- Teste pulado não equivale a teste aprovado.
- Execução com zero testes não equivale a sucesso.
- Falha ambiental deve ser diferenciada de regressão de código.
- Gate não executado deve aparecer explicitamente como não executado.
- Uma fase com falha preexistente documentada não será descrita como totalmente verde.

## 5. Arquitetura da iniciativa

A iniciativa é composta por cinco fases sequenciais:

### Fase 0 — linha-base confiável

Coletar o estado real do repositório, executar os gates aplicáveis, confirmar ou descartar hipóteses iniciais e produzir um inventário priorizado de achados.

Esta é a única fase que seguirá imediatamente para um plano de implementação. As fases seguintes terão planos derivados das evidências da Fase 0.

### Fase 1 — segurança e corretude prioritárias

Corrigir somente achados confirmados de prioridade P0 ou P1, incluindo vulnerabilidades exploráveis, falhas de autorização ou isolamento entre tenants, perda ou corrupção de dados, erros de cobrança ou idempotência e automações que reportem falso sucesso.

### Fase 2 — limpeza conservadora

Tratar scripts duplicados, configurações comprovadamente mortas, pequenas duplicações, imports e tipos inconsistentes, hooks desconectados e arquivos inequivocamente obsoletos.

Não fazem parte desta fase:

- migração monetária ampla;
- reestruturação completa de bounded contexts;
- alteração incompatível de contratos;
- mudança profunda do schema Prisma;
- remoção de compatibilidade legada sem confirmação de todos os consumidores.

### Fase 3 — atualização documental

Atualizar os documentos a partir do código e dos resultados finais, incluindo hubs, índices, guias, OpenSpec, requisitos, codemaps e instruções operacionais. Contagens serão atualizadas somente com dados obtidos durante a execução.

### Fase 4 — revisão final

Reexecutar gates aplicáveis, consolidar a matriz de achados, registrar riscos residuais e produzir o backlog priorizado de mudanças profundas.

## 6. Fluxo de dados e decisões

```text
Estado atual do repositório
        ↓
Validações independentes
        ↓
Evidências reproduzíveis
        ↓
Deduplicação e confirmação
        ↓
Classificação por severidade e risco
        ↓
Correção mínima em fase apropriada
        ↓
Teste de regressão e revalidação
        ↓
Documentação alinhada ao resultado
        ↓
Commit local da fase
```

Cada achado deve conter:

- identificador estável;
- categoria;
- severidade e prioridade;
- evidência;
- cenário de falha ou impacto;
- arquivos afetados;
- status de confirmação;
- correção proposta;
- validação exigida;
- resultado final: corrigido, pendente, descartado ou bloqueado.

## 7. Frentes de validação

### 7.1 Código e arquitetura

- fronteiras DDD e direção das dependências;
- duplicações e código morto;
- complexidade e responsabilidades excessivas;
- tipagem e contratos entre camadas;
- compatibilidade entre implementações legadas e novas.

### 7.2 Backend e dados

- autenticação e ciclo de sessão;
- RBAC, BOLA/IDOR e isolamento multi-tenant;
- pagamentos, webhooks e idempotência;
- Prisma, migrations, transações e concorrência;
- filas, retries, realtime e observabilidade;
- tratamento de PII e requisitos de segurança.

### 7.3 Frontend

- fluxos offline-first e sincronização;
- IndexedDB, service worker e persistência de estado;
- React, Zustand e React Query;
- rotas e handlers do Next.js;
- acessibilidade, responsividade e performance;
- tratamento de loading, erro e reconexão.

### 7.4 Qualidade e operação

- ESLint, Prettier e TypeScript;
- testes unitários, integração, BDD, contrato e E2E;
- cobertura por app e package;
- scripts pnpm e workspaces;
- Dockerfiles, Compose, Nginx e systemd;
- GitHub Actions, hooks Git e auditoria de dependências.

### 7.5 Documentação

- links e caminhos citados;
- comandos documentados;
- contagens de testes e inventários;
- estrutura real do monorepo;
- fontes de verdade e documentos duplicados;
- OpenSpec, requisitos e matriz de rastreabilidade;
- separação entre documentação atual e histórica.

## 8. Gates de validação

Os gates serão executados do menor para o maior custo.

### Gate 1 — integridade e análise estática

- registrar estado do Git;
- validar workspaces, scripts e lockfile;
- executar lint da web e da API;
- executar TypeScript por app e package;
- verificar formatação sem reformatar indiscriminadamente o repositório.

### Gate 2 — testes rápidos

- executar testes unitários de frontend, backend e packages;
- executar testes de integração;
- executar testes do SDK de feature flags;
- gerar cobertura real e confrontá-la com o mínimo de 80%;
- identificar exclusões que possam tornar a cobertura enganosa.

### Gate 3 — builds e contratos

- construir packages compartilhados;
- construir API e frontend;
- executar BDD e testes de contrato quando seus pré-requisitos locais estiverem disponíveis;
- exportar e validar OpenAPI sem publicação externa.

### Gate 4 — Docker e E2E

- subir somente infraestrutura local de desenvolvimento ou teste;
- validar banco, schema/migrations, seed e health checks;
- executar smoke e critical antes da suíte completa;
- executar a suíte E2E completa somente após os subconjuntos passarem;
- detectar explicitamente execuções com zero testes;
- não executar E2E de produção.

### Gate 5 — segurança e operação

- revisar segredos rastreados e exposição de configuração;
- validar autenticação, autorização, webhooks e idempotência;
- auditar dependências e overrides;
- revisar containers, proxy, workflows e hooks;
- não executar stress ou carga destrutiva;
- propor separadamente qualquer smoke de carga local que se torne necessário.

### Gate 6 — documentação

- validar links e caminhos;
- conferir comandos contra scripts reais;
- regenerar a matriz de rastreabilidade quando aplicável;
- atualizar contagens somente com resultados da execução;
- registrar qualquer validação bloqueada ou não executada.

## 9. Tratamento de erros e bloqueios

Quando um gate falhar:

1. preservar a saída original relevante;
2. classificar a falha como código, ambiente, fixture, configuração ou dependência externa;
3. reproduzir com o menor comando aplicável;
4. evitar alterações até que a causa esteja suficientemente confirmada;
5. corrigir apenas se a mudança couber na fase corrente;
6. registrar como pendência quando a solução exigir trabalho fora do escopo.

Se uma correção inicialmente pequena crescer para migração de dados, mudança incompatível ou refatoração ampla, ela será interrompida e movida para o backlog da Fase 4.

## 10. Entregas

### Entrega da Fase 0

- relatório de todos os gates executados;
- inventário validado do projeto;
- lista deduplicada de achados confirmados;
- separação entre problemas de código, ambiente, teste e documentação;
- classificação por severidade, risco e esforço;
- recomendação objetiva para a Fase 1.

### Entregas das fases seguintes

- correções com testes de regressão;
- commits locais focados;
- documentação atualizada conforme o estado final;
- matriz final de achados;
- riscos residuais e backlog priorizado.

## 11. Estratégia de versionamento

- O trabalho ocorrerá em branch dedicada.
- O documento de design terá commit próprio.
- Cada fase terá um ou mais commits pequenos, separados por causa comum.
- Arquivos preexistentes modificados só serão incluídos em commit quando a alteração da fase exigir explicitamente sua edição e o diff puder ser separado com segurança.
- Nenhum push, merge, tag ou publicação será executado sem autorização adicional.

## 12. Critérios globais de conclusão

A iniciativa será considerada concluída quando:

- alterações locais preexistentes estiverem preservadas;
- achados estiverem sustentados por evidência;
- exclusões tiverem sido verificadas por uso e histórico;
- todos os gates aplicáveis tiverem resultado registrado;
- testes pulados, zerados ou bloqueados estiverem explicitamente identificados;
- nenhuma operação tiver sido executada contra produção;
- documentação e código refletirem o mesmo estado validado;
- commits estiverem separados por fase e responsabilidade;
- riscos não corrigidos estiverem priorizados e justificados.

## 13. Limite desta especificação

Este documento define o desenho guarda-chuva da iniciativa. O próximo plano de implementação abrangerá exclusivamente a Fase 0. Fases 1 a 4 serão planejadas após a linha-base, usando os achados confirmados para evitar escopo especulativo.
