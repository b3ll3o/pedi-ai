# Fase 0 — Linha-base confiável — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma linha-base reproduzível do Pedi-AI coletando estado real do repositório, executando os Gates 1–6 em modo estritamente observacional e produzindo um inventário priorizado de achados — sem aplicar correções a defeitos confirmados nesta fase.

**Architecture:** Execução 100% local, sem acessar produção ou serviços externos reais. Cada gate gera artefatos sanitizados em `/tmp/auditoria-2026-07-29/` (logs brutos, JSON de cobertura, resultados Playwright, diffs do RTM) e o relatório final é versionado em `docs/auditorias/`. Docker é usado apenas para subir um PostgreSQL efêmero (porta 55432, tmpfs) e descartar a stack `docker-compose.dev.yml` por ter nomes fixos. Esta fase é observação + classificação; toda correção de defeito confirmado fica fora do escopo e migra para a Fase 1.

**Tech Stack:** pnpm 9, Node 20, Vitest 4, ESLint 9, TypeScript 6, NestJS 11, Prisma 7.8, PostgreSQL 16 (Docker), Playwright, gitleaks (opcional), Docker CLI.

---

## Pré-trabalho (validação do ambiente)

Estes passos são executados uma única vez no início da Fase 0. Falha aqui classifica o gate subsequente como **bloqueado por ambiente**, não como defeito do código.

### Task 0.1 — Verificar branch e working tree limpos

**Files:** nenhum.

- [ ] **Step 1: Confirmar branch dedicada**

```bash
git rev-parse --abbrev-ref HEAD
git log -1 --pretty='%h %s'
```

**Esperado:**

- Branch: `chore/auditoria-limpeza-geral-2026-07-28`
- HEAD: `cad571d docs(auditoria): registrar design da limpeza incremental`

- [ ] **Step 2: Confirmar working tree limpo**

```bash
git status --porcelain
```

**Esperado:** saída vazia. Se houver arquivos modificados, registre o desvio na seção "Estado preservado" do relatório e **não** commite nada automático — mostre ao usuário.

- [ ] **Step 3: Confirmar ferramentas necessárias**

```bash
node --version      # esperado: v20.x
pnpm --version      # esperado: 9.x
docker --version    # esperado: presente
psql --version      # esperado: cliente disponível (somente para sanity-checks)
```

**Falha esperada:** se `docker` ausente, Tasks 0.13, 0.14 e 0.18–0.20 ficam **bloqueadas por ambiente** — registre no relatório, prossiga com os Gates 1, 2, 3 parciais e 6.

- [ ] **Step 4: Criar diretórios efêmeros de artefatos**

```bash
mkdir -p /tmp/auditoria-2026-07-29/logs
mkdir -p /tmp/auditoria-2026-07-29/raw
mkdir -p /tmp/auditoria-2026-07-29/coverage
mkdir -p /tmp/auditoria-2026-07-29/e2e-results
mkdir -p /tmp/auditoria-2026-07-29/e2e-traces
```

**Esperado:** sem erro. Não versionar esse diretório.

- [ ] **Step 5: Registrar data atual no log de auditoria**

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ" > /tmp/auditoria-2026-07-29/logs/00-context.log
pnpm --silent -- recursive --if-present run 2>/dev/null | head -40 >> /tmp/auditoria-2026-07-29/logs/00-context.log
```

### Task 0.2 — Capturar snapshot Git completo

**Files:** nenhum (saída em `/tmp/auditoria-2026-07-29/raw/`).

- [ ] **Step 1: reflog dos últimos 20 commits**

```bash
git reflog -20 > /tmp/auditoria-2026-07-29/raw/01-reflog.txt
```

- [ ] **Step 2: Hash do HEAD e contagem de alterações preexistentes**

```bash
git rev-parse HEAD > /tmp/auditoria-2026-07-29/raw/02-head.txt
git log --oneline -30 > /tmp/auditoria-2026-07-29/raw/03-recent-commits.txt
git diff --stat HEAD~1..HEAD > /tmp/auditoria-2026-07-29/raw/04-spec-diff.txt
```

- [ ] **Step 3: Listar arquivos rastreados por bounded context**

```bash
git ls-files apps/api/src | head -200 > /tmp/auditoria-2026-07-29/raw/05-api-tracked.txt
git ls-files apps/web/src | wc -l > /tmp/auditoria-2026-07-29/raw/06-web-tracked-count.txt
git ls-files apps/web/tests | wc -l > /tmp/auditoria-2026-07-29/raw/07-tests-tracked-count.txt
git ls-files .openspec/specs | head -200 > /tmp/auditoria-2026-07-29/raw/08-openspec-tracked.txt
git ls-files docs/requirements | head -50 > /tmp/auditoria-2026-07-29/raw/09-docs-requirements.txt
```

- [ ] **Step 4: Registrar estado de tags e remoto**

```bash
git tag --sort=-v:refname | head -10 > /tmp/auditoria-2026-07-29/raw/10-tags.txt 2>/dev/null
git remote -v > /tmp/auditoria-2026-07-29/raw/11-remotes.txt
```

**Falha esperada:** se algum comando falhar, registre a saída bruta no log e classifique como falha de ambiente.

### Task 0.3 — Validar pnpm-workspace e lockfile

**Files:** nenhum. Saída em `/tmp/auditoria-2026-07-29/raw/`.

- [ ] **Step 1: Exibir configuração de workspaces**

```bash
cat pnpm-workspace.yaml > /tmp/auditoria-2026-07-29/raw/12-pnpm-workspace.yaml
```

- [ ] **Step 2: Confirmar integridade do lockfile**

```bash
pnpm install --frozen-lockfile --prefer-offline 2>&1 | tee /tmp/auditoria-2026-07-29/logs/01-pnpm-install.log
echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/13-pnpm-install-exit.txt
```

**Esperado:** `exit=0`. Caso `exit≠0`, registre o output bruto em `/tmp/auditoria-2026-07-29/logs/01-pnpm-install.log` e **não tente corrigir** — registre como achado da Fase 0 com categoria "ambiente/dependência".

- [ ] **Step 3: Validar listagem de workspaces**

```bash
pnpm -r ls --depth=-1 --json > /tmp/auditoria-2026-07-29/raw/14-workspaces.json 2>/tmp/auditoria-2026-07-29/logs/02-pnpm-ls.log
echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/15-pnpm-ls-exit.txt
```

**Atenção:** observe se o resultado inclui `apps/api/node_modules` e `apps/web/node_modules` como workspaces — são entradas suspeitas (não deveriam ser workspaces). Registre como **hipótese de higiene** a confirmar com leitura direta do `pnpm-workspace.yaml`.

---

## Gate 1 — Integridade e análise estática

### Task 1.1 — Build de pacote `packages/shared`

**Files:** `packages/shared/dist/` (gerado, gitignored).

- [ ] **Step 1: Compilar shared**

```bash
pnpm --filter @pedi-ai/shared build 2>&1 | tee /tmp/auditoria-2026-07-29/logs/10-shared-build.log
echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/16-shared-build-exit.txt
```

**Esperado:** `exit=0` e existência de `packages/shared/dist/index.js`, `dist/constants/index.js`, `dist/utils/index.js`, `dist/types/index.d.ts`.

- [ ] **Step 2: Listar artefatos gerados**

```bash
ls packages/shared/dist > /tmp/auditoria-2026-07-29/raw/17-shared-dist.txt 2>&1
```

**Falha esperada:** se `dist/utils/index.js` não existir e o código de outros pacotes importa `@pedi-ai/shared/utils`, registre como **achado P0** quebrando build downstream — não conserte nesta fase.

### Task 1.2 — TypeScript por app e package

**Files:** nenhum (validação pura).

- [ ] **Step 1: Type-check `apps/web`**

```bash
cd apps/web && pnpm exec tsc --noEmit 2>&1 | tee /tmp/auditoria-2026-07-29/logs/20-web-tsc.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/20-web-tsc-exit.txt
```

- [ ] **Step 2: Type-check `apps/api`**

```bash
cd apps/api && pnpm exec tsc --noEmit 2>&1 | tee /tmp/auditoria-2026-07-29/logs/21-api-tsc.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/21-api-tsc-exit.txt
```

- [ ] **Step 3: Type-check `packages/feature-flags`**

```bash
cd packages/feature-flags && pnpm exec tsc --noEmit 2>&1 | tee /tmp/auditoria-2026-07-29/logs/22-ff-tsc.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/22-ff-tsc-exit.txt
```

- [ ] **Step 4: Type-check `packages/shared`**

```bash
cd packages/shared && pnpm exec tsc --noEmit 2>&1 | tee /tmp/auditoria-2026-07-29/logs/23-shared-tsc.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/23-shared-tsc-exit.txt
```

**Tratamento de falhas:** se qualquer `exit≠0`, registre o arquivo de log no relatório como **evidência de defeito de código** (ou **drift de versão de tipos** se a falha for entre React 19.2.6 e 19.2.7).

### Task 1.3 — Lint (raiz, web, api)

**Files:** nenhum.

- [ ] **Step 1: Lint da raiz**

```bash
pnpm lint 2>&1 | tee /tmp/auditoria-2026-07-29/logs/30-root-lint.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/30-root-lint-exit.txt
```

- [ ] **Step 2: Resumir contagem de violações por app**

```bash
grep -E 'error|warning' /tmp/auditoria-2026-07-29/logs/30-root-lint.log | awk -F' ' '{print $1}' | sort | uniq -c | sort -rn > /tmp/auditoria-2026-07-29/raw/31-root-lint-summary.txt
```

**Esperado:** se o total for > 0, registre como achado sem corrigir. Não execute `lint --fix`.

### Task 1.4 — Complexidade ciclomática (ESLint plugin `complexity`)

**Files:** nenhum.

- [ ] **Step 1: Inspecionar configuração ESLint quanto à regra de complexidade**

```bash
grep -nE 'complexity' .eslintrc* eslint.config.* apps/api/eslint.config.* apps/web/eslint.config.* 2>/dev/null | head -20 > /tmp/auditoria-2026-07-29/raw/40-complexity-config.txt
```

- [ ] **Step 2: Replicar contagem `complexity` igual à do CI**

```bash
cd apps/api && pnpm exec eslint --rule '{"complexity":["error",{"max":15}]}' --no-eslintrc -c <(cat ../../eslint.config.* 2>/dev/null || true) --format json 'src/**/*.ts' 2>/dev/null > /tmp/auditoria-2026-07-29/raw/41-complexity-api.json
```

**Nota:** o comando acima é aproximado. Se a config exata exigir sintaxe específica, registre como **bloqueio de instrumentação** — não chute regra. Documente o comando exato e mantenha a saída bruta para a Fase 4.

---

## Gate 2 — Testes rápidos

### Task 2.1 — Testes unitários web

**Files:** nenhum.

- [ ] **Step 1: Executar `pnpm test:unit`**

```bash
pnpm test:unit 2>&1 | tee /tmp/auditoria-2026-07-29/logs/50-unit-web.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/50-unit-web-exit.txt
```

- [ ] **Step 2: Extrair totais**

```bash
grep -oE 'Tests *[0-9]+|passed|failed' /tmp/auditoria-2026-07-29/logs/50-unit-web.log | tail -10 > /tmp/auditoria-2026-07-29/raw/51-unit-web-summary.txt
```

**Falha esperada:** se total de testes for 0 (`Tests 0`), registre como **gate não executado** e bloqueie a contagem de cobertura.

### Task 2.2 — Testes unitários feature-flags

**Files:** nenhum.

- [ ] **Step 1: Executar suite isolada**

```bash
pnpm --filter @pedi-ai/feature-flags test 2>&1 | tee /tmp/auditoria-2026-07-29/logs/51-unit-ff.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/52-unit-ff-exit.txt
```

### Task 2.3 — Testes integração web

- [ ] **Step 1: Executar `pnpm test:integration`**

```bash
pnpm test:integration 2>&1 | tee /tmp/auditoria-2026-07-29/logs/52-integration-web.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/53-integration-web-exit.txt
```

### Task 2.4 — Testes API

- [ ] **Step 1: Executar `pnpm --filter @pedi-ai/api test`**

```bash
pnpm --filter @pedi-ai/api test 2>&1 | tee /tmp/auditoria-2026-07-29/logs/53-unit-api.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/54-unit-api-exit.txt
```

**Atenção:** o `include` está em `apps/api/vitest.config.ts` — `**/*.spec.ts` e `**/*.test.ts`. Se nenhum teste existir, registre como "Gate executado com zero testes — não contar como verde".

### Task 2.5 — Cobertura agregada (web + api + ff + shared)

- [ ] **Step 1: Cobertura da raiz (`pnpm test:coverage`)**

```bash
pnpm test:coverage 2>&1 | tee /tmp/auditoria-2026-07-29/logs/60-coverage-root.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/60-coverage-root-exit.txt
```

- [ ] **Step 2: Copiar relatório v8 consolidado**

```bash
cp coverage/coverage-summary.json /tmp/auditoria-2026-07-29/coverage/root-coverage-summary.json 2>/dev/null || echo "missing" > /tmp/auditoria-2026-07-29/coverage/root-coverage-summary.json
```

- [ ] **Step 3: Cobertura dedicada da api**

```bash
pnpm --filter @pedi-ai/api test:cov 2>&1 | tee /tmp/auditoria-2026-07-29/logs/61-coverage-api.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/61-coverage-api-exit.txt
cp apps/api/coverage/coverage-summary.json /tmp/auditoria-2026-07-29/coverage/api-coverage-summary.json 2>/dev/null || echo "missing" > /tmp/auditoria-2026-07-29/coverage/api-coverage-summary.json
```

- [ ] **Step 4: Cobertura feature-flags**

```bash
pnpm --filter @pedi-ai/feature-flags exec vitest run --coverage 2>&1 | tee /tmp/auditoria-2026-07-29/logs/62-coverage-ff.log
cp packages/feature-flags/coverage/coverage-summary.json /tmp/auditoria-2026-07-29/coverage/ff-coverage-summary.json 2>/dev/null || echo "missing" > /tmp/auditoria-2026-07-29/coverage/ff-coverage-summary.json
```

**Falha esperada:** se qualquer `coverage-summary.json` ausente, registre como **gate parcialmente não executado**. Se thresholds de 80% forem atingidos somente após excluder pastas críticas (`apps/web/src/presentation`, `apps/web/src/infrastructure`, `apps/web/src/hooks`, `apps/web/src/app`, `apps/api/src/**`), marque como **risco de cobertura ilusória**.

---

## Gate 3 — Builds, OpenAPI e contratos

### Task 3.1 — Build da API

**Files:** `apps/api/dist/` (gitignored).

- [ ] **Step 1: Compilar NestJS**

```bash
pnpm --filter @pedi-ai/api build 2>&1 | tee /tmp/auditoria-2026-07-29/logs/70-api-build.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/70-api-build-exit.txt
```

- [ ] **Step 2: Conferir artefato principal**

```bash
ls apps/api/dist/main.js > /tmp/auditoria-2026-07-29/raw/71-api-dist.txt 2>&1
```

### Task 3.2 — Exportação OpenAPI

**Files:** `apps/api/openapi.yaml` (gitignored).

- [ ] **Step 1: Exportar Swagger**

```bash
pnpm --filter @pedi-ai/api openapi:export 2>&1 | tee /tmp/auditoria-2026-07-29/logs/71-openapi.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/72-openapi-exit.txt
```

- [ ] **Step 2: Verificar arquivo gerado**

```bash
ls -la apps/api/openapi.yaml > /tmp/auditoria-2026-07-29/raw/73-openapi-file.txt 2>&1
head -40 apps/api/openapi.yaml > /tmp/auditoria-2026-07-29/raw/74-openapi-head.txt 2>&1
```

**Falha esperada:** se `apps/api/openapi.yaml` ausente após `exit=0`, registre como **drift entre script e artefato** (candidato a achado confirmado, não corrigir).

### Task 3.3 — BDD (somente se viável sem infra externa)

- [ ] **Step 1: Listar features disponíveis**

```bash
ls apps/api/test/features 2>/dev/null > /tmp/auditoria-2026-07-29/raw/75-bdd-features.txt
ls apps/api/test/features/admin 2>/dev/null >> /tmp/auditoria-2026-07-29/raw/75-bdd-features.txt
```

- [ ] **Step 2: Tentar BDD `gerenciar-flags` (subconjunto focado)**

```bash
cd apps/api && pnpm test:bdd:gerenciar 2>&1 | tee /tmp/auditoria-2026-07-29/logs/72-bdd-flags.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/76-bdd-flags-exit.txt
```

**Atenção:** BDD pode exigir Postgres + Redis ativos. Sem isso, registre como **gate bloqueado por ambiente** e prossiga.

### Task 3.4 — Contratos Dredd

- [ ] **Step 1: Inspecionar script e dependência**

```bash
ls apps/api/scripts/contract-test.js > /tmp/auditoria-2026-07-29/raw/77-contract-script.txt 2>&1
pnpm --filter @pedi-ai/api exec dredd --version > /tmp/auditoria-2026-07-29/raw/78-dredd-version.txt 2>&1
```

- [ ] **Step 2: Tentar gerar `apps/api/openapi.yaml` e validar**

```bash
test -f apps/api/openapi.yaml && cat apps/api/openapi.yaml | head -100 > /tmp/auditoria-2026-07-29/raw/79-openapi-sample.txt
```

**Atenção:** Dredd precisa de API em execução (`API_URL`). Sem API no Gate 4 (Task 4.1), pule. Registre como **gate postergado para após subir a API**.

---

## Gate 4 — Docker isolado + E2E

A estratégia é:

1. subir PostgreSQL efêmero via `docker run` (porta 55432, tmpfs);
2. aplicar schema, seedar e iniciar API em 13001 e Web em 13000;
3. rodar E2E: smoke → critical → full;
4. limpar container e processos em qualquer cenário.

### Task 4.1 — Subir PostgreSQL efêmero

**Files:** nenhum.

- [ ] **Step 1: Iniciar container temporário**

```bash
docker run --rm -d \
  --name pediaudit-pg-2026-07-29 \
  -e POSTGRES_DB=pedi_ai_audit \
  -e POSTGRES_USER=auditor \
  -e POSTGRES_PASSWORD=auditor_local_pw \
  -p 127.0.0.1:55432:5432 \
  --tmpfs /var/lib/postgresql/data:size=128m \
  --health-cmd "pg_isready -U auditor -d pedi_ai_audit" \
  --health-interval 3s --health-timeout 3s --health-retries 10 \
  postgres:16-alpine > /tmp/auditoria-2026-07-29/raw/80-pg-container.txt 2>&1
CONTAINER_ID=$(docker ps -aq --filter name=pediaudit-pg-2026-07-29)
echo "$CONTAINER_ID" > /tmp/auditoria-2026-07-29/raw/81-pg-container-id.txt
```

- [ ] **Step 2: Aguardar healthy**

```bash
for i in $(seq 1 30); do
  status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_ID" 2>/dev/null || echo "starting")
  echo "$(date +%T) $status" >> /tmp/auditoria-2026-07-29/logs/80-pg-wait.log
  [ "$status" = "healthy" ] && break
  sleep 2
done
grep -c healthy /tmp/auditoria-2026-07-29/logs/80-pg-wait.log | xargs -I{} echo "healthy_seen={}" > /tmp/auditoria-2026-07-29/raw/82-pg-ready.txt
```

**Esperado:** `healthy_seen>=1`. Caso contrário, registre como falha de ambiente e pule o Gate 4.

- [ ] **Step 3: Testar conexão TCP**

```bash
PGPASSWORD=auditor_local_pw psql -h 127.0.0.1 -p 55432 -U auditor -d pedi_ai_audit -c 'SELECT 1;' > /tmp/auditoria-2026-07-29/logs/81-pg-connect.log 2>&1
```

### Task 4.2 — Aplicar schema e seedar

- [ ] **Step 1: Configurar `DATABASE_URL` no `.env.local` da auditoria**

```bash
cat > /tmp/auditoria-2026-07-29/audit.env <<'EOF'
DATABASE_URL=postgresql://auditor:auditor_local_pw@127.0.0.1:55432/pedi_ai_audit?schema=public
JWT_SECRET=audit_local_secret_only
JWT_REFRESH_SECRET=audit_local_refresh_only
JWT_ISSUER=pedi-ai-audit
JWT_AUDIENCE=pedi-ai-audit
PII_ENCRYPTION_KEY=$(openssl rand -hex 32)
QR_SECRET_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
COOKIE_SECRET=$(openssl rand -hex 32)
CSRF_SECRET=$(openssl rand -hex 32)
PORT=13001
HOST=0.0.0.0
ALLOWED_ORIGINS=http://127.0.0.1:13000
NODE_ENV=test
NEXT_PUBLIC_API_URL=http://127.0.0.1:13001
NEXT_PUBLIC_APP_URL=http://127.0.0.1:13000
NEXT_TELEMETRY_DISABLED=1
EOF
```

**Importante:** esses segredos são **exclusivos** desta auditoria, gerados localmente; nunca commitar, nunca inserir em `.env` versionado.

- [ ] **Step 2: `prisma db push`**

```bash
set -a; source /tmp/auditoria-2026-07-29/audit.env; set +a
cd apps/api && pnpm exec prisma db push --accept-data-loss 2>&1 | tee /tmp/auditoria-2026-07-29/logs/82-prisma-push.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/83-prisma-push-exit.txt
```

- [ ] **Step 3: Seed mínimo (Prisma client direto)**

```bash
cd apps/api && pnpm exec tsx -e "import{PrismaClient}from'@prisma/client';const p=new PrismaClient();const u=await p.usersProfiles.upsert({where:{email:'audit-admin@pedi.ai.test'},update:{},create:{email:'audit-admin@pedi.ai.test',passwordHash:'\$2b\$10\$abcdefghijklmnopqrstuv',role:'OWNER'}});console.log('user',u.id);await p.\$disconnect();" 2>&1 | tee /tmp/auditoria-2026-07-29/logs/83-prisma-seed.log
```

> O hash bcrypt acima é apenas dummy; não tentar autenticar com ele. Apenas garantir ao menos 1 row em `usersProfiles` para satisfazer seeds E2E. Se seeds E2E exigirem mais dados, **não** tentar completar — registrar como dependência do seed oficial.

### Task 4.3 — Subir API em 13001

**Files:** nenhum (apenas processo).

- [ ] **Step 1: Iniciar API**

```bash
cd apps/api && set -a; source /tmp/auditoria-2026-07-29/audit.env; set +a
nohup node dist/main.js > /tmp/auditoria-2026-07-29/logs/84-api-startup.log 2>&1 &
echo $! > /tmp/auditoria-2026-07-29/raw/84-api.pid
```

- [ ] **Step 2: Esperar `/health`**

```bash
for i in $(seq 1 40); do
  resp=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:13001/health 2>/dev/null || echo "000")
  echo "$(date +%T) http=$resp" >> /tmp/auditoria-2026-07-29/logs/85-api-health.log
  [ "$resp" = "200" ] && break
  sleep 2
done
grep -c 'http=200' /tmp/auditoria-2026-07-29/logs/85-api-health.log | xargs -I{} echo "ready={}" > /tmp/auditoria-2026-07-29/raw/85-api-ready.txt
```

**Atenção:** se `ready=0`, inspecione o log em `/tmp/auditoria-2026-07-29/logs/84-api-startup.log`. Se a API subir mas `/health` retornar 404, registre o endpoint real observado (anote a rota que respondeu 200 ou 404) — é achado para a Fase 1.

### Task 4.4 — Subir Web em 13000

- [ ] **Step 1: Iniciar Web**

```bash
cd apps/web && set -a; source /tmp/auditoria-2026-07-29/audit.env; set +a
nohup pnpm dev -- --port 13000 > /tmp/auditoria-2026-07-29/logs/86-web-startup.log 2>&1 &
echo $! > /tmp/auditoria-2026-07-29/raw/86-web.pid
```

- [ ] **Step 2: Esperar resposta da web**

```bash
for i in $(seq 1 60); do
  resp=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:13000 2>/dev/null || echo "000")
  echo "$(date +%T) http=$resp" >> /tmp/auditoria-2026-07-29/logs/87-web-ready.log
  [ "$resp" = "200" ] || [ "$resp" = "302" ] || [ "$resp" = "307" ] && break
  sleep 2
done
```

**Atenção:** Next.js em dev pode responder 200 na home. Aceitar 200/302/307 como "ready". 404 sustentado indica porta errada.

### Task 4.5 — E2E smoke

- [ ] **Step 1: Executar smoke (`@smoke|@critical`)**

```bash
cd apps/web && set -a; source /tmp/auditoria-2026-07-29/audit.env; set +a
BASE_URL=http://127.0.0.1:13000 pnpm test:e2e:smoke 2>&1 | tee /tmp/auditoria-2026-07-29/logs/88-e2e-smoke.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/88-e2e-smoke-exit.txt
```

- [ ] **Step 2: Copiar artefatos Playwright**

```bash
cp apps/web/tests/e2e/playwright-results.json /tmp/auditoria-2026-07-29/e2e-results/smoke.json 2>/dev/null || echo '{"stats":{"expected":0,"unexpected":0,"skipped":0,"flaky":0,"ok":0}}' > /tmp/auditoria-2026-07-29/e2e-results/smoke.json
```

**Falha esperada:** se `expected+unexpected+skipped=0`, registre como **E2E executado com zero testes** e bloqueie a propagação para full.

### Task 4.6 — E2E critical

- [ ] **Step 1: Executar `@critical`**

```bash
BASE_URL=http://127.0.0.1:13000 pnpm test:e2e:critical 2>&1 | tee /tmp/auditoria-2026-07-29/logs/89-e2e-critical.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/89-e2e-critical-exit.txt
cp apps/web/tests/e2e/playwright-results.json /tmp/auditoria-2026-07-29/e2e-results/critical.json 2>/dev/null
```

### Task 4.7 — E2E full (somente se smoke e critical passaram)

- [ ] **Step 1: Validar pré-condição**

```bash
smoke_ok=$(jq -r '.stats.ok // 0' /tmp/auditoria-2026-07-29/e2e-results/smoke.json 2>/dev/null || echo 0)
crit_ok=$(jq -r '.stats.ok // 0' /tmp/auditoria-2026-07-29/e2e-results/critical.json 2>/dev/null || echo 0)
echo "smoke_ok=$smoke_ok crit_ok=$crit_ok" > /tmp/auditoria-2026-07-29/raw/90-e2e-precheck.txt
test "$smoke_ok" -gt 0 -a "$crit_ok" -gt 0 || { echo "skip full: gate(s) anteriores com 0 ok" >> /tmp/auditoria-2026-07-29/raw/90-e2e-precheck.txt; }
```

- [ ] **Step 2: Rodar `e2e:fast` (exclui `@slow` e `@webhook`)**

```bash
BASE_URL=http://127.0.0.1:13000 pnpm test:e2e:fast 2>&1 | tee /tmp/auditoria-2026-07-29/logs/90-e2e-fast.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/91-e2e-fast-exit.txt
cp apps/web/tests/e2e/playwright-results.json /tmp/auditoria-2026-07-29/e2e-results/fast.json 2>/dev/null
```

- [ ] **Step 3: (condicional) Rodar `e2e:all` apenas se `fast` foi ≥ 80% dos testes esperados**

```bash
total_fast=$(jq -r '[.stats.expected//0,.stats.skipped//0] | add' /tmp/auditoria-2026-07-29/e2e-results/fast.json 2>/dev/null || echo 0)
test "$total_fast" -gt 5 && BASE_URL=http://127.0.0.1:13000 pnpm test:e2e:all 2>&1 | tee /tmp/auditoria-2026-07-29/logs/91-e2e-all.log
```

**Atenção:** o critério é heurístico para evitar horas em suite pesada quando falhar de modo sistêmico. Documente o motivo no relatório.

### Task 4.8 — Limpeza obrigatória (sempre)

- [ ] **Step 1: Derrubar API e Web**

```bash
[ -f /tmp/auditoria-2026-07-29/raw/84-api.pid ] && kill "$(cat /tmp/auditoria-2026-07-29/raw/84-api.pid)" 2>/dev/null
[ -f /tmp/auditoria-2026-07-29/raw/86-web.pid ] && kill "$(cat /tmp/auditoria-2026-07-29/raw/86-web.pid)" 2>/dev/null
pkill -f 'node dist/main.js' 2>/dev/null
pkill -f 'next dev' 2>/dev/null
sleep 2
{
  echo "web 13000:"; ss -ltnH 'sport = :13000' 2>/dev/null
  echo "api 13001:"; ss -ltnH 'sport = :13001' 2>/dev/null
} > /tmp/auditoria-2026-07-29/raw/92-ports-after.log
```

- [ ] **Step 2: Derrubar PostgreSQL**

```bash
CONTAINER_ID=$(cat /tmp/auditoria-2026-07-29/raw/81-pg-container-id.txt)
[ -n "$CONTAINER_ID" ] && docker rm -f "$CONTAINER_ID" 2>&1 | tee /tmp/auditoria-2026-07-29/logs/92-pg-cleanup.log
docker ps -a --filter name=pediaudit-pg-2026-07-29 > /tmp/auditoria-2026-07-29/raw/93-pg-removed.txt 2>&1
```

- [ ] **Step 3: Confirmar limpeza**

```bash
{
  echo "=== docker ==="
  docker ps --filter name=pediaudit-pg-2026-07-29 | grep -q pediaudit-pg-2026-07-29 && echo "FAIL: contêiner ainda presente" || echo "OK: contêiner removido"
  echo "=== porta 13000 (web) ==="
  ss -ltnH 'sport = :13000' 2>/dev/null | head -1 || echo "livre"
  echo "=== porta 13001 (api) ==="
  ss -ltnH 'sport = :13001' 2>/dev/null | head -1 || echo "livre"
  echo "=== porta 55432 (pg) ==="
  ss -ltnH 'sport = :55432' 2>/dev/null | head -1 || echo "livre"
} > /tmp/auditoria-2026-07-29/raw/94-final-cleanup.txt 2>&1
```

**Falha esperada:** se algo sobrar, registre e tente `docker rm -f`/`kill -9` antes de fechar a Fase 0.

---

## Gate 5 — Segurança e operação

### Task 5.1 — Auditoria de dependências (pnpm audit)

- [ ] **Step 1: Produzir relatório**

```bash
pnpm audit --prod --json > /tmp/auditoria-2026-07-29/raw/100-pnpm-audit.json 2>/tmp/auditoria-2026-07-29/logs/100-pnpm-audit.log
echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/101-pnpm-audit-exit.txt
```

- [ ] **Step 2: Resumir severidades**

```bash
jq -r '.advisories // {} | to_entries | map({id:.key, severity:.value.severity, title:.value.title}) | .[]' /tmp/auditoria-2026-07-29/raw/100-pnpm-audit.json 2>/dev/null > /tmp/auditoria-2026-07-29/raw/102-audit-summary.txt || echo "no advisories or jq ausente" > /tmp/auditoria-2026-07-29/raw/102-audit-summary.txt
```

### Task 5.2 — Verificar overrides de segurança

**Files:** `package.json:pnpm.overrides`.

- [ ] **Step 1: Extrair overrides**

```bash
jq '.pnpm.overrides // {}' package.json > /tmp/auditoria-2026-07-29/raw/103-overrides.json
```

- [ ] **Step 2: Comparar com pacotes instalados**

```bash
jq -r '.pnpm.overrides | keys[]' package.json | while read pkg; do
  installed=$(pnpm -r ls --depth=-1 --json 2>/dev/null | jq -r --arg p "$pkg" '..|.dependencies? // empty | objects | select(.name == $p) | .version' | head -1)
  echo "$pkg=$installed" >> /tmp/auditoria-2026-07-29/raw/104-override-versions.txt
done
```

### Task 5.3 — Gitleaks no tree atual (opcional)

- [ ] **Step 1: Tentar scan**

```bash
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --no-banner --redact --source . > /tmp/auditoria-2026-07-29/logs/105-gitleaks.log 2>&1
  echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/105-gitleaks-exit.txt
else
  echo "gitleaks ausente" > /tmp/auditoria-2026-07-29/raw/105-gitleaks-exit.txt
fi
```

### Task 5.4 — Inspecionar workflows CI

**Files:** nenhum.

- [ ] **Step 1: Listar jobs e gatilhos**

```bash
ls .github/workflows > /tmp/auditoria-2026-07-29/raw/110-workflows.txt 2>&1
grep -hE '^name:|^on:' .github/workflows/*.yml > /tmp/auditoria-2026-07-29/raw/111-workflow-headers.txt 2>&1
```

- [ ] **Step 2: Comparar comandos CI com scripts raiz**

```bash
grep -hE 'pnpm .*test|vitest|playwright|prisma' .github/workflows/*.yml | sort -u > /tmp/auditoria-2026-07-29/raw/112-ci-commands.txt
grep -hE '"(test|test:|build|lint)"' package.json | sort -u > /tmp/auditoria-2026-07-29/raw/113-root-scripts.txt
diff /tmp/auditoria-2026-07-29/raw/112-ci-commands.txt /tmp/auditoria-2026-07-29/raw/113-root-scripts.txt > /tmp/auditoria-2026-07-29/raw/114-ci-vs-root.diff || true
```

**Atenção:** documente qualquer divergência substantiva. Não tente corrigir nesta fase.

---

## Gate 6 — Documentação e OpenSpec

### Task 6.1 — RTM e exit codes

- [ ] **Step 1: Rodar `pnpm rtm`**

```bash
pnpm rtm 2>&1 | tee /tmp/auditoria-2026-07-29/logs/120-rtm.log; echo "exit=$?" > /tmp/auditoria-2026-07-29/raw/120-rtm-exit.txt
```

- [ ] **Step 2: Capturar diff do RTM contra `HEAD`**

```bash
git diff --no-color docs/requirements/RTM.md > /tmp/auditoria-2026-07-29/raw/121-rtm-diff.patch 2>&1
wc -l docs/requirements/RTM.md > /tmp/auditoria-2026-07-29/raw/122-rtm-size.txt
```

**Atenção:** exit code 1 indica RF órfão (esperado durante auditoria). Registre os IDs listados como Missing/Partial no relatório. **Não commitar** `docs/requirements/RTM.md` automaticamente — comparar diff e classificar.

### Task 6.2 — Links em `docs/` e `CLAUDE.md`

- [ ] **Step 1: Listar arquivos markdown**

```bash
find docs -type f -name '*.md' > /tmp/auditoria-2026-07-29/raw/130-docs-md.txt
```

- [ ] **Step 2: Varrer links relativos quebrados**

```bash
while IFS= read -r md; do
  grep -oE '\]\(([^)]+\.(md|ts|tsx|js|json|ya?ml|sh))' "$md" 2>/dev/null
done < /tmp/auditoria-2026-07-29/raw/130-docs-md.txt | sed -E 's/^\]\(//' > /tmp/auditoria-2026-07-29/raw/131-docs-links-raw.txt
sort -u /tmp/auditoria-2026-07-29/raw/131-docs-links-raw.txt | while read link; do
  for base in docs CLAUDE.md AGENTS.md codemap.md; do
    test -e "$base" && echo "$base|$link"
  done
done | head -200 > /tmp/auditoria-2026-07-29/raw/132-docs-links-candidates.txt
```

**Atenção:** este passo é **somente inventário**. Validação de cada link individual vai para a Fase 3.

### Task 6.3 — Comandos documentados

- [ ] **Step 1: Extrair exemplos `pnpm` de `CLAUDE.md` e `AGENTS.md`**

```bash
grep -hE 'pnpm [a-z:-]+' CLAUDE.md AGENTS.md 2>/dev/null | sort -u > /tmp/auditoria-2026-07-29/raw/140-cli-cmds-doc.txt
```

- [ ] **Step 2: Cruzar com `package.json:scripts`**

```bash
jq -r '.scripts | keys[]' package.json > /tmp/auditoria-2026-07-29/raw/141-cli-cmds-actual.txt
```

---

## Consolidação do Relatório

### Task 7.1 — Compor `docs/auditorias/AUDITORIA-GERAL-LINHA-BASE-2026-07-29.md`

**Files:** `docs/auditorias/AUDITORIA-GERAL-LINHA-BASE-2026-07-29.md`.

- [ ] **Step 1: Criar arquivo**

Use o template abaixo, salvando exatamente neste caminho:

```markdown
# Auditoria Geral — Linha-base 2026-07-29

**Status:** Coleta concluída (Fase 0)
**Branch:** `chore/auditoria-limpeza-geral-2026-07-28`
**HEAD:** `<hash>` (= cad571d)

## 1. Estado preservado

- Working tree capturado em `git status --porcelain` (anexo A1).
- Alterações preexistentes reconhecidas em `apps/api/package.json` e `pnpm-lock.yaml` já presentes no HEAD.
- Nenhuma correção aplicada.

## 2. Sumário de gates

| Gate                     | Status                 | Evidência    |
| ------------------------ | ---------------------- | ------------ |
| 1 — Integridade          | verde/amarelo/vermelho | logs/10-23   |
| 2 — Testes rápidos       | verde/amarelo/vermelho | logs/50-62   |
| 3 — Builds e contratos   | verde/amarelo/vermelho | logs/70-79   |
| 4 — Docker e E2E         | verde/amarelo/vermelho | logs/80-94   |
| 5 — Segurança e operação | verde/amarelo/vermelho | logs/100-114 |
| 6 — Documentação         | verde/amarelo/vermelho | logs/120-141 |

Status possíveis: **verde** (gate executado, todos os testes rodaram), **amarelo** (gate executado parcialmente ou com zeros), **vermelho** (gate falhou por código), **bloqueado** (gate não executado por ambiente).

## 3. Inventário de achados

### 3.1 Achados confirmados (com evidência e severidade)

| ID      | Categoria | Severidade | Arquivo  | Evidência |
| ------- | --------- | ---------- | -------- | --------- |
| AUD-001 | ...       | P0/P1/P2   | path:lin | logs/...  |

### 3.2 Hipóteses ainda não confirmadas

| ID    | Origem | Próxima ação |
| ----- | ------ | ------------ |
| H-001 | ...    | ...          |

### 3.3 Itens explicitamente não verificados

| Item                | Motivo                  |
| ------------------- | ----------------------- |
| Produção (qualquer) | Fora do escopo          |
| BDD full            | bloqueado por ambiente  |
| Contrato Dredd      | bloqueado por API ativa |

## 4. Recomendações para Fase 1

- Lista priorizada de correções P0/P1 com referência ao ID de achado.
- Pré-requisitos para Fase 2.

## 5. Apêndices

- A1 — `git status`
- A2 — `git log` resumido
- A3 — Resultados de cobertura (referência: `/tmp/auditoria-2026-07-29/coverage/`)
- A4 — JSON de E2E (referência: `/tmp/auditoria-2026-07-29/e2e-results/`)
- A5 — Saída `pnpm rtm` exit + diff (referência: `/tmp/auditoria-2026-07-29/raw/120-rtm-exit.txt` + `121-rtm-diff.patch`)
- A6 — Saída `pnpm audit` (referência: `/tmp/auditoria-2026-07-29/raw/100-pnpm-audit.json`)
```

**Atenção:** preencha substituindo placeholders pelos valores observados. Cite caminhos em `/tmp/...` (que ficam fora do versionamento) explicitamente como "não versionado".

- [ ] **Step 2: Confirmar que o relatório não contém segredos**

```bash
grep -nE '(POSTGRES_PASSWORD|JWT_SECRET=|auditor_local_pw)' docs/auditorias/AUDITORIA-GERAL-LINHA-BASE-2026-07-29.md && echo "FAIL: vazou segredo" || echo "OK: sem segredos" > /tmp/auditoria-2026-07-29/raw/150-secret-scan.txt
```

**Se "FAIL":** remova imediatamente a linha; o segredo real NUNCA deve estar no relatório — use apenas referências a `/tmp/...` e nomes abstratos.

### Task 7.2 — Commit dedicado da Fase 0

- [ ] **Step 1: Preparar commit**

```bash
git add docs/auditorias/AUDITORIA-GERAL-LINHA-BASE-2026-07-29.md
git status --short
```

**Atenção:** se `git status` mostrar outros arquivos além do relatório, **não prossiga**. Investigue e descarte do staging.

- [ ] **Step 2: Commitar**

```bash
git commit -m "docs(auditoria): consolidar linha-base da Fase 0 (2026-07-29)"
```

- [ ] **Step 3: Confirmar**

```bash
git log -1 --stat
```

- [ ] **Step 4: NÃO fazer push**

Relembrar: o desenho proíbe push sem autorização adicional.

---

## Apêndices ao plano

### A. Saídas esperadas por arquivo bruto

| Arquivo                     | Conteúdo mínimo                      | Falha aceitável                        |
| --------------------------- | ------------------------------------ | -------------------------------------- |
| `01-reflog.txt`             | ≥ 5 linhas                           | —                                      |
| `12-pnpm-workspace.yaml`    | yaml completo                        | —                                      |
| `13-pnpm-install-exit.txt`  | `exit=0`                             | `exit≠0` registra achado               |
| `30-root-lint-exit.txt`     | `exit=0` ou número de violações      | exit≠0 registra achado                 |
| `50-unit-web-exit.txt`      | `exit=0` ou contagem                 | —                                      |
| `60-coverage-root-exit.txt` | `exit=0` ou thresholds não atingidos | relatório cita `coverage-summary.json` |
| `72-openapi-exit.txt`       | `exit=0`                             | exit≠0 vira achado                     |
| `85-api-ready.txt`          | `ready>=1`                           | ready=0 marca Gate 4 como bloqueado    |
| `88-e2e-smoke-exit.txt`     | `exit=0`                             | exit≠0 + zero testes vira achado       |
| `120-rtm-exit.txt`          | `exit=0` ou `exit=1` (esperado)      | exit=2 vira achado                     |

### B. Política de fallback por gate

| Gate | Ambiente ausente | Resultado                                                              |
| ---- | ---------------- | ---------------------------------------------------------------------- |
| 1    | n/a              | sempre executável                                                      |
| 2    | n/a              | sempre executável                                                      |
| 3    | n/a              | sempre executável                                                      |
| 4    | Docker ausente   | bloqueado: API/Web/E2E pulam, registre "Gate 4 bloqueado por ambiente" |
| 5    | gitleaks ausente | registra "gate 5.3 não executado" e segue                              |
| 6    | jq ausente       | registra "gate 6.x parcial: jq não encontrado"                         |

### C. Política de cleanup final

Independentemente de sucesso ou falha:

1. `kill $(cat /tmp/auditoria-2026-07-29/raw/{84,86}.pid) || true`
2. `docker rm -f $(cat /tmp/auditoria-2026-07-29/raw/81-pg-container-id.txt) || true`
3. `ss -ltnH 'sport = :13000' && ss -ltnH 'sport = :13001' && ss -ltnH 'sport = :55432'` retornando vazio = OK.
4. `find /tmp/auditoria-2026-07-29 -type d | wc -l` confirma diretório criado.
5. Nenhum artefato é commitado em `apps/**`, `packages/**` ou `.github/**`.

### D. Fronteiras desta fase (não fazer)

- NÃO alterar `apps/api/src/**`, `apps/web/src/**`, `packages/**` ou `schema.prisma`.
- NÃO instalar/atualizar dependências.
- NÃO rodar `pnpm lint --fix`, `prisma migrate dev`, `pnpm db:seed` (raiz) ou qualquer seed SQLite.
- NÃO executar stress, carga destrutiva ou scans contra hosts externos.
- NÃO fazer push, tag, merge ou publicação.
- NÃO criar branches adicionais além da já aberta `chore/auditoria-limpeza-geral-2026-07-28`.
- NÃO modificar `.env.local` ou qualquer arquivo fora do diretório `docs/auditorias/`.

---

## Self-review executado antes da publicação

- ✅ Cada item da spec da Fase 0 mapeado para uma task (Gate 1 → Tasks 1.x; Gate 2 → Tasks 2.x; Gate 3 → Tasks 3.x; Gate 4 → Tasks 4.x; Gate 5 → Tasks 5.x; Gate 6 → Tasks 6.x; entrega → Tasks 7.x).
- ✅ Sem placeholders: comandos exatos com `tee`/`cp` quando saída precisa ser preservada; nenhum "TBD/TODO".
- ✅ Consistência de nomes: variáveis `audit.env`, arquivo de saída `AUDITORIA-GERAL-LINHA-BASE-2026-07-29.md`, branch `chore/auditoria-limpeza-geral-2026-07-28`.
- ✅ Cleanup idempotente (Task 4.8 + Apêndice C) é parte obrigatória do Gate 4.
- ✅ Fronteiras explícitas (Apêndice D) impedem mistura de fases.
- ✅ Política de fallback para gitleaks/jq/docker ausente documentada.
- ✅ Relatório proíbe explicitamente inclusão de segredos.
