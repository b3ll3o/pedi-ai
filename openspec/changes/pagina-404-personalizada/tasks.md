# Tasks: Página 404 Personalizada - Pedi-AI

## Phase 1: Foundation
- [x] 1.1 Ler convenções de CSS do projeto em `src/app/globals.css`
- [x] 1.2 Verificar padrão de estilos em `src/app/page.module.css` como referência
- [x] 1.3 Verificar estrutura de `src/app/` para confirmar localização de `not-found.tsx`

## Phase 2: Core Implementation
- [x] 2.1 Criar `src/app/not-found.tsx` com:
  - Comportamento `'use client'`
  - Hook `useAuth()` para verificar autenticação
  - Loading state com skeleton durante verificação
  - Redirect com `router.replace('/admin/dashboard')` para usuário logado
  - Exibição de página 404 pública para usuário não logado
  - Acessibilidade: `aria-labelledby`, `aria-label`, landmarks semânticos
- [x] 2.2 Criar `src/app/not-found.module.css` com:
  - Variáveis CSS do `globals.css` (cores `#E85D04`, `#F48C06`, `#DC2626`)
  - Background `#FFFBF5`
  - Design mobile-first (layout vertical centralizado)
  - Responsividade para tablet/desktop
  - Estilos para skeleton de loading
  - Estilos para código 404 grande com destaque visual
  - Estilos para botões primário e secundário

## Phase 3: Verification
- [x] 3.1 Executar build `npm run build` e verificar sem erros
- [x] 3.2 Verificar sucesso criteria:
  - [x] 404 exibida para usuário não logado
  - [x] Redirect para `/admin/dashboard` para usuário logado
  - [x] Loading state durante verificação de auth
  - [x] Design responsivo mobile-first
  - [x] Identidade visual Pedi-AI (cores, tipografia Geist)
  - [x] Acessibilidade: contraste, landmarks, elementos interativos com nome acessível

## Phase 4: Documentation
- [x] 4.1 Confirmar que proposal.md está em `openspec/changes/pagina-404-personalizada/proposal.md`
