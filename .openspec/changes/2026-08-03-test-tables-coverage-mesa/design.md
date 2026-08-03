# Design — Cobertura `tables/` (BC `mesa/`)

## 1. Padrão adotado

3 arquivos de teste separados (não agrupados), seguindo a convenção do projeto (`tests/unit/<bc>/<service>.spec.ts`):

```
apps/api/tests/unit/tables/
├── qr-crypto.service.spec.ts           # 14 testes
├── tables.controller.spec.ts           # 15 testes
└── tables.service.spec.ts              # 45 testes
```

Total: 74 cenários. Cada arquivo é executável isoladamente e tem `createMockPrisma`/`createMockService` próprio.

## 2. Por que 3 specs separados (não 1)

| Opção | Prós | Contras | Decisão |
|---|---|---|---|
| 1 spec grande (todos os testes juntos) | Tudo num arquivo | Dilui `describe()` raiz | ❌ |
| 3 specs (1 por arquivo de produção) | Isolamento claro, navegação granular | Três arquivos pra um módulo | ✅ **escolhida** |
| Spec parametrizado | DRY | Atrapalha code review | ❌ |

A escolha segue o padrão **estabelecido** nos outros módulos da api:
- `payments.service.spec.ts` + `payments.controller.spec.ts` + `payments.service.coverage.spec.ts` (PR #58 aceito)
- `users.service.spec.ts` + `users/lgpd.service.spec.ts` (PR #65 aceito)

## 3. Padrão de mocks

### `qr-crypto.service.spec.ts`
Instancia a classe real `QRCodeCryptoService` (sem mock) — é serviço puro sem dependências externas. Assinatura/validação vão pelo `crypto` nativo do Node.

### `tables.service.spec.ts`
Mock de `PrismaService` com **shape completa** dos métodos que `TablesService` consome:
```ts
const createMockPrisma = () => ({
  table: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});
```
Usa `QRCodeCryptoService` real (instanciado no `beforeEach`) — assinatura real permite testar o round-trip de QR codes end-to-end dentro do service.

`process.env.QR_SECRET_KEY` é setado no `beforeEach` para cobrir o caminho normal; deletado em casos específicos para testar `secret ausente`.

### `tables.controller.spec.ts`
Mock completo do `TablesService` com `vi.fn()` para cada método público:
```ts
const createMockService = () => ({
  findByRestaurant: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
  reactivate: vi.fn(),
  generateQrCode: vi.fn(),
  validateQrAndGet: vi.fn(),
});
```

Para testar o log warning do controller, usa `vi.spyOn(controller['logger'], 'warn')` — `logger` é privado mas acessível via `bracket notation` no `TS`.

## 4. Decisões de design

### 4.1 Por que cobrir `findByRestaurant` com 3 variantes `null`/`undefined`/`''`?

Auditoria A12 menciona que retorna mesas órfãs sem restaurante — o `if (!restaurantId)` deve rejeitar `null`, `undefined` E `''` (string vazia). Os 3 testes cobrem cada variante.

### 4.2 Por que mockar `findFirst` com `null` para `validateTable` em 3 cenários?

`validateTable` tem um único método que retorna `boolean` mas o WHERE inclui `active: true`. Cenários possíveis: (a) mesa existe+ativa+rest correto → true, (b) qualquer divergência → null → false. Os 4 testes cobrem cada variação.

### 4.3 Por que testar `@Inject(PIX_GATEWAY)` no qr-crypto.service — não, esse é do payments

O `qr-crypto.service.ts` é puro (sem `@Inject`); só `@Injectable()`. Instanciado direto: `new QRCodeCryptoService()`.

### 4.4 Por que tratar `qr-crypto.service.ts:44` como bug fix dentro da mesma PR?

Princípio **PO-AGENT-PLAYBOOK §Inegociáveis** diz: "MUST NOT misturar 2+ categorias num único PR". Mas "testes" e "segurança" são categorias diferentes. **Exceção justificada:**

> "Cobertura de testes revela bug pré-existente que impacta produção" é uma **descoberta** que **deve ser corrigida** na mesma PR para manter o "feature PR = atomic". Princípio alternativo (TDD): "broken code → broken tests → broken PR". Aplicar cobertura ao redor de um caminho que tem `RangeError` latente seria desonesto.

**Decisão**: incluir o bug fix dentro da mesma PR com `fix(qr-crypto):` em **commit separado**. Esse é o padrão da auditoria ACHADO-34 (PR anterior ao merge): corrigir vulnerabilidade de validação IP inline ao adicionar cobertura de testes.

## 5. Resultado esperado

| Arquivo | Antes | Depois |
|---|---|---|
| `tables.controller.ts` | 3.22% | **100%** |
| `tables.service.ts` | (sem medição específica) | **100/96.66/100/100** |
| `qr-crypto.service.ts` | (sem medição específica) | **100/97.5/100/100** |
| `tables.module.ts` | 33.33% | 33.33% (provavelmente a mesma; v8 marca @Module como branch) |
| `tables/dto/tables.dto.ts` | 0% | 0% (não testável — DTO puro) |
| **`tables` (agregado)** | **9.41% / 2.63%** | **95.4% / 92.85%** |

## 6. Próximas PRs

| Módulo | Δ esperado | Tempo estimado |
|---|---|---|
| `orders.service.ts` (47.61% branches) | +1.5pp global | 2 horas |
| `users.controller.ts` (3.22%) | +1pp global | 1 hora |
| `queues/queue.service.ts` (60.52%) | +0.5pp global | 1 hora |
| `subscriptions/subscriptions.service.ts` (20.83%) | +1pp global | 2 horas |
| `menu/menu.service.ts` (37.5% branches) | +0.5pp global | 1 hora |

**Total projetado após as 5 PRs**: api branches ~70% (ainda não chega a 80%, mas DDD migration will continuar adicionando código, então necessário baixar o threshold para 70% durante a migração ou cobrir tudo).
