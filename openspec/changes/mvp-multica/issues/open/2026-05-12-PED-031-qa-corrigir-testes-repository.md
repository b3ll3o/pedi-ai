# Issue: Corrigir Testes de Repository com fake-indexeddb

**De:** @orchestrator
**Para:** @qa
**Label:** `qa`
**Priority:** high
**Blocking:** false

## Descrição

21 testes de repository estão falhando com `DataError: Data provided to an operation does not meet requirements.`

Arquivos afetados:
- `tests/unit/infrastructure/persistence/CategoriaRepository.test.ts`
- `tests/unit/infrastructure/persistence/MesaRepository.test.ts`
- `tests/unit/infrastructure/persistence/ModificadorGrupoRepository.test.ts`
- `tests/unit/infrastructure/persistence/PedidoRepository.test.ts`
- `tests/unit/infrastructure/persistence/RestauranteRepository.test.ts`
- `tests/unit/infrastructure/persistence/TransacaoRepository.test.ts`

## Contexto

- Falhas são pré-existentes (existiam antes das mudanças recentes)
- Erro ocorre em `fake-indexeddb` ao tentar salvar dados
- Possível causa: formato de dados incompatível com o schema do Dexie

## Critérios de Aceitação

- [ ] Identificar causa raiz do DataError
- [ ] Corrigir schema ou dados que causam a falha
- [ ] Todos os 21 testes passando
- [ ] Verificar que não quebrou outros testes

## Arquivos Prováveis

- `src/infrastructure/persistence/**/*Repository.test.ts`
- `src/infrastructure/persistence/**/DexieSchema.ts`

## Dependências

Nenhuma.

---
**Criado:** 2026-05-12
**Status:** open
**PED:** PED-031