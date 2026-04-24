# Cobertura de Testes - Tarefas Pendentes

> ⚠️ **DEPRECADO**: Este documento está desatualizado. 
> A meta de coverage de 80% foi atingida e superada.
> Coverage atual: 97.91% statements, 92% branches, 94.85% functions, 98.39% lines.

## Objetivo
Atingir **80% de coverage** em todas as métricas (statements, branches, functions, lines) nos arquivos testáveis (services, stores, hooks).

## Estado Atual
- Coverage global: ~18%
- 456 arquivos com 0% coverage (API routes, páginas, webhooks - serão excluídos)

## Arquivos Abaixo de 80% (Need Work)

| Arquivo | Statements | Branches | Functions | Lines | Problema |
|---------|-----------|----------|-----------|-------|----------|
| cartStore.ts | 81.81% | **63.88%** | 80% | 82.97% | Branches |
| adminOrderService.ts | - | - | **69.23%** | - | Functions |
| tableService.ts | 91.48% | 76.92% | **69.23%** | 100% | Functions |
| useAuth.ts | 98.21% | **70%** | 100% | 98.21% | Branches |
| useRealtimeOrders.ts | - | 78.57% | 78.57% | - | Quase lá |

## Passo a Passo

### 1. Configurar vitest.config.ts (ALTO)
Excluir da cobertura:
- `src/app/api/**` (API routes)
- `src/app/**/page.tsx` (páginas)
- `src/components/**` (componentes UI)

### 2. Executar Coverage
```bash
npm run test:coverage
```

### 3. Testar cartStore.ts (branches 63.88%)
- Focar nos branches de sincronização entre tabs (BroadcastChannel)
- Adicionar mocks para o BroadcastChannel

### 4. Testar adminOrderService.ts (functions 69.23%)
- Identificar funções não testadas
- Adicionar casos de teste para cada função

### 5. Testar tableService.ts (functions 69.23%)
- Verificar validateTableQR e outras funções
- Cobrir branches de erro

### 6. Testar useAuth.ts (branches 70%)
- Adicionar testes para branches de logout/erro

### 7. Testar useRealtimeOrders.ts (~78%)
- Último ajuste fino

### 8. Verificação Final
```bash
npm run test:coverage
```
Confirmar 80% em todas métricas para arquivos testáveis.

## Notas
- Trabalhar nos arquivos em ordem (do mais crítico ao menos)
- Executar `npm run test` após cada adição para confirmar que os testes passam
- Arquivos 0% que são páginas/API/components devem ser EXCLUÍDOS da coverage, não testados
