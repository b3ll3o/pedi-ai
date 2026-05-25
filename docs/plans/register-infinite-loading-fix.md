# SDD: Correção Loading Infinito na Página de Registro

## 1. Problema

**Sintoma:** A página `/register` fica em carregamento infinito em certos cenários (API lenta ou DB indisponível).

**Análise de causa raiz:**

O `getSession()` em `apps/web/src/lib/auth/client.ts` usa `fetch()` sem timeout:

```ts
// Sem timeout — se API demorar, fetch fica pendente pra sempre
const response = await fetch('/api/auth/session');
```

Se `/api/auth/session` demora a responder (DB lento ou indisponível), o fetch fica pendente indefinidamente. O `catch` só trata erros de rede (conexão recusada), não respostas lentas.

**Camadas afetadas:**

- `useAuth` (hook) → chama `getSession()` sem timeout → `isLoading` fica `true` pra sempre
- Register page → tem timeout próprio de 5s como fallback, mas `useAuth` pode causar efeitos colaterais
- Login page → depende de `useAuth.isLoading` → sem timeout = loading infinito se API lenta

## 2. Comportamento Esperado

- Página de registro deve exibir o formulário em até 5s, mesmo se a API de sessão estiver lenta
- Login page deve ter timeout similar para não ficar em loading infinito
- Falhas de rede/servidor devem ser tratadas gracefulmente, mostrando o formulário/página de login

## 3. Solução

### 3.1 Adicionar timeout ao `getSession()` em `lib/auth/client.ts`

Usar `AbortController` com timeout de 8 segundos:

```ts
export async function getSession(): Promise<...> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('/api/auth/session', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    // ... rest
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return null; // timeout
    }
    return null;
  }
}
```

### 3.2 Verificar se Register page precisa de timeout próprio

O register page JÁ tem timeout próprio de 5s (`SESSION_CHECK_TIMEOUT_MS`). Com o timeout no `getSession()`, o timeout próprio do register page continua como backup — isso é defesa em profundidade.

## 4. Testes

### 4.1 E2E: Register page com API lenta/falhou

```ts
test('register page mostra formulário após API de sessão falhar', async ({ page }) => {
  // Simular API de sessão lenta/desativada via route handler mock
  await page.route('/api/auth/session', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 30000)); // 30s delay
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
  });

  await page.goto('/register');
  // Deve mostrar o formulário dentro de 10s (não ficar em loading infinito)
  await expect(page.getByTestId('name-input')).toBeVisible({ timeout: 10000 });
});
```

### 4.2 E2E: Login page com API de sessão falhando

```ts
test('login page mostra formulário após API de sessão falhar', async ({ page }) => {
  await page.route('/api/auth/session', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 30000));
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
  });

  await page.goto('/login');
  await expect(page.getByTestId('email-input')).toBeVisible({ timeout: 10000 });
});
```

### 4.3 Verificar que Register page com API OK funciona normalmente

```ts
test('register page carrega normalmente quando API de sessão responde', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByTestId('name-input')).toBeVisible({ timeout: 5000 });
});
```

## 5. Arquivos a Alterar

| Arquivo                                                        | Mudança                                                |
| -------------------------------------------------------------- | ------------------------------------------------------ |
| `apps/web/src/lib/auth/client.ts`                              | Adicionar AbortController + timeout 8s no `getSession` |
| `apps/web/tests/e2e/tests/customer/register.spec.ts`           | Adicionar teste: register com API de sessão lenta      |
| `apps/web/tests/e2e/pages/RegisterPage.ts`                     | Nenhuma mudança necessária                             |
| `apps/web/tests/e2e/tests/customer/login.spec.ts` (se existir) | Adicionar teste: login com API de sessão lenta         |

## 6. Riscos e Mitigações

| Risco                                                           | Mitigação                                                                                |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Timeout muito curto (8s) causa falsos positivos em redes lentas | 8s é suficiente para a maioria dos casos; timeout do register page (5s) garante fallback |
| Timeout no client interfere com server-side getSession          | `getSession` do server (lib/auth/session.ts) não usa fetch — não é afetado               |
| Testes E2E com route mock podem não refletir comportamento real | Testes são de regressão — não devem ser removidos mesmo se passarem                      |

## 7. Critério de Sucesso

- [ ] `getSession()` em `lib/auth/client.ts` tem AbortController com timeout de 8s
- [ ] Teste E2E: register page exibe formulário em até 10s mesmo com API de sessão lenta (30s delay)
- [ ] Teste E2E: login page exibe formulário em até 10s mesmo com API de sessão lenta
- [ ] Todos os testes E2E existentes continuam passando
- [ ] TypeScript compila sem erros
