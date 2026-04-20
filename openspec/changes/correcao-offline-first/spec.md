# Spec: Correção Offline-First - Orders e Sync

## Contexto

Violações críticas das regras offline-first identificadas no AGENTS.md:
- Pedidos feitos offline não são enfileirados para sincronização
- Menu não está disponível offline como fallback
- `processQueue()` não é chamado na inicialização da app

## Requisitos Adicionados

### REQ-001: Order Service Offline Queue

**Dado** que o cliente tenta fazer um pedido enquanto offline
**Quando** a chamada `fetch('/api/orders')` falhar
**Então** o sistema DEVE chamar `queueOrderForSync()` para persistir o pedido em IndexedDB
**E** o sistema DEVE retornar uma mensagem indicando que o pedido foi enfileirado

**Cenário: Pedido enfileirado com sucesso**
- GIVEN cliente está offline
- WHEN cliente confirma o pedido
- THEN `queueOrderForSync()` é chamado com os dados do pedido
- AND o pedido é armazenado em `pending_sync` com status `pending`
- AND mensagem "Pedido enfileirado para sincronização" é exibida

**Cenário: Pedido enfileirado na recuperação de conexão**
- GIVEN pedido foi enfileirado enquanto offline
- WHEN navegador detecta conexão restaurada
- THEN `processQueue()` é chamado automaticamente
- AND pedidos pendentes são enviados ao servidor
- AND em caso de sucesso, pedido é removido da fila

---

### REQ-002: OfflineIndicator processQueue Integration

**Dado** que o indicador offline está monitorando o estado de conexão
**Quando** o evento `online` é disparado
**Então** o sistema DEVE chamar `processQueue()` para sincronizar pedidos pendentes

**Cenário: Reconexão automática**
- GIVEN existem pedidos pendentes na fila `pending_sync`
- WHEN evento `online` é disparado
- THEN `processQueue()` é chamado
- AND contador de pedidos pendentes é atualizado
- AND sincronização ocorre em background

---

### REQ-003: Menu Store Cache Fallback

**Dado** que o cliente abre o aplicativo
**Quando** a API `/api/menu` falhar (offline ou erro)
**Então** o sistema DEVE usar `getCachedMenu()` como fallback
**E** o menu cache DEVE ser utilizado para exibir categorias e produtos

**Cenário: Menu disponível offline**
- GIVEN cliente está offline
- WHEN tenta acessar o menu
- THEN API call falha
- AND `getCachedMenu()` é chamado
- AND menu cache (até 24h) é utilizado
- AND usuário vê menu mesmo sem conexão

---

### REQ-004: processQueue na Inicialização

**Dado** que o aplicativo é carregado
**Quando** o componente raiz é montado
**Então** o sistema DEVE chamar `processQueue()` para processar pedidos pendentes
**E** pedidos que foram enfileirados em sessões anteriores DEVEM ser sincronizados

---

## Critérios de Aceitação

- [ ] `createOrderFromCart()` captura falhas de rede e chama `queueOrderForSync()`
- [ ] `OfflineIndicator` chama `processQueue()` no evento `online`
- [ ] `menuStore` usa `getCachedMenu()` como fallback quando API falha
- [ ] `processQueue()` é chamado na inicialização da app (via layout ou provider)
- [ ] Mensagem clara exibida quando pedido é enfileirado offline
- [ ] Sync automático ocorre ao reconectar