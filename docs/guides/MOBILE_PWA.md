# PWA Mobile-First — Guia de Desenvolvimento

Guia técnico para desenvolvimento mobile-first e Progressive Web App (PWA) no Pedi-AI.

---

## 1. Visão Geral

O Pedi-AI segue a filosofia **Mobile-First**: desenvolver para mobile primeiro e escalar progressivamente para telas maiores. Esta abordagem garante performance otimizada em dispositivos móveis e oferece experiência superior quando ampliada para desktop.

**Princípios fundamentais:**
- Mobile é a base, não uma versão reduzida
- Performance é prioridade, especialmente em conexões móveis
- Experiência touch-first com áreas de toque generosas
- Offline-first: funcionamento sem internet é obrigatório

---

## 2. Breakpoints

Usar `em` em media queries para consistência com preferências de fonte do usuário.

```css
/* Base (mobile): < 640px */
:root {
  --breakpoint-tablet: 40em;  /* 640px */
  --breakpoint-desktop: 64em;  /* 1024px */
}

/* Tablet: 640px - 1024px */
@media (min-width: 40em) { }

/* Desktop: > 1024px */
@media (min-width: 64em) { }
```

| Dispositivo | Largura | Breakpoint |
|-------------|---------|------------|
| Mobile      | < 640px | base       |
| Tablet      | 640-1024px | `(min-width: 40em)` |
| Desktop     | > 1024px | `(min-width: 64em)` |

---

## 3. Princípios Mobile-First

### 3.1 Fluxo de Desenvolvimento

1. **Começar pelo menor breakpoint** (mobile base)
2. **Escalar para cima** com `min-width` media queries
3. **Mobile como padrão** — estilos base são para mobile
4. **Desktop como enhancement** — apenas adicionar estilos para telas maiores

```css
/* ✅ CORRETO: Mobile base, desktop enhancement */
.card {
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

@media (min-width: 40em) {
  .card {
    padding: 1.5rem;
    flex-direction: row;
  }
}

/* ❌ INCORRETO: Desktop base, mobile override */
.card {
  padding: 1.5rem;
  display: flex;
  flex-direction: row;
}

@media (max-width: 39.99em) {
  .card {
    padding: 1rem;
    flex-direction: column;
  }
}
```

### 3.2 Touch-Friendly

- **Botões e áreas de toque**: mínimo **44x44px** (recomendação Apple/Google)
- **Espaçamento entre elementos**: mínimo 8px entre áreas de toque
- **Gaps adequados**: usar `gap` em flexbox/grid para espaçamento consistente

```css
.botao-principal {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem 1.5rem;
  gap: 0.5rem;
}

.menu-item {
  min-height: 48px; /* ainda melhor para listas */
  padding: 0.75rem;
}
```

### 3.3 Performance Mobile

- Evitar bundles JavaScript grandes em mobile
- Lazy loading de imagens e componentes
- Code splitting por rota
- Priorizar Critical CSS inline

---

## 4. CSS Best Practices

### 4.1 Unidades Relativas

| Unidade | Uso | Exemplo |
|---------|-----|---------|
| `rem` | Tamanhos de fonte e espaçamento | `font-size: 1rem; padding: 1rem;` |
| `em` | Valores relativos ao elemento pai | `margin: 1em;` |
| `%` | Valores percentuais | `width: 100%;` |
| `px` | Exceções (bordas, sombras pequenas) | `border: 1px solid;` |

**Regra**: `1rem = 16px` base (definido pelo navegador). Usar `rem` permite que a UI escale quando usuários mudam o tamanho de fonte do navegador.

```css
/* ✅ CORRETO */
.titulo {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

/* ❌ INCORRETO - não escala com preferências do usuário */
.titulo {
  font-size: 24px;
  margin-bottom: 16px;
}
```

### 4.2 CSS Custom Properties (Variáveis)

Definir valores reutilizáveis em `:root` para:
- Espaçamentos
- Cores
- Tamanhos de fonte
- Breakpoints

```css
:root {
  /* Espaçamentos (multiplos de 4px base) */
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;       /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;       /* 32px */

  /* Cores */
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;

  /* Tipografia */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;

  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;
}
```

### 4.3 Evitar Números Mágicos

Usar variáveis ou múltiplos de uma base (tipicamente 4px ou 8px).

```css
/* ✅ CORRETO - usando variáveis */
.card {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

/* ❌ INCORRETO - número mágico */
.card {
  padding: 17px;
  margin-bottom: 23px;
}
```

### 4.4 Shorthand Properties

```css
/* ✅ CORRETO */
.elemento {
  margin: 0 auto;
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1px solid var(--color-border);
}

/* ❌ INCORRETO */
.elemento {
  margin-top: 0;
  margin-right: auto;
  margin-bottom: 0;
  margin-left: auto;
  padding-top: var(--spacing-md);
  padding-right: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  padding-left: var(--spacing-lg);
}
```

### 4.5 Agrupamento de Propriedades

Ordem sugerida: layout → box model → visual → tipografia → outros.

```css
.botao {
  /* Layout */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  /* Box model */
  padding: var(--spacing-sm) var(--spacing-md);
  margin: 0;
  
  /* Visual */
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  
  /* Tipografia */
  font-size: var(--font-size-base);
  font-weight: 600;
  text-decoration: none;
  
  /* Outros */
  cursor: pointer;
  transition: background-color 0.2s ease;
}
```

### 4.6 Valores Fluidos com clamp()

Para tipografia e espaçamentos que escalam suavemente entre breakpoints.

```css
/* Font-size que escala de 16px a 20px conforme viewport */
.titulo {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
}

/* Padding fluido de 16px a 48px */
.card {
  padding: clamp(1rem, 3vw, 3rem);
}

/* Gap fluido */
.grid {
  gap: clamp(0.5rem, 2vw, 1.5rem);
}
```

### 4.7 Evitar !important

Usar specificity adequada. Reservar `!important` apenas para overrides de emergência.

```css
/* ✅ Preferir specificity */
.card .titulo {
  color: var(--color-primary);
}

/* ⚠️ Evitar - usar apenas em último caso */
.titulo-urgente {
  color: var(--color-danger) !important;
}
```

---

## 5. Safe Areas (iOS)

Dispositivos iOS com notch (iPhone X+) precisam de tratamento especial para não ter conteúdo coberto pela barra de status ou pelo Home Indicator.

### 5.1 Meta Viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

O `viewport-fit=cover` é **obrigatório** para que `env(safe-area-inset-*)` funcione.

### 5.2 CSS Safe Areas

```css
/* Aplicar em elementos que precisam evitar o notch */
.header {
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Footeravoid Home Indicator */
.footer {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Container principal com safe areas */
.pagina {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Usar constant() para Safari antigo (iOS 11.0-11.1) */
@supports (padding: env(safe-area-inset-top)) {
  .header {
    padding-top: env(safe-area-inset-top);
  }
}
```

### 5.3 constant() vs env()

```css
/* Safari iOS 11.0-11.1 */
padding-top: constant(safe-area-inset-top);

/* Safari iOS 11.2+ e Chrome */
padding-top: env(safe-area-inset-top);
```

Recomendação: usar ambos para máxima compatibilidade:

```css
.header {
  padding-top: env(safe-area-inset-top);
  padding-top: constant(safe-area-inset-top);
}
```

---

## 6. Viewport Config

### 6.1 Meta Viewport Padrão

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

| Valor | Descrição |
|-------|------------|
| `width=device-width` | Largura do viewport igual à largura do dispositivo |
| `initial-scale=1` | Zoom inicial 1:1 (sem zoom) |
| `viewport-fit=cover` | Permite conteúdo preencher toda a tela (necessário para safe areas) |

### 6.2 Theme Color

```html
<meta name="theme-color" content="#007bff" />
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#007bff" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0056b3" />
```

### 6.3 Apple Touch Icon

```html
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
<link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
```

---

## 7. PWA Features

### 7.1 Manifest.json

O manifest é obrigatório para que o PWA seja instalável.

```json
{
  "name": "Pedi-AI - Cardápio Digital",
  "short_name": "Pedi-AI",
  "description": "Cardápio digital para restaurantes - funciona offline",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#007bff",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["food", "business"],
  "lang": "pt-BR"
}
```

### 7.2 Service Worker

O Service Worker é a base do offline-first. Usar Workbox para facilitar.

```javascript
// sw.js (exemplo com Workbox)
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses with Stale-While-Revalidate
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/cardapio'),
  new StaleWhileRevalidate({
    cacheName: 'cardapio-cache',
  })
);

// Cache images with CacheFirst
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);
```

### 7.3 Offline Support

#### Estrutura de Cache

1. **App Shell**: HTML, CSS, JS crítico (cache-first)
2. **Dados do Cardápio**: IndexedDB (Dexie) com sync
3. **Imagens**: Cache com expiração
4. **Pedidos Offline**: Fila de sincronização

#### Página Offline (offline.html)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Sem conexão - Pedi-AI</title>
  <style>
    :root {
      --spacing-md: 1rem;
      --color-danger: #dc3545;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: var(--spacing-md);
      text-align: center;
    }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { color: var(--color-danger); margin-bottom: 0.5rem; }
    p { color: #666; margin-bottom: 1.5rem; }
    button {
      padding: 0.75rem 1.5rem;
      background: var(--color-primary, #007bff);
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="icon">📡</div>
  <h1>Você está offline</h1>
  <p>Verifique sua conexão de internet e tente novamente.</p>
  <button onclick="location.reload()">Tentar novamente</button>
</body>
</html>
```

### 7.4 App Shell

O App Shell é a estrutura mínima de UI que deve ser carregada instantaneamente.

```html
<!-- Estrutura App Shell -->
<body>
  <app-header>
    <header class="header">
      <nav aria-label="Navegação principal">...</nav>
    </header>
  </app-header>
  
  <app-main>
    <main id="main-content">
      <!-- Conteúdo dinâmico carregado aqui -->
    </main>
  </app-main>
  
  <app-footer>
    <footer class="footer">...</footer>
  </app-footer>
</body>
```

```css
/* App Shell CSS crítico */
.app-header,
.app-footer {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 100;
}

.app-header {
  top: 0;
  padding-top: env(safe-area-inset-top);
}

.app-footer {
  bottom: 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.app-main {
  /* Evitar que conteúdo fique sob header/footer fixos */
  padding-top: calc(60px + env(safe-area-inset-top));
  padding-bottom: calc(60px + env(safe-area-inset-bottom));
  min-height: 100vh;
}
```

---

## 8. Melhorias Recomendadas

### 8.1 Viewport Meta Atualizado

Verificar se todas as páginas têm `viewport-fit=cover`:

```html
<!-- Em _document.tsx ou layout principal -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### 8.2 Safe Area CSS Handling

Implementar mixin ou variáveis CSS globais para safe areas:

```css
/* global.css */
:root {
  --safe-area-top: env(safe-area-inset-top);
  --safe-area-bottom: env(safe-area-inset-bottom);
  --safe-area-left: env(safe-area-inset-left);
  --safe-area-right: env(safe-area-inset-right);
}

/* Aplicar automaticamente em elementos fixed */
body {
  padding-top: var(--safe-area-top);
  padding-bottom: var(--safe-area-bottom);
}
```

### 8.3 beforeinstallprompt Handler

Para customizar o UI de instalação do PWA:

```typescript
// hooks/usePWAInstall.ts
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return { isInstallable, install };
}
```

### 8.4 iOS PWA Detection

iOS Safari não dispara `beforeinstallprompt`. Detectar e mostrar instruções customizadas:

```typescript
// hooks/useIsPWA.ts
export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    setIsPWA(isStandalone || (isMobile && 'ontouchstart' in window));
  }, []);

  return { isPWA, isIOS };
}
```

### 8.5 Checkbox de Instalação (iOS)

```typescript
// components/InstallPrompt.tsx
'use client';

import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useIsPWA } from '@/hooks/useIsPWA';

export function InstallPrompt() {
  const { isInstallable, install } = usePWAInstall();
  const { isIOS } = useIsPWA();

  if (isIOS && !isInstallable) {
    return (
      <div className="install-prompt">
        <p>
          Para instalar o Pedi-AI no seu iPhone: toque em 
          <strong> Compartilhar</strong> → <strong>Adicionar à Tela Inicial</strong>
        </p>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button onClick={install} className="install-button">
        📱 Instalar App
      </button>
    );
  }

  return null;
}
```

---

## 9. HTML Semântico

### 9.1 Landmarks Obrigatórios

Usar elementos HTML5 semânticos para criar landmarks acessíveis:

```html
<body>
  <header>
    <nav aria-label="Navegação principal">
      <!-- Links de navegação -->
    </nav>
  </header>

  <main id="main-content">
    <!-- Conteúdo principal -->
  </main>

  <aside>
    <!-- Conteúdo relacionado (sidebar) -->
  </aside>

  <footer>
    <!-- Links de footer, copyright -->
  </footer>
</body>
```

### 9.2 Heading Hierarchy

- Apenas **UM** `<h1>` por página
- `<h2>` a `<h6>` em ordem lógica, sem pular níveis
- O título da página é `<h1>`, seções são `<h2>`, subseções `<h3>`, etc.

```html
<main>
  <h1>Cardápio do Restaurante</h1>
  
  <section aria-labelledby="entradas-title">
    <h2 id="entradas-title">Entradas</h2>
    <!-- Items -->
  </section>
  
  <section aria-labelledby="pratos-title">
    <h2 id="pratos-title">Pratos Principais</h2>
    <section aria-labelledby="carnes-title">
      <h3 id="carnes-title">Carnes</h3>
      <!-- Items -->
    </section>
  </section>
</main>
```

### 9.3 Listas

Usar `<ul>` e `<li>` para listas de itens relacionados:

```html
<ul class="cardapio-lista">
  <li>
    <article class="item-cardapio">
      <h3>Nome do Item</h3>
      <p>Descrição</p>
      <span class="preco">R$ 25,00</span>
    </article>
  </li>
</ul>
```

### 9.4 Botões vs Links

| Elemento | Uso |
|----------|-----|
| `<button>` | Ações (filtrar, toggle, submit, adicionar ao carrinho) |
| `<a href="...">` | Navegação (ir para outra página, âncoras) |

```html
<!-- ✅ Botão para ação -->
<button type="button" onClick={adicionarAoCarrinho}>
  Adicionar ao carrinho
</button>

<!-- ✅ Link para navegação -->
<a href="/cardapio/prato/123">Ver detalhes</a>
```

### 9.5 Acessibilidade de Elementos Interativos

```html
<!-- Botão com ícone decorativo -->
<button>
  <span aria-hidden="true">⚙️</span>
  <span>Configurações</span>
</button>

<!-- Link com aria-label quando texto não é autoexplicativo -->
<a href="/cardapio" aria-label="Ver cardápio completo">
  Cardápio
</a>

<!-- Input com label visível -->
<label for="busca">Buscar</label>
<input type="search" id="busca" placeholder="Buscar itens..." />

<!-- Input com aria-label quando não há label visível -->
<button aria-label="Fechar menu">
  ✕
</button>
```

### 9.6 Ênfase de Texto

| Tag | Uso |
|-----|-----|
| `<strong>` | Importância, urgência, texto em destaque |
| `<em>` | Ênfase/italico semântico |

```html
<p>
  O pedido <strong>precisa ser confirmado</strong> antes das 14h.
</p>
```

---

## 10. Checklist de Implementação

### Meta Tags
- [ ] `viewport` com `viewport-fit=cover`
- [ ] `theme-color` com valores light/dark
- [ ] `apple-touch-icon` para iOS

### CSS
- [ ] CSS Custom Properties para cores e espaçamentos
- [ ] Safe areas para iOS (env / constant)
- [ ] Breakpoints com `min-width` em `em`
- [ ] Touch targets de 44x44px mínimo
- [ ] Unidades `rem` para tipografia

### PWA
- [ ] `manifest.json` completo com ícones
- [ ] Service Worker registrado
- [ ] Estratégia de cache (app shell + dados)
- [ ] Página `offline.html`
- [ ] Handler `beforeinstallprompt`
- [ ] Instruções de instalação para iOS

### Acessibilidade
- [ ] Landmarks semânticos (header, nav, main, footer)
- [ ] Hierarquia de headings correta
- [ ] Listas com `ul`/`li`
- [ ] Botões vs links corretos
- [ ] Acessibilidade de elementos interativos

---

## Referências

- [Google Web Dev - Mobile First](https://web.dev/mobile-desktop/)
- [Apple Human Interface Guidelines - Touch Points](https://developer.apple.com/design/human-interface-guidelines/touch)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [MDN - Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [CSS Tricks - Clamp Calculator](https://css-tricks.com/clamp())
