# Feature Flags — Pendências Frontend (RF-ADM-FF-03, Toast, managerUser) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar 3 pendências frontend do painel admin de feature flags: habilitar criação de flag (RF-ADM-FF-03), introduzir sistema de toast global para feedback de mutação, e adicionar fixture `managerUser` ao seed E2E para validar RBAC real contra o backend.

**Architecture:**

- **Hook `useCriarFeatureFlag`**: mesmo padrão de `useAtualizarFeatureFlag` — fetch direto (`/api/v1/admin/feature-flags`), optimistic não aplicável (criação), loading/error locais. Emite `toast.success`/`toast.error` via `useToast`.
- **ModalCriarFlag**: copiando o esqueleto de `ModalOverrideFeatureFlag` (role="dialog", aria-modal, Esc, foco inicial) mas com form de **criação** (key/description/valueType/defaultValue condicional ao tipo). Estado client-side em `useReducer` (não `useState` aninhado) para evitar `react-hooks/set-state-in-effect`.
- **Toast Provider**: Context React próprio, sem libs externas, em `apps/web/src/lib/notification/` (consistente com `lib/auth`, `lib/offline`). Render no canto inferior direito (mobile full-width), aria-live polite/assertive conforme severidade, auto-dismiss 5s, fila FIFO com máx 5 visíveis.
- **Seed E2E**: adicionar `manager` ao `users` + `users_profiles` com role `gerente` (papel real aceito pelo `FeatureFlagAdminGuard`).

**Tech Stack:** Next.js 16, React 19, TypeScript estrito, Vitest 4 + Testing Library 16 + Playwright 1.60. Sem libs externas para toast (projeto conservador). Mantém fetch direto (não migra para TanStack Query nesta task — refator fora de escopo).

---

## File Structure

**Novos arquivos:**

- `apps/web/src/lib/notification/ToastProvider.tsx` — Context + reducer + lista de toasts.
- `apps/web/src/lib/notification/useToast.ts` — hook cliente (`toast.success/error/info/warning`).
- `apps/web/src/lib/notification/ToastViewport.tsx` — renderizador visual (presentational, separado da lógica).
- `apps/web/src/lib/notification/ToastViewport.module.css` — estilos responsivos.
- `apps/web/src/lib/notification/index.ts` — barrel export.
- `apps/web/src/application/admin/feature-flags/use-cases/useCriarFeatureFlag.ts` — hook POST.
- `apps/web/src/components/admin/feature-flags/ModalCriarFlag.tsx` — modal acessível.
- `apps/web/src/components/admin/feature-flags/ModalCriarFlag.module.css` — estilos.
- `apps/web/tests/unit/lib/notification/ToastProvider.test.tsx` — testes do provider.
- `apps/web/tests/unit/lib/notification/useToast.test.tsx` — testes do hook.
- `apps/web/tests/unit/components/admin/feature-flags/ModalCriarFlag.test.tsx` — testes do modal.
- `apps/web/tests/unit/application/admin/feature-flags/use-cases/CriarFeatureFlag.test.ts` — testes do hook.

**Arquivos modificados:**

- `apps/web/src/app/layout.tsx` — aninhar `<ToastProvider>` entre `<ReactQueryProvider>` e `<StoreProvider>`.
- `apps/web/src/components/admin/feature-flags/PainelFeatureFlags.tsx` — remover `disabled`/`title` do botão "+ Nova", adicionar estado `modalCriarAberto`, renderizar `<ModalCriarFlag>`.
- `apps/web/src/application/admin/feature-flags/use-cases/useAtualizarFeatureFlag.ts` — emitir toast em sucesso/erro via callback opcional `onSuccess`/`onError` (NÃO acoplar diretamente ao `useToast` para preservar reuso).
- `apps/web/src/application/admin/feature-flags/use-cases/useAdicionarOverride.ts` — idem.
- `apps/web/src/application/admin/feature-flags/use-cases/useRemoverOverride.ts` — idem.
- `apps/web/tests/e2e/scripts/seed.ts` — adicionar `manager` ao loop de users + `users_profiles`.
- `apps/web/tests/e2e/tests/shared/fixtures/index.ts` — adicionar `manager` ao `SeedData` e à fixture `manager`.
- `apps/web/tests/e2e/tests/admin/feature-flags.spec.ts` — atualizar teste "manager recebe 403" para usar `seedData.manager`.

**Arquivos NÃO modificados (conforme restrição):**

- `apps/web/src/application/admin/services/*UseCase.ts` (11 use cases de domínio)
- `apps/web/src/lib/feature-flags.ts` (shim)
- `apps/web/src/infrastructure/feature-flags/FeatureFlagClient.ts`, `FeatureFlagProvider.tsx`

---

## Decisões de Arquitetura (já tomadas)

1. **Toast em `apps/web/src/lib/notification/`**: consistente com a estrutura existente (`lib/auth`, `lib/offline`, `lib/qr`, `lib/a11y`). Não em `components/` porque é infraestrutura de UI, não componente de tela.

2. **Hook `useCriarFeatureFlag` segue `useAtualizarFeatureFlag` exatamente** (mesmo fetch, mesmo `useState` triplo `data/loading/error`, mesmo retorno). Não tem optimistic update (criação não tem estado anterior para reverter). Sucesso/erro ficam expostos via callbacks `onSuccess`/`onError` que o caller conecta ao `useToast`. Isso **evita acoplar o hook ao `useToast`** (que exige provider) e mantém o hook testável em isolamento (igual aos existentes).

3. **Toast NÃO é chamado dentro dos hooks** — caller decide. O `PainelFeatureFlags.tsx` faz a ponte: passa `onSuccess`/`onError` que emitem `toast.success('Flag criada')` etc. Padrão consistente com `onOptimistic`/`onRollback`.

4. **Provider no layout raiz** entre `<ReactQueryProvider>` (pai) e `<StoreProvider>` (filho) — para que erros de mutação no admin também sejam visíveis. Como `ReactQueryProvider` não tem estado dependente, a ordem não muda comportamento.

5. **data-testid `toast-confirmacao`** — referenciado em `feature-flags.spec.ts:74` mas nunca implementado. Como esse testid é genérico demais, vou criar o Toast com `data-testid={`toast-${severity}`}` e `data-testid="toast"` na viewport. **Atualizar o E2E existente** para usar `toast-success` em vez de `toast-confirmacao`. Isso é mais consistente.

6. **Manager fixture**: já existe um login `waiter` (role `atendente`) que é bloqueado pelo guard para mutations (regra: `manager/gerente` → só GET; demais → 403). O waiter hoje passa pelo caminho de "papel desconhecido" → 403. O spec pede manager real (role `gerente`) — que passa pelo caminho "manager mas mutation → 403 com mensagem específica". Isso **aumenta a cobertura de teste** do guard.

7. **Não uso `useReducer` no `ModalCriarFlag`** — `useState` com objeto FormState é suficiente (3-4 campos). O `PainelFeatureFlags` usa reducer porque precisa lidar com 4 actions + estado discriminado (`loading/error/success`). Para um modal simples, useState é menos código e mais legível.

8. **Mensagens de erro do backend** (`CriarFeatureFlagDtoSchema`): erro 400 vem como `message` (Zod issues unidos por `;`). Hook propaga esse `message` para `toast.error(message)`.

---

## Tasks

### Task 1: ToastProvider — Context, reducer e API

**Files:**

- Create: `apps/web/src/lib/notification/ToastProvider.tsx`
- Create: `apps/web/src/lib/notification/useToast.ts`
- Create: `apps/web/src/lib/notification/index.ts`

- [ ] **Step 1: Escrever teste RED para `useToast`**

```tsx
// apps/web/tests/unit/lib/notification/useToast.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ToastProvider, useToast } from '@/lib/notification';

describe('useToast', () => {
  it('lança erro se usado fora do ToastProvider', () => {
    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/);
  });

  it('adiciona toast de sucesso', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    act(() => result.current.success('Operação concluída'));
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      severity: 'success',
      message: 'Operação concluída',
    });
  });

  it('expõe helpers por severidade (success/error/info/warning)', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    act(() => {
      result.current.success('ok');
      result.current.error('falhou');
      result.current.info('info');
      result.current.warning('aviso');
    });
    expect(result.current.toasts.map((t) => t.severity)).toEqual([
      'success',
      'error',
      'info',
      'warning',
    ]);
  });

  it('remove toast por id via dismiss()', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    let id = '';
    act(() => {
      id = result.current.success('msg');
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => result.current.dismiss(id));
    expect(result.current.toasts).toHaveLength(0);
  });

  it('atribui id único a cada toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    act(() => {
      result.current.success('a');
      result.current.success('b');
    });
    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id);
  });
});
```

- [ ] **Step 2: Rodar para confirmar RED**

Run: `cd apps/web && pnpm test --run tests/unit/lib/notification/useToast.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Criar `ToastProvider`**

```tsx
// apps/web/src/lib/notification/ToastProvider.tsx
'use client';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useReducer,
  type ReactNode,
} from 'react';
import { ToastViewport } from './ToastViewport';

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  severity: ToastSeverity;
  message: string;
  durationMs: number;
}

export interface ToastApi {
  toasts: Toast[];
  success: (message: string, opts?: ToastOptions) => string;
  error: (message: string, opts?: ToastOptions) => string;
  info: (message: string, opts?: ToastOptions) => string;
  warning: (message: string, opts?: ToastOptions) => string;
  dismiss: (id: string) => void;
}

export interface ToastOptions {
  durationMs?: number;
}

type State = Toast[];
type Action = { type: 'add'; toast: Toast } | { type: 'remove'; id: string };

const DEFAULT_DURATION_MS = 5000;
const MAX_VISIBLE = 5;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add': {
      const next = [...state, action.toast];
      return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
    }
    case 'remove':
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

export const ToastContext = createContext<ToastApi | null>(null);

let counter = 0;
function makeId(): string {
  counter += 1;
  return `toast-${Date.now().toString(36)}-${counter}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    dispatch({ type: 'remove', id });
  }, []);

  const push = useCallback(
    (severity: ToastSeverity, message: string, opts?: ToastOptions): string => {
      const id = makeId();
      const durationMs = opts?.durationMs ?? DEFAULT_DURATION_MS;
      dispatch({ type: 'add', toast: { id, severity, message, durationMs } });
      if (durationMs > 0) {
        const timer = setTimeout(() => dismiss(id), durationMs);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  // Cleanup timers ao desmontar
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toasts,
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, o),
      info: (m, o) => push('info', m, o),
      warning: (m, o) => push('warning', m, o),
      dismiss,
    }),
    [toasts, push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 4: Criar `useToast`**

```ts
// apps/web/src/lib/notification/useToast.ts
'use client';
import { useContext } from 'react';
import { ToastContext, type ToastApi } from './ToastProvider';

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  }
  return ctx;
}
```

- [ ] **Step 5: Criar barrel `index.ts`**

```ts
// apps/web/src/lib/notification/index.ts
export { ToastProvider, ToastContext } from './ToastProvider';
export type { Toast, ToastSeverity, ToastApi, ToastOptions } from './ToastProvider';
export { useToast } from './useToast';
```

- [ ] **Step 6: Rodar testes do hook — esperado PASS**

Run: `cd apps/web && pnpm test --run tests/unit/lib/notification/useToast.test.tsx`
Expected: 5 testes passing.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/notification apps/web/tests/unit/lib/notification
git commit -m "feat(notification): adicionar ToastProvider + useToast hook"
```

---

### Task 2: ToastViewport — render visual com a11y

**Files:**

- Create: `apps/web/src/lib/notification/ToastViewport.tsx`
- Create: `apps/web/src/lib/notification/ToastViewport.module.css`

- [ ] **Step 1: Escrever teste RED para viewport**

```tsx
// apps/web/tests/unit/lib/notification/ToastViewport.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '@/lib/notification';

describe('ToastViewport (a11y + render)', () => {
  function Trigger({
    msg,
    severity = 'success' as const,
  }: {
    msg: string;
    severity?: 'success' | 'error' | 'info' | 'warning';
  }) {
    const toast = useToast();
    return <button onClick={() => toast[severity](msg)}>emitir</button>;
  }

  it('renderiza viewport oculta quando não há toasts', () => {
    render(
      <ToastProvider>
        <span>conteúdo</span>
      </ToastProvider>
    );
    const viewport = screen.getByTestId('toast-viewport');
    expect(viewport.children.length).toBe(0);
  });

  it('renderiza cada toast com testid por severidade', async () => {
    render(
      <ToastProvider>
        <Trigger msg="salvo" />
        <Trigger msg="erro" severity="error" />
      </ToastProvider>
    );
    act(() => screen.getAllByRole('button')[0].click());
    act(() => screen.getAllByRole('button')[1].click());
    expect(screen.getByTestId('toast-success')).toHaveTextContent('salvo');
    expect(screen.getByTestId('toast-error')).toHaveTextContent('erro');
  });

  it('toast de sucesso usa role=status (polite), erro usa role=alert (assertive)', () => {
    render(
      <ToastProvider>
        <Trigger msg="ok" />
        <Trigger msg="falha" severity="error" />
      </ToastProvider>
    );
    act(() => screen.getAllByRole('button')[0].click());
    act(() => screen.getAllByRole('button')[1].click());
    expect(screen.getByTestId('toast-success')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('toast-error')).toHaveAttribute('role', 'alert');
  });

  it('botão × chama onDismiss', () => {
    render(
      <ToastProvider>
        <Trigger msg="x" />
      </ToastProvider>
    );
    act(() => screen.getByRole('button', { name: /emitir/ }).click());
    const closeBtn = screen.getByRole('button', { name: /fechar notificação/i });
    act(() => closeBtn.click());
    expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar para confirmar RED**

Run: `cd apps/web && pnpm test --run tests/unit/lib/notification/ToastViewport.test.tsx`
Expected: FAIL — viewport não existe.

- [ ] **Step 3: Criar `ToastViewport`**

```tsx
// apps/web/src/lib/notification/ToastViewport.tsx
'use client';
import type { Toast } from './ToastProvider';
import styles from './ToastViewport.module.css';

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className={styles.viewport} data-testid="toast-viewport" aria-label="Notificações">
      {toasts.map((t) => {
        const role = t.severity === 'error' || t.severity === 'warning' ? 'alert' : 'status';
        const ariaLive =
          t.severity === 'error' || t.severity === 'warning' ? 'assertive' : 'polite';
        return (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[t.severity]}`}
            data-testid={`toast-${t.severity}`}
            role={role}
            aria-live={ariaLive}
          >
            <span className={styles.message}>{t.message}</span>
            <button
              type="button"
              className={styles.closeBtn}
              aria-label="Fechar notificação"
              onClick={() => onDismiss(t.id)}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Criar CSS Module**

```css
/* apps/web/src/lib/notification/ToastViewport.module.css */
.viewport {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: calc(100vw - 2rem);
  width: 22rem;
  pointer-events: none;
}

@media (max-width: 48rem) {
  .viewport {
    bottom: 0;
    right: 0;
    left: 0;
    width: 100%;
    padding: 0 1rem env(safe-area-inset-bottom, 1rem);
  }
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
  animation: slideIn 200ms ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(0.5rem);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.success {
  background: var(--color-success-light, #dcfce7);
  color: var(--color-success-dark, #166534);
  border: 1px solid var(--color-success, #16a34a);
}

.error {
  background: var(--color-error-light, #fee2e2);
  color: var(--color-error-dark, #991b1b);
  border: 1px solid var(--color-error, #dc2626);
}

.info {
  background: var(--color-info-light, #dbeafe);
  color: var(--color-info-dark, #1e3a8a);
  border: 1px solid var(--color-info, #2563eb);
}

.warning {
  background: var(--color-warning-light, #fef3c7);
  color: var(--color-warning-dark, #92400e);
  border: 1px solid var(--color-warning, #d97706);
}

.message {
  flex: 1;
  line-height: 1.4;
}

.closeBtn {
  background: transparent;
  border: 0;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 0 0.25rem;
}

.closeBtn:hover {
  opacity: 1;
}

.closeBtn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 1px;
}
```

- [ ] **Step 5: Rodar testes do viewport — esperado PASS**

Run: `cd apps/web && pnpm test --run tests/unit/lib/notification/ToastViewport.test.tsx`
Expected: 4 testes passing.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/notification
git commit -m "feat(notification): ToastViewport com a11y WCAG AA"
```

---

### Task 3: Aninhar `<ToastProvider>` no layout raiz

**Files:**

- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Modificar imports e adicionar provider**

Localizar (linha 207–215):

```tsx
<ReactQueryProvider>
  <StoreProvider>
    <ServiceWorkerRegistration />
    <OfflineIndicator />
    <CartDrawer />
    <CartBadge />
    {children}
  </StoreProvider>
</ReactQueryProvider>
```

Substituir por:

```tsx
import { ToastProvider } from '@/lib/notification';
// ... no body ...
<ReactQueryProvider>
  <ToastProvider>
    <StoreProvider>
      <ServiceWorkerRegistration />
      <OfflineIndicator />
      <CartDrawer />
      <CartBadge />
      {children}
    </StoreProvider>
  </ToastProvider>
</ReactQueryProvider>;
```

- [ ] **Step 2: Validar build não quebrou**

Run: `cd apps/web && pnpm build 2>&1 | tail -20`
Expected: build success, sem novos warnings.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(notification): aninhar ToastProvider no layout raiz"
```

---

### Task 4: Hook `useCriarFeatureFlag`

**Files:**

- Create: `apps/web/src/application/admin/feature-flags/use-cases/useCriarFeatureFlag.ts`

- [ ] **Step 1: Escrever teste RED**

```ts
// apps/web/tests/unit/application/admin/feature-flags/use-cases/CriarFeatureFlag.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// @ts-expect-error — módulo ainda não implementado
import { useCriarFeatureFlag } from '@/application/admin/feature-flags/use-cases/useCriarFeatureFlag';

describe('useCriarFeatureFlag (RF-ADM-FF-03)', () => {
  it('executa POST com payload correto', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'flag-1', key: 'pix_enabled' }),
    }) as never;

    const { result } = renderHook(() => useCriarFeatureFlag());
    await act(async () => {
      await result.current.criar({
        key: 'pix_enabled',
        description: 'Habilita PIX',
        valueType: 'BOOLEAN',
        defaultValue: false,
      });
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/admin/feature-flags',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          key: 'pix_enabled',
          description: 'Habilita PIX',
          valueType: 'BOOLEAN',
          defaultValue: false,
        }),
      })
    );
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ id: 'flag-1', key: 'pix_enabled' });
  });

  it('propaga mensagem do backend em erro 400', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'key deve estar em snake_case' }),
    }) as never;

    const { result } = renderHook(() => useCriarFeatureFlag());
    await act(async () => {
      await result.current.criar({
        key: 'CHAVE-INVALIDA',
        valueType: 'BOOLEAN',
        defaultValue: false,
      });
    });

    await waitFor(() => {
      expect(result.current.error).toMatch(/snake_case/);
    });
  });

  it('loading=true durante a requisição', () => {
    let resolveFetch: (value: unknown) => void = () => {};
    globalThis.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    ) as never;

    const { result } = renderHook(() => useCriarFeatureFlag());
    act(() => {
      void result.current.criar({ key: 'x_y', valueType: 'BOOLEAN', defaultValue: true });
    });
    expect(result.current.loading).toBe(true);

    return act(async () => {
      resolveFetch({ ok: true, status: 201, json: async () => ({}) });
    });
  });
});
```

- [ ] **Step 2: Rodar para confirmar RED**

Run: `cd apps/web && pnpm test --run tests/unit/application/admin/feature-flags/use-cases/CriarFeatureFlag.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar o hook**

```ts
// apps/web/src/application/admin/feature-flags/use-cases/useCriarFeatureFlag.ts
'use client';

/**
 * @spec(RF-ADM-FF-03, RNF-SEC-FF-01)
 *
 * Hook client-side que executa `POST /api/v1/admin/feature-flags`.
 *
 * Princípios DDD:
 *  - Camada `application` (use case client-side).
 *  - Sem dependência de ToastProvider — caller decide como emitir feedback.
 *
 * Sucesso/erro são expostos via callbacks `onSuccess`/`onError` para preservar
 * reuso (mesmo padrão de `useAtualizarFeatureFlag`).
 */
import { useCallback, useState } from 'react';
import { logger } from '@/lib/logger';

export type FlagValueType = 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';

export interface CriarFeatureFlagInput {
  key: string;
  description?: string;
  valueType: FlagValueType;
  defaultValue: unknown;
}

export interface CriarFeatureFlagResult {
  data: { id: string; key: string } | null;
  loading: boolean;
  error: string | null;
  criar: (
    input: CriarFeatureFlagInput,
    callbacks?: {
      onSuccess?: (data: { id: string; key: string }) => void;
      onError?: (message: string) => void;
    }
  ) => Promise<{ id: string; key: string } | null>;
  reset: () => void;
}

export function useCriarFeatureFlag(): CriarFeatureFlagResult {
  const [data, setData] = useState<{ id: string; key: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const criar = useCallback<CriarFeatureFlagResult['criar']>(async (input, callbacks) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message =
          (errorBody as { message?: string; error?: string }).message ??
          (errorBody as { error?: string }).error ??
          `Erro ${response.status}`;
        setError(message);
        callbacks?.onError?.(message);
        return null;
      }

      const result = (await response.json().catch(() => null)) as {
        id: string;
        key: string;
      } | null;
      setData(result);
      if (result) callbacks?.onSuccess?.(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('useCriarFeatureFlag', 'Falha no POST', { key: input.key, message });
      setError(message);
      callbacks?.onError?.(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, criar, reset };
}
```

- [ ] **Step 4: Rodar testes — esperado PASS**

Run: `cd apps/web && pnpm test --run tests/unit/application/admin/feature-flags/use-cases/CriarFeatureFlag.test.ts`
Expected: 3 testes passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/application/admin/feature-flags/use-cases/useCriarFeatureFlag.ts \
        apps/web/tests/unit/application/admin/feature-flags/use-cases/CriarFeatureFlag.test.ts
git commit -m "feat(feature-flags): hook useCriarFeatureFlag (POST)"
```

---

### Task 5: ModalCriarFlag — componente acessível

**Files:**

- Create: `apps/web/src/components/admin/feature-flags/ModalCriarFlag.tsx`
- Create: `apps/web/src/components/admin/feature-flags/ModalCriarFlag.module.css`

- [ ] **Step 1: Escrever teste RED**

```tsx
// apps/web/tests/unit/components/admin/feature-flags/ModalCriarFlag.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// @ts-expect-error — módulo ainda não implementado
import { ModalCriarFlag } from '@/components/admin/feature-flags/ModalCriarFlag';

describe('ModalCriarFlag (RF-ADM-FF-03)', () => {
  it('renderiza campos chave, descrição, tipo e valor padrão', () => {
    render(<ModalCriarFlag open onClose={vi.fn()} onSubmit={vi.fn()} role="owner" />);
    expect(screen.getByLabelText(/chave/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/valor padrão/i)).toBeInTheDocument();
  });

  it('valida formato snake_case da chave (mínimo 3 caracteres)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ModalCriarFlag open onClose={vi.fn()} onSubmit={onSubmit} role="owner" />);

    await user.type(screen.getByLabelText(/chave/i), 'ab'); // <3 chars
    await user.click(screen.getByTestId('btn-criar-flag-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('form-error')).toHaveTextContent(/3 caracteres/i);
  });

  it('muda input de valor padrão conforme tipo selecionado', async () => {
    const user = userEvent.setup();
    render(<ModalCriarFlag open onClose={vi.fn()} onSubmit={vi.fn()} role="owner" />);

    await user.click(screen.getByLabelText('Boolean'));
    expect(screen.getByLabelText(/valor padrão/i)).toBeInTheDocument();
    expect(screen.queryByTestId('input-valor-texto')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('JSON'));
    expect(screen.getByTestId('input-valor-json')).toBeInTheDocument();
  });

  it('manager NÃO vê botão "Criar" (RBAC visual)', () => {
    render(<ModalCriarFlag open onClose={vi.fn()} onSubmit={vi.fn()} role="manager" />);
    expect(screen.queryByTestId('btn-criar-flag-submit')).not.toBeInTheDocument();
    expect(screen.getByTestId('rbac-banner')).toBeInTheDocument();
  });

  it('chama onClose ao pressionar Esc', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ModalCriarFlag open onClose={onClose} onSubmit={vi.fn()} role="owner" />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('chama onSubmit com payload correto quando válido', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ModalCriarFlag open onClose={vi.fn()} onSubmit={onSubmit} role="owner" />);

    await user.type(screen.getByLabelText(/chave/i), 'minha_flag');
    await user.type(screen.getByLabelText(/descrição/i), 'Teste');
    // tipo padrão BOOLEAN
    await user.click(screen.getByLabelText('Boolean'));

    await user.click(screen.getByTestId('btn-criar-flag-submit'));

    expect(onSubmit).toHaveBeenCalledWith({
      key: 'minha_flag',
      description: 'Teste',
      valueType: 'BOOLEAN',
      defaultValue: false, // toggle inicia como false
    });
  });
});
```

- [ ] **Step 2: Rodar para confirmar RED**

Run: `cd apps/web && pnpm test --run tests/unit/components/admin/feature-flags/ModalCriarFlag.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Criar `ModalCriarFlag.tsx`**

```tsx
// apps/web/src/components/admin/feature-flags/ModalCriarFlag.tsx
'use client';

/**
 * @spec(RF-ADM-FF-03, RNF-SEC-FF-01)
 *
 * Modal acessível para criar uma nova feature flag.
 *
 * Acessibilidade:
 *  - role="dialog", aria-modal, focus trap manual (Esc + foco inicial).
 *  - srOnly <legend> no fieldset.
 *  - Foco retorna ao botão "+ Nova" após fechar.
 *
 * RBAC:
 *  - owner: vê botão Criar.
 *  - manager: vê apenas banner "Apenas owner pode criar flags".
 *
 * Validação client-side (espelha Zod):
 *  - key: regex ^[a-z0-9_]{3,64}$.
 *  - valueType + defaultValue coerentes.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { FlagValueType } from '@/application/admin/feature-flags/use-cases/useCriarFeatureFlag';
import styles from './ModalCriarFlag.module.css';

export type FeatureFlagRole = 'owner' | 'manager';

export interface CriarFlagSubmitPayload {
  key: string;
  description?: string;
  valueType: FlagValueType;
  defaultValue: unknown;
}

export interface ModalCriarFlagProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CriarFlagSubmitPayload) => void | Promise<void>;
  role: FeatureFlagRole;
}

const KEY_REGEX = /^[a-z0-9_]{3,64}$/;

interface FormState {
  key: string;
  description: string;
  valueType: FlagValueType;
  boolValue: boolean;
  stringValue: string;
  numberValue: string;
  jsonValue: string;
}

const EMPTY_FORM: FormState = {
  key: '',
  description: '',
  valueType: 'BOOLEAN',
  boolValue: false,
  stringValue: '',
  numberValue: '0',
  jsonValue: '{}',
};

export function ModalCriarFlag({ open, onClose, onSubmit, role }: ModalCriarFlagProps) {
  if (!open) return null;
  return <ModalBody onClose={onClose} onSubmit={onSubmit} role={role} />;
}

type ModalBodyProps = Omit<ModalCriarFlagProps, 'open'>;

function ModalBody({ onClose, onSubmit, role }: ModalBodyProps) {
  const titleId = useId();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Esc fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Foco inicial
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const isOwner = role === 'owner';

  const validate = ():
    | { ok: true; payload: CriarFlagSubmitPayload }
    | { ok: false; message: string } => {
    if (!KEY_REGEX.test(form.key)) {
      return {
        ok: false,
        message:
          'Chave deve estar em snake_case com 3 a 64 caracteres (apenas letras minúsculas, dígitos e underscore).',
      };
    }

    let defaultValue: unknown;
    switch (form.valueType) {
      case 'BOOLEAN':
        defaultValue = form.boolValue;
        break;
      case 'STRING':
        defaultValue = form.stringValue;
        break;
      case 'NUMBER': {
        const n = Number(form.numberValue);
        if (Number.isNaN(n)) return { ok: false, message: 'Valor padrão NUMBER inválido.' };
        defaultValue = n;
        break;
      }
      case 'JSON': {
        try {
          defaultValue = JSON.parse(form.jsonValue);
        } catch {
          return { ok: false, message: 'Valor padrão JSON inválido.' };
        }
        break;
      }
    }

    const payload: CriarFlagSubmitPayload = {
      key: form.key,
      valueType: form.valueType,
      defaultValue,
    };
    if (form.description.trim().length > 0) {
      payload.description = form.description.trim();
    }
    return { ok: true, payload };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = validate();
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await onSubmit(result.payload);
  };

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={styles.dialog}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Nova feature flag
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className={styles.closeBtn}
          >
            ×
          </button>
        </header>

        {!isOwner && (
          <p className={styles.banner} role="status" data-testid="rbac-banner">
            Apenas owner pode criar flags. Você está em modo leitura.
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <fieldset className={styles.fieldset} disabled={!isOwner}>
            <legend className={styles.srOnly}>Dados da nova flag</legend>

            <div className={styles.field}>
              <label htmlFor="key" className={styles.label}>
                Chave
              </label>
              <input
                id="key"
                type="text"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase() })}
                placeholder="minha_flag"
                autoComplete="off"
                className={styles.input}
                required
                aria-describedby="key-help"
              />
              <p id="key-help" className={styles.help}>
                snake_case, 3 a 64 caracteres (letras minúsculas, dígitos, _).
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="description" className={styles.label}>
                Descrição (opcional)
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                maxLength={500}
                className={styles.textarea}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Tipo do valor</span>
              <div className={styles.radioGroup} role="radiogroup" aria-labelledby="tipo-label">
                {(['BOOLEAN', 'STRING', 'NUMBER', 'JSON'] as const).map((vt) => (
                  <label key={vt} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="valueType"
                      value={vt}
                      checked={form.valueType === vt}
                      onChange={() => setForm({ ...form, valueType: vt })}
                      aria-label={
                        vt === 'BOOLEAN'
                          ? 'Boolean'
                          : vt === 'STRING'
                            ? 'String'
                            : vt === 'NUMBER'
                              ? 'Number'
                              : 'JSON'
                      }
                    />
                    <span>
                      {vt === 'BOOLEAN'
                        ? 'Boolean'
                        : vt === 'STRING'
                          ? 'Texto'
                          : vt === 'NUMBER'
                            ? 'Número'
                            : 'JSON'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="defaultValue" className={styles.label}>
                Valor padrão
              </label>
              {form.valueType === 'BOOLEAN' && (
                <label className={styles.toggleLabel}>
                  <input
                    id="defaultValue"
                    type="checkbox"
                    role="switch"
                    aria-checked={form.boolValue}
                    checked={form.boolValue}
                    onChange={(e) => setForm({ ...form, boolValue: e.target.checked })}
                  />
                  <span>{form.boolValue ? 'true' : 'false'}</span>
                </label>
              )}
              {form.valueType === 'STRING' && (
                <input
                  id="defaultValue"
                  type="text"
                  value={form.stringValue}
                  data-testid="input-valor-texto"
                  onChange={(e) => setForm({ ...form, stringValue: e.target.value })}
                  className={styles.input}
                />
              )}
              {form.valueType === 'NUMBER' && (
                <input
                  id="defaultValue"
                  type="number"
                  value={form.numberValue}
                  onChange={(e) => setForm({ ...form, numberValue: e.target.value })}
                  className={styles.input}
                />
              )}
              {form.valueType === 'JSON' && (
                <textarea
                  id="defaultValue"
                  data-testid="input-valor-json"
                  value={form.jsonValue}
                  onChange={(e) => setForm({ ...form, jsonValue: e.target.value })}
                  rows={4}
                  className={styles.textarea}
                  spellCheck={false}
                />
              )}
            </div>
          </fieldset>

          {error && (
            <p className={styles.error} role="alert" data-testid="form-error">
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.secondaryBtn}>
              Cancelar
            </button>
            {isOwner && (
              <button
                type="submit"
                className={styles.primaryBtn}
                data-testid="btn-criar-flag-submit"
              >
                Criar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Criar CSS Module (copiando padrão de `ModalOverrideFeatureFlag.module.css`)**

```css
/* apps/web/src/components/admin/feature-flags/ModalCriarFlag.module.css */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
}

.dialog {
  background: var(--color-surface, #fff);
  border-radius: 0.75rem;
  width: 100%;
  max-width: 32rem;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  outline: none;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text, #111827);
}

.closeBtn {
  border: 0;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-text-muted, #6b7280);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.closeBtn:hover {
  background: var(--color-surface-muted, #f3f4f6);
}

.closeBtn:focus-visible {
  outline: 2px solid var(--color-accent, #2563eb);
}

.banner {
  margin: 0;
  padding: 0.625rem 1.25rem;
  background: var(--color-warning-soft, #fef3c7);
  color: var(--color-warning-text, #92400e);
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.form {
  padding: 1rem 1.25rem;
}

.fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.fieldset:disabled {
  opacity: 0.7;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text, #111827);
}

.help {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
}

.input,
.textarea {
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--color-text, #111827);
  background: var(--color-surface, #fff);
  resize: vertical;
}

.input:focus,
.textarea:focus {
  outline: 2px solid var(--color-accent, #2563eb);
  outline-offset: 1px;
  border-color: var(--color-accent, #2563eb);
}

.radioGroup {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.radioLabel {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.toggleLabel {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.error {
  margin: 0.75rem 0 0 0;
  padding: 0.625rem 0.75rem;
  background: var(--color-danger-soft, #fee2e2);
  color: var(--color-danger-text, #991b1b);
  border-radius: 0.375rem;
  font-size: 0.8125rem;
}

.actions {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.primaryBtn,
.secondaryBtn {
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  font-family: inherit;
}

.primaryBtn {
  background: var(--color-accent, #2563eb);
  color: #fff;
  border: 1px solid var(--color-accent, #2563eb);
}

.primaryBtn:hover {
  background: var(--color-accent-hover, #1d4ed8);
}

.secondaryBtn {
  background: var(--color-surface, #fff);
  color: var(--color-text, #111827);
  border: 1px solid var(--color-border, #d1d5db);
}

.secondaryBtn:hover {
  background: var(--color-surface-muted, #f9fafb);
}

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 5: Rodar testes — esperado PASS**

Run: `cd apps/web && pnpm test --run tests/unit/components/admin/feature-flags/ModalCriarFlag.test.tsx`
Expected: 6 testes passing.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/feature-flags/ModalCriarFlag.tsx \
        apps/web/src/components/admin/feature-flags/ModalCriarFlag.module.css \
        apps/web/tests/unit/components/admin/feature-flags/ModalCriarFlag.test.tsx
git commit -m "feat(feature-flags): ModalCriarFlag acessível com validação client-side"
```

---

### Task 6: Integrar ModalCriarFlag no PainelFeatureFlags + emitir toast

**Files:**

- Modify: `apps/web/src/components/admin/feature-flags/PainelFeatureFlags.tsx`

- [ ] **Step 1: Atualizar teste existente de `PainelFeatureFlags` (se houver) — senão pular**

Verificar `apps/web/tests/unit/components/admin/feature-flags/PainelFeatureFlags.test.tsx`. Se existir, adicionar 1 teste para "botão + Nova abre modal". Se não existir, criar com cobertura básica do botão + integração com toast.

Adicionar (ou criar):

```tsx
// apps/web/tests/unit/components/admin/feature-flags/PainelFeatureFlags.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// @ts-expect-error — módulo ainda não implementado
import { PainelFeatureFlags } from '@/components/admin/feature-flags/PainelFeatureFlags';
// @ts-expect-error — wrapper necessário
import { ToastProvider } from '@/lib/notification';

globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({ data: [] }),
}) as never;

describe('PainelFeatureFlags — botão + Nova (RF-ADM-FF-03)', () => {
  it('owner: botão habilitado abre ModalCriarFlag', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <PainelFeatureFlags role="owner" />
      </ToastProvider>
    );

    const btn = screen.getByTestId('btn-criar-flag');
    expect(btn).not.toBeDisabled();

    await user.click(btn);
    expect(screen.getByRole('dialog', { name: /nova feature flag/i })).toBeInTheDocument();
  });

  it('manager: botão desabilitado com tooltip "Apenas owner pode criar flags"', () => {
    render(
      <ToastProvider>
        <PainelFeatureFlags role="manager" />
      </ToastProvider>
    );
    const btn = screen.getByTestId('btn-criar-flag');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/apenas owner/i));
  });
});
```

- [ ] **Step 2: Modificar `PainelFeatureFlags.tsx`**

Localizar imports (linhas 19–36) e adicionar:

```tsx
import { useCriarFeatureFlag } from '@/application/admin/feature-flags/use-cases/useCriarFeatureFlag';
import { useToast } from '@/lib/notification';
import { ModalCriarFlag, type FeatureFlagRole } from './ModalCriarFlag';
```

Localizar declaração do `role` prop:

```tsx
export interface PainelFeatureFlagsProps {
  role: FeatureFlagRole;
}
```

Como `FeatureFlagRole` agora é importado de `ModalCriarFlag`, **remover** o import de `FeatureFlagRole` em `TabelaFeatureFlags.tsx` (já tem lá também — verificar duplicação). Para evitar quebra de testes existentes, **re-exportar** em `TabelaFeatureFlags.tsx`:

```tsx
// apps/web/src/components/admin/feature-flags/TabelaFeatureFlags.tsx — modificar
export type { FeatureFlagRole } from './ModalCriarFlag';
```

(Substitui a declaração local `export type FeatureFlagRole = 'owner' | 'manager';` por re-export.)

Localizar dentro do componente (linha 93):

```tsx
const { atualizar } = useAtualizarFeatureFlag();
const { adicionar } = useAdicionarOverride();
const { remover } = useRemoverOverride();
```

Adicionar logo após:

```tsx
const { criar } = useCriarFeatureFlag();
const toast = useToast();
```

Localizar declaração de estados (linhas 87–91) e adicionar:

```tsx
const [modalCriarAberto, setModalCriarAberto] = useState(false);
```

Localizar botão "+ Nova" (linhas 252–262):

```tsx
{
  role === 'owner' && (
    <button
      type="button"
      className={styles.primaryBtn}
      data-testid="btn-criar-flag"
      disabled
      title="Funcionalidade prevista para fase posterior"
    >
      Nova flag
    </button>
  );
}
```

Substituir por:

```tsx
<button
  type="button"
  className={styles.primaryBtn}
  data-testid="btn-criar-flag"
  onClick={() => setModalCriarAberto(true)}
  disabled={role !== 'owner'}
  title={role === 'owner' ? undefined : 'Apenas owner pode criar flags'}
>
  Nova flag
</button>
```

Localizar após o modal de override (linha 314), adicionar:

```tsx
{
  modalCriarAberto && (
    <ModalCriarFlag
      open
      role={role}
      onClose={() => setModalCriarAberto(false)}
      onSubmit={async (payload) => {
        const result = await criar(payload, {
          onSuccess: () => {
            toast.success(`Flag "${payload.key}" criada.`);
            setModalCriarAberto(false);
            void carregar();
          },
          onError: (message) => {
            toast.error(message);
          },
        });
        return result;
      }}
    />
  );
}
```

- [ ] **Step 3: Rodar testes**

Run: `cd apps/web && pnpm test --run tests/unit/components/admin/feature-flags`
Expected: todos os testes existentes + 2 novos passando.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/feature-flags/PainelFeatureFlags.tsx \
        apps/web/src/components/admin/feature-flags/TabelaFeatureFlags.tsx \
        apps/web/tests/unit/components/admin/feature-flags
git commit -m "feat(feature-flags): integrar ModalCriarFlag + toast feedback"
```

---

### Task 7: Adicionar toast nos hooks existentes (atualizar/override/remover)

**Files:**

- Modify: `apps/web/src/components/admin/feature-flags/PainelFeatureFlags.tsx` (apenas as chamadas de hook)
- Modify: `apps/web/tests/unit/application/admin/feature-flags/use-cases/AtualizarFeatureFlag.test.ts`
- Modify: `apps/web/tests/unit/application/admin/feature-flags/use-cases/AdicionarOverride.test.ts`

- [ ] **Step 1: Localizar handlers em `PainelFeatureFlags.tsx`**

Em `handleToggle` (linhas 146–162), modificar a chamada:

```tsx
const result = await atualizar(
  key,
  { enabled },
  {
    onSuccess: () => {
      toast.success(`Flag "${key}" atualizada.`);
    },
    onError: (message) => {
      toast.error(message);
    },
    onRollback: () => {
      if (prev !== undefined) {
        dispatch({ type: 'optimistic_toggle', key, enabled: prev });
      }
    },
  }
);
```

(Nota: `useAtualizarFeatureFlag` precisa expor `onSuccess`/`onError` também.)

- [ ] **Step 2: Atualizar `useAtualizarFeatureFlag.ts` para aceitar `onSuccess`/`onError`**

Modificar a interface e o callback:

```ts
export interface AtualizarFeatureFlagInput {
  description?: string;
  defaultValue?: unknown;
  enabled?: boolean;
}

export interface AtualizarFeatureFlagOptions {
  onOptimistic?: () => void;
  onRollback?: () => void;
  onSuccess?: (data: unknown) => void;
  onError?: (message: string) => void;
}

export interface AtualizarFeatureFlagResult {
  data: unknown | null;
  loading: boolean;
  error: string | null;
  atualizar: (
    key: string,
    payload: AtualizarFeatureFlagInput,
    options?: AtualizarFeatureFlagOptions
  ) => Promise<unknown | null>;
  reset: () => void;
}

// Dentro de atualizar():
// Após if (!response.ok):
//   callbacks.onError?.(message);
// Em sucesso:
//   callbacks.onSuccess?.(result);
```

Atualizar o tipo `options?` na assinatura e os callsites.

- [ ] **Step 3: Atualizar `useAdicionarOverride.ts` similarmente**

```ts
export interface AdicionarOverrideOptions {
  onSuccess?: (data: { id: string }) => void;
  onError?: (message: string) => void;
}
// adicionar parâmetro options?: AdicionarOverrideOptions ao adicionar()
```

- [ ] **Step 4: Atualizar `useRemoverOverride.ts` similarmente**

- [ ] **Step 5: Atualizar testes dos hooks**

Em `AtualizarFeatureFlag.test.ts`, adicionar:

```ts
it('chama onSuccess em sucesso', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ key: 'pix_enabled', enabled: false }),
  }) as never;
  const onSuccess = vi.fn();
  const { result } = renderHook(() => useAtualizarFeatureFlag());
  await act(async () => {
    await result.current.atualizar('pix_enabled', { enabled: false }, { onSuccess });
  });
  expect(onSuccess).toHaveBeenCalledWith({ key: 'pix_enabled', enabled: false });
});

it('chama onError em 500 com mensagem do backend', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({ message: 'internal' }),
  }) as never;
  const onError = vi.fn();
  const { result } = renderHook(() => useAtualizarFeatureFlag());
  await act(async () => {
    await result.current.atualizar('pix_enabled', { enabled: false }, { onError });
  });
  expect(onError).toHaveBeenCalledWith(expect.stringMatching(/internal/));
});
```

Em `AdicionarOverride.test.ts`, adicionar testes análogos.

- [ ] **Step 6: Atualizar `PainelFeatureFlags.tsx` para chamar hooks com toast**

```tsx
const handleToggle = useCallback(
  async (key: string, enabled: boolean) => {
    const prev = flags.find((f) => f.key === key)?.enabled;
    dispatch({ type: 'optimistic_toggle', key, enabled });
    await atualizar(
      key,
      { enabled },
      {
        onSuccess: () => toast.success(`Flag "${key}" atualizada.`),
        onError: (message) => toast.error(message),
        onRollback: () => {
          if (prev !== undefined) {
            dispatch({ type: 'optimistic_toggle', key, enabled: prev });
          }
        },
      }
    );
  },
  [atualizar, flags, toast]
);

const handleSubmitOverride = useCallback(
  async (payload: OverrideSubmitPayload) => {
    if (!modalFlagKey) return;
    const result = await adicionar(modalFlagKey, payload, {
      onSuccess: () => toast.success('Override adicionado.'),
      onError: (message) => toast.error(message),
    });
    if (result) {
      setModalFlagKey(null);
      void carregar();
    }
  },
  [modalFlagKey, adicionar, carregar, toast]
);

const handleDeleteOverride = useCallback(
  async (id: string) => {
    if (!modalFlagKey) return;
    const ok = await remover(modalFlagKey, id, {
      onSuccess: () => toast.success('Override removido.'),
      onError: (message) => toast.error(message),
    });
    if (ok) {
      setModalFlagKey(null);
      setExistingOverrides({});
      void carregar();
    }
  },
  [modalFlagKey, remover, carregar, toast]
);
```

- [ ] **Step 7: Rodar testes — esperado PASS**

Run: `cd apps/web && pnpm test --run tests/unit/application/admin/feature-flags tests/unit/components/admin/feature-flags tests/unit/lib/notification`
Expected: tudo passing.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/application/admin/feature-flags/use-cases \
        apps/web/src/components/admin/feature-flags/PainelFeatureFlags.tsx \
        apps/web/tests/unit/application/admin/feature-flags
git commit -m "feat(feature-flags): toast feedback em todas as mutations"
```

---

### Task 8: Adicionar `managerUser` ao seed E2E

**Files:**

- Modify: `apps/web/tests/e2e/scripts/seed.ts`
- Modify: `apps/web/tests/e2e/tests/shared/fixtures/index.ts`

- [ ] **Step 1: Modificar `seed.ts`**

Localizar `createUsers()` (linhas 164–218) e modificar a declaração:

```ts
const users: SeedResult['users'] = {
  customer: {
    id: '',
    email: `${SEED_PREFIX}customer${shardSuffix}@pedi-ai.test`,
    password: TEST_PASSWORD,
  },
  admin: {
    id: '',
    email: `${SEED_PREFIX}admin${shardSuffix}@pedi-ai.test`,
    password: TEST_PASSWORD,
  },
  waiter: {
    id: '',
    email: `${SEED_PREFIX}waiter${shardSuffix}@pedi-ai.test`,
    password: TEST_PASSWORD,
  },
  manager: {
    id: '',
    email: `${SEED_PREFIX}manager${shardSuffix}@pedi-ai.test`,
    password: TEST_PASSWORD,
  },
};
```

Localizar interface `SeedResult['users']` (linhas 70–75) e modificar:

```ts
users: {
  customer: TestUser;
  admin: TestUser;
  waiter: TestUser;
  manager: TestUser;
}
```

Localizar `createUserProfiles()` (linhas 357–404) e adicionar `manager`:

```ts
const validProfiles = [
  {
    user_id: users.customer.id,
    email: users.customer.email,
    name: 'Cliente Teste',
    role: 'cliente',
  },
  { user_id: users.admin.id, email: users.admin.email, name: 'Admin Teste', role: 'dono' },
  { user_id: users.waiter.id, email: users.waiter.email, name: 'Garçom Teste', role: 'atendente' },
  { user_id: users.manager.id, email: users.manager.email, name: 'Gerente Teste', role: 'gerente' },
].filter((p) => p.user_id);
```

Localizar `cleanupExistingTestData()` (linhas 453–478) e adicionar manager aos emails:

```ts
const testEmails = [
  `${SEED_PREFIX}customer${shardSuffix}@pedi-ai.test`,
  `${SEED_PREFIX}admin${shardSuffix}@pedi-ai.test`,
  `${SEED_PREFIX}waiter${shardSuffix}@pedi-ai.test`,
  `${SEED_PREFIX}manager${shardSuffix}@pedi-ai.test`,
];
```

Localizar bloco de log final (linhas 522–528) e adicionar:

```ts
console.log(`   Manager: ${users.manager.email} / ${TEST_PASSWORD}`);
```

- [ ] **Step 2: Modificar `fixtures/index.ts`**

Modificar `SeedData` interface (linhas 43–51):

```ts
export interface SeedData {
  restaurant: { id: string; name: string };
  customer: { email: string; password: string; id: string };
  admin: { email: string; password: string; id: string };
  waiter: { email: string; password: string; id: string };
  manager: { email: string; password: string; id: string };
  table: { id: string; code: string };
  categories: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; price: number }>;
}
```

Modificar `Fixtures` interface (linhas 30–38):

```ts
export interface Fixtures {
  guest: Page;
  authenticated: Page;
  admin: Page;
  waiter: Page;
  manager: Page;
  cleanPage: Page;
  seedData: SeedData;
  api: APIRequestContext;
}
```

Modificar `loadSeedData()` (linhas 73–101):

```ts
return {
  restaurant: raw.restaurant,
  customer: {
    id: raw.users.customer.id,
    email: raw.users.customer.email,
    password: raw.users.customer.password,
  },
  admin: {
    id: raw.users.admin.id,
    email: raw.users.admin.email,
    password: raw.users.admin.password,
  },
  waiter: {
    id: raw.users.waiter.id,
    email: raw.users.waiter.email,
    password: raw.users.waiter.password,
  },
  manager: {
    id: raw.users.manager.id,
    email: raw.users.manager.email,
    password: raw.users.manager.password,
  },
  table: {
    id: raw.tables[0]?.id ?? raw.table?.id ?? '',
    code: raw.tables[0]?.qr_code ?? raw.table?.code ?? '',
  },
  categories: raw.categories,
  products: raw.products.map((p: { id: string; name: string; price: number }) => ({
    id: p.id,
    name: p.name,
    price: p.price,
  })),
};
```

Adicionar fixture `manager` após `waiter` (linhas 265–271):

```ts
manager: async ({ page, seedData }, fixtureUse) => {
  const email = seedData.manager.email;
  const password = seedData.manager.password;
  await performLogin(page, email, password, '/admin/login', /\/admin\/dashboard/);
  await fixtureUse(page);
},
```

- [ ] **Step 3: Validar compilação TypeScript**

Run: `cd apps/web && pnpm tsc --noEmit 2>&1 | tail -20`
Expected: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web/tests/e2e/scripts/seed.ts \
        apps/web/tests/e2e/tests/shared/fixtures/index.ts
git commit -m "test(e2e): adicionar fixture managerUser para RBAC real"
```

---

### Task 9: Atualizar teste E2E "manager 403" para usar manager real

**Files:**

- Modify: `apps/web/tests/e2e/tests/admin/feature-flags.spec.ts`

- [ ] **Step 1: Substituir o teste "manager recebe 403"**

Localizar (linhas 164–190):

```ts
test(
  'manager recebe 403 ao tentar criar flag (RBAC visual + backend)',
  { tag: ['@RNF-SEC-FF-01', '@RF-ADM-FF-03'] },
  async ({ page, seedData }) => {
    // Login como manager: seed não tem manager; usamos waiter como substituto
    // de papel sem privilégio (staff-like) já que a seed atual só cria 1 admin
    // e 1 waiter. Este teste valida o caminho 403 contra um papel não-owner.
    const loginResp = await page.request.post('/api/v1/auth/login', {
      data: { email: seedData.waiter.email, password: seedData.waiter.password },
    });
    expect(loginResp.status()).toBeLessThan(400);

    // Tenta criar flag — espera 403
    const createResp = await page.request.post('/api/v1/admin/feature-flags', {
      data: { key: 'flag_teste_negada', valueType: 'BOOLEAN', defaultValue: false },
    });
    expect(createResp.status()).toBe(403);

    // Tenta acessar a página — espera ser redirecionado ou ver estado restrito
    await page.goto('/admin/feature-flags', { waitUntil: 'domcontentloaded' });
    // Sem permissão de escrita: botões de ação devem estar desabilitados
    const createBtn = page.locator('[data-testid="btn-criar-flag"]');
    if (await createBtn.count()) {
      await expect(createBtn).toBeDisabled();
    }
  }
);
```

Substituir por:

```ts
test(
  'manager recebe 403 ao tentar criar flag (RBAC visual + backend)',
  { tag: ['@RNF-SEC-FF-01', '@RF-ADM-FF-03'] },
  async ({ page, seedData }) => {
    // Login como manager real (papel 'gerente') — valida caminho específico
    // "manager mas mutation → 403" do FeatureFlagAdminGuard
    const loginResp = await page.request.post('/api/v1/auth/login', {
      data: { email: seedData.manager.email, password: seedData.manager.password },
    });
    expect(loginResp.status()).toBeLessThan(400);

    // Tenta criar flag — espera 403
    const createResp = await page.request.post('/api/v1/admin/feature-flags', {
      data: { key: 'flag_teste_negada', valueType: 'BOOLEAN', defaultValue: false },
    });
    expect(createResp.status()).toBe(403);

    // Tenta PATCH — espera 403
    const patchResp = await page.request.patch('/api/v1/admin/feature-flags/pix_enabled', {
      data: { enabled: false },
    });
    expect(patchResp.status()).toBe(403);

    // Tenta adicionar override — espera 403
    const overrideResp = await page.request.post(
      '/api/v1/admin/feature-flags/pix_enabled/overrides',
      { data: { scope: 'GLOBAL', value: false } }
    );
    expect(overrideResp.status()).toBe(403);

    // Mas pode LER (audit)
    const auditResp = await page.request.get(
      '/api/v1/admin/feature-flags/pix_enabled/audit?limit=10'
    );
    expect(auditResp.status()).toBe(200);

    // Tenta acessar a página — botão "+ Nova" deve estar desabilitado
    await page.goto('/admin/feature-flags', { waitUntil: 'domcontentloaded' });
    const createBtn = page.locator('[data-testid="btn-criar-flag"]');
    if (await createBtn.count()) {
      await expect(createBtn).toBeDisabled();
      await expect(createBtn).toHaveAttribute('title', /apenas owner/i);
    }
  }
);
```

- [ ] **Step 2: Atualizar outro teste E2E que referencia `toast-confirmacao`**

Localizar (linha 74):

```ts
await page.locator('[data-testid="toast-confirmacao"]').waitFor({ state: 'visible' });
```

Substituir por:

```ts
await page.locator('[data-testid="toast-success"]').waitFor({ state: 'visible' });
```

- [ ] **Step 3: Rodar lint nos specs**

Run: `cd apps/web && pnpm lint apps/web/tests/e2e/tests/admin/feature-flags.spec.ts`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/tests/e2e/tests/admin/feature-flags.spec.ts
git commit -m "test(e2e): usar manager real no teste RBAC + verificar PATCH/overrides 403"
```

---

### Task 10: Verificação final

- [ ] **Step 1: Rodar todos os testes unitários**

Run: `cd apps/web && pnpm test --run tests/unit/components/admin/feature-flags tests/unit/lib/notification tests/unit/application/admin/feature-flags`
Expected: todos passing.

- [ ] **Step 2: Rodar suite completa**

Run: `pnpm test --run 2>&1 | tail -30`
Expected: 2338+ testes passing (soma dos 11 novos do ToastProvider + 6 ModalCriarFlag + 3 useCriarFeatureFlag + 2 toast nos hooks existentes + 2 PainelFeatureFlags).

- [ ] **Step 3: Verificar cobertura**

Run: `cd apps/web && pnpm test:coverage 2>&1 | grep -E "notification|CriarFeatureFlag|ModalCriarFlag"`
Expected: ≥ 80% para os arquivos novos.

- [ ] **Step 4: Lint**

Run: `cd apps/web && pnpm lint 2>&1 | tail -10`
Expected: 0 errors.

- [ ] **Step 5: Build**

Run: `cd apps/web && pnpm build 2>&1 | tail -20`
Expected: build success.

- [ ] **Step 6: (Se ambiente E2E) Seed + E2E**

```bash
docker-compose -f docker-compose.dev.yml up -d
pnpm test:e2e:seed
pnpm test:e2e -- --grep "Feature Flags"
```

Expected: 7 testes passing (incluindo "manager recebe 403" atualizado).

- [ ] **Step 7: Commit final de validação**

```bash
git status  # deve estar limpo
```

---

## Pontos de Fricção com Backend

1. **Mensagens de erro Zod**: o backend retorna `message` com issues unidos por `;` (DTO `validar()` helper, linha 113–117 de `FeatureFlagsDto.ts`). O hook propaga essa string para o `toast.error(message)` — usuário vê mensagem utilizável.

2. **RBAC granular**: `FeatureFlagAdminGuard` (linhas 53–68) já trata `manager`/`gerente` separadamente de "papel desconhecido". O teste "manager 403" passa a validar o caminho específico (403 com mensagem "Apenas owner pode realizar mutações em feature flags").

3. **Cookie `session_token` HttpOnly**: login via `POST /api/v1/auth/login` retorna cookie que o `page.request` do Playwright mantém entre requests. Não precisa de header `Authorization` manual.

4. **Validação server-side vs client-side**: o regex `^[a-z0-9_]{3,64}$` é replicado em `ModalCriarFlag.validate()` (consistência com `FlagKey.criar()` no backend).

5. **Tipos duplicados**: o frontend declara `FlagValueType` localmente em `useCriarFeatureFlag.ts` (em vez de importar de `infrastructure/feature-flags/types.ts`). Decisão consciente: o tipo em `infrastructure` é usado pelo SDK reativo; o tipo do use case é dedicado ao POST. Manter separados para evitar acoplamento.

---

## Pendências (fora de escopo desta task)

1. **Sidebar admin não tem item "Feature Flags"** (`app/admin/layout.tsx:39–53`). Resolvível em PR separado.
2. **Migração para TanStack Query**: os hooks de feature-flags continuam usando fetch direto + useState. Refator para `useMutation`/`useQuery` simplificaria cache invalidation.
3. **Foco trap completo no modal**: hoje usa Esc + foco inicial manual. Para WCAG AAA, adicionar Tab cycling entre focusable elements (existe `lib/a11y/use-focus-trap.ts` no projeto — integrar).
4. **Auditoria visual de mudanças**: o AuditLogViewer já existe mas só é aberto sob demanda. Considerar expandir auditoria para mutações futuras (criação de flag).
