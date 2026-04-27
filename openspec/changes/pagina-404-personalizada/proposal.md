# Proposal: Página 404 Personalizada - Pedi-AI

## Intent

Criar uma página de erro 404 (Not Found) personalizada que:
1. Segue a identidade visual do Pedi-AI (paleta de cores `#E85D04`, `#F48C06`, `#DC2626`, tipografia Geist)
2. Redireciona automaticamente para `/` se o usuário **não** estiver logado
3. Redireciona automaticamente para `/admin/dashboard` se o usuário **estiver** logado
4. Proporciona feedback visual amigável e profissional quando uma rota não existe

## Scope

### In Scope

- Criar `src/app/not-found.tsx` como página de erro 404 global do Next.js App Router
- Criar `src/app/not-found.module.css` para estilos específicos da página 404
- Implementar verificação de autenticação usando o hook `useAuth()`
- Redirecionamento inteligente baseado no estado de autenticação:
  - Usuário logado → `/admin/dashboard`
  - Usuário não logado → exibe página 404 pública
- Design responsivo mobile-first
- Tratamento de loading state durante verificação de autenticação
- Acessibilidade: contraste adequado, elementos interativos com nome acessível, landmarks semânticos

### Out of Scope

- Páginas de erro para outros códigos HTTP (500, 403, 502, etc.)
- Personalização de emails de erro
- Alterações no middleware de autenticação existente (`src/middleware.ts`)
- Testes E2E específicos para a página 404
- Tracking/analytics de erros 404

## Approach

### Fluxo de Comportamento

```
Usuário acessa rota inexistente
    │
    ▼
not-found.tsx renderiza
    │
    ▼
isLoading === true?
    ├── SIM → Exibe skeleton de loading
    │
    └── NÃO → Verifica isAuthenticated
                │
                ├── SIM (logado) → router.replace('/admin/dashboard')
                │
                └── NÃO (não logado) → Exibe página 404 pública
```

### Estrutura do Componente

```tsx
// src/app/not-found.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <main className={styles.container}>
      <section aria-labelledby="error-title">
        <div className={styles.errorIcon} aria-hidden="true">
          {/* SVG de QR code quebrado ou ícone 404 */}
        </div>
        <h1 id="error-title" className={styles.title}>
          Ops! Página não encontrada
        </h1>
        <p className={styles.subtitle}>
          A página que você procura não existe ou foi movida.
        </p>
        <div className={styles.errorCode} aria-hidden="true">404</div>
        <nav aria-label="Ações" className={styles.actions}>
          <Link href="/" className={styles.primaryButton}>
            Voltar ao Cardápio
          </Link>
          <Link href="/login" className={styles.secondaryButton}>
            Fazer Login
          </Link>
        </nav>
      </section>
    </main>
  );
}
```

### Design Visual

| Elemento | Estilo |
|----------|--------|
| Background | `#FFFBF5` (warm background) |
| Título | `#1C1917` (text-primary), Geist Sans |
| Código 404 | Grande, `#E85D04` (primary), destaque visual |
| Botão Primário | Background `#E85D04`, texto branco, sombra `shadow-primary` |
| Botão Secundário | Border `#E85D04`, texto `#E85D04`, fundo transparente |
| Ícone | SVG inline de QR code quebrado, `#E85D04` |

### Responsividade

- Mobile-first: layout vertical centralizado
- Tablet/Desktop: maior espaçamento, ícone maior

## Affected Areas

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/app/not-found.tsx` | Página de erro 404 global |
| `src/app/not-found.module.css` | Estilos específicos da página |

### Arquivos Existentes (Leitura Necessária)

| Arquivo | Razão |
|---------|-------|
| `src/app/globals.css` | Variáveis CSS (cores, espaçamentos) |
| `src/hooks/useAuth.ts` | Hook de autenticação |
| `src/app/page.module.css` | Referência de estilos (landing page) |

### Dependências

- `useAuth` hook (já existe em `src/hooks/useAuth.ts`)
- CSS variables (já existem em `src/app/globals.css`)

## Risks

### Risk 1: Redirect loop em certas condições
- **Probabilidade**: Baixa
- **Impacto**: Usuário fica preso em loop de redirecionamento
- **Mitigação**: Verificar `isLoading` antes de fazer redirect; usar `router.replace` (não push); condição `if (!isLoading && isAuthenticated)`

### Risk 2: Página 404 para rotas admin sendo cobertas pelo middleware
- **Probabilidade**: Baixa
- **Impacto**: Conflito entre middleware e página 404
- **Mitigação**: A página 404 só faz redirect se `isAuthenticated === true`; o middleware trata o caso oposto (não logado acessando admin)

### Risk 3: SEO - página 404 indexada
- **Probabilidade**: Baixa
- **Impacto**: Páginas 404 no Google
- **Mitigação**: Next.js já envia código HTTP 404; não há necessidade de meta robots

## Rollback Plan

1. Remover ou renomear `src/app/not-found.tsx`
2. Next.js automaticamente usará a página 404 default do framework
3. Remover `src/app/not-found.module.css` se existir

## Success Criteria

- [ ] Página 404 é exibida quando rota não existe (usuário não logado)
- [ ] Redirecionamento para `/admin/dashboard` funciona (usuário logado)
- [ ] Loading state é exibido durante verificação de autenticação
- [ ] Design é responsivo e mobile-first
- [ ] Identidade visual do Pedi-AI está presente (cores `#E85D04`, `#F48C06`, `#DC2626`)
- [ ] Acessibilidade: contraste adequado, elementos interativos com nome acessível
- [ ] Funciona offline (não depende de requisições externas após carregamento inicial)
- [ ] Build passa sem erros (`npm run build`)

## Notas Técnicas

### Por que não usar middleware?

O middleware do Next.js (`src/middleware.ts`) já trata rotas administrativas, mas:
- Não consegue distinguir facilmente "página não existe" de "acesso negado"
- Adicionaria complexidade desnecessária para um caso simples
- A verificação no nível da página é mais direta e manutenível

### Por que usar not-found.tsx?

Next.js App Router trata `not-found.tsx` como:
- Renderizado quando `notFound()` é chamado explicitamente
- Renderizado para rotas que não existem (catch-all não implementado)
- Envia código HTTP 404 automaticamente
