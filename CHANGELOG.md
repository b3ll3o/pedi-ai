# Changelog

Todas as mudanças notáveis neste projeto são documentadas aqui.

O formato segue, de forma simplificada, o padrão
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e este projeto
adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

Tipos de mudança:

- `Adicionado` — novas funcionalidades.
- `Alterado` — mudanças em funcionalidades existentes.
- `Corrigido` — correções de bugs.
- `Removido` — funcionalidades removidas.
- `Segurança` — correções de vulnerabilidades.

## [Não publicado]

### Segurança

- **P0-11 — Deploy gateia em CI verde** (`fix(ci)`). Substitui o gatilho
  `push: branches: [master]` do workflow `.github/workflows/deploy-vps.yml`
  por `workflow_run` que observa o workflow `CI` com `types: [completed]` em
  `branches: [master]`. O job `deploy` agora só roda se
  `github.event.workflow_run.conclusion == 'success'` ou se o gatilho foi
  `workflow_dispatch` (manual). Antes, builds com testes/lint/scan vermelhos
  eram deployados para produção. `workflow_dispatch` é mantido com os inputs
  `skip_e2e`, `shard` e `test_mode` para permitir rollback manual quando o
  usuário valida o CI localmente.
