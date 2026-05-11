# Proposal: MVP Multica — Cardápio Digital com Pedido na Mesa

## Intent

Criar um MVP de **cardápio digital** para restaurantes onde:
- Clientes escaneiam QR code na mesa e acessam o cardápio
- Montam pedidos pelo celular
- Pedido vai direto para a cozinha (KDS)
- **Pagamento é presencial** — sem integração de pagamento online

---

## Scope

### In Scope (MVP)

1. **Cardápio Público via QR Code**
   - Cliente escaneia QR da mesa → vê cardápio do restaurante
   - Navegação por categorias, produtos, modificadores
   - Funciona offline após primeiro carregamento

2. **Fluxo de Pedido (sem pagamento)**
   - Montar carrinho com modificadores
   - Enviar pedido (sem etapa de pagamento)
   - Acompanhar status em tempo real: `recebido` → `preparando` → `pronto`

3. **Kitchen Display System (KDS)**
   - Cozinha recebe pedidos em tempo real
   - Atualiza status com um toque

4. **Gestão de Mesas**
   - Criar mesas e gerar QR codes
   - Validação HMAC-SHA256 do QR

### Out of Scope

- Pagamento online (PIX, cartão)
- Delivery / retirada
- Autenticação de cliente (opcional)
- Avaliações e comentários
- Histórico de pedidos

---

## O que Já Existe

| Bounded Context | Status | Uso no MVP |
|-----------------|--------|-----------|
| `cardapio/` | ✅ | Categorias, Produtos, Modificadores |
| `mesa/` | ✅ | Mesa, QR Code com HMAC-SHA256 |
| `pedido/` | ✅ | Pedido com FSM de status |
| `restaurante/` | ✅ | Restaurante, Configurações |
| `pagamento/` | ⚠️ | Existe mas NÃO será usado |

### O que Precisamos Adaptar

1. **Remover etapa de pagamento do checkout** — pedido vai direto para `recebido`
2. **Ajustar KDS** — já existe em `/kitchen`, só precisa de ajustes
3. **Notificação "Pedido pronto"** — Cliente vê atualização em tempo real
4. **Nova rota** `/r/[slug]` ou ajustar `/table/[code]`

---

## Approach

### Arquitetura de Rotas

```
src/app/
├── r/
│   └── [slug]/
│       ├── page.tsx           # Cardápio público
│       └── pedido/
│           └── [pedidoId]/
│               └── page.tsx   # Acompanhamento
├── kitchen/
│   └── page.tsx               # KDS (cozinha)
└── admin/
    └── ...                    # Já existe
```

### Fluxo de Dados

```
QR Code (mesa)
    ↓
/r/[slug] → Cardápio do restaurante
    ↓
Carrinho → (sem pagamento) → Pedido criado
    ↓                           ↓
Status: recebido          KDS recebe
    ↓                           ↓
Cliente acompanha    Cozinha atualiza
    ↓                           ↓
Status: pronto        Cliente é notificado
    ↓
Pagamento presencial
```

---

## Success Criteria

1. ✅ Cliente escaneia QR e vê cardápio do restaurante
2. ✅ Cliente monta pedido com modificadores
3. ✅ Cliente envia pedido sem etapa de pagamento
4. ✅ Cozinha recebe pedido via KDS
5. ✅ Cliente acompanha status em tempo real
6. ✅ Cardápio funciona offline

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Status de pedido não atualiza | Baixa | Alto | Verificar Supabase Realtime |
| KDS não recebe pedidos | Baixa | Alto | Testar fluxo completo |
| QR code inválido | Baixa | Médio | Validação HMAC-SHA256 |

---

## Effort Estimate

| Tarefa | Complexidade | Prioridade |
|--------|--------------|------------|
| 1. Ajustar checkout (remover pagamento) | Baixa | Alta |
| 2. Ajustar KDS para fluxo sem pagamento | Média | Alta |
| 3. Criar rota /r/[slug] para cardápio público | Média | Alta |
| 4. Ajustar fluxo de pedido (status inicial = recebido) | Baixa | Alta |
| 5. Testes E2E do fluxo completo | Média | Média |
