# Spec: correcao-seo

## Objetivo

Corrigir violações das regras SEO definidas no AGENTS.md, garantindo que todas as páginas tenham metadata completa, sitemap.xml exista, e structured data esteja correto.

## Escopo

- Criar `public/sitemap.xml` com URLs do site
- Corrigir title em `src/app/layout.tsx` (63 → ≤60 caracteres)
- Adicionar Restaurant JSON-LD schema em `src/app/layout.tsx`
- Adicionar metadata exports nas 7 páginas sem metadata própria
- Adicionar aria-label nos links da landing page

## Requisitos Funcionais

### RF-1: Sitemap XML

**Dado** que o projeto tem múltiplas rotas públicas
**Quando** motores de busca indexam o site
**Então** o arquivo `public/sitemap.xml` deve listar todas as URLs públicas do site

### RF-2: Title Otimizado

**Dado** que o título padrão do layout tem 63 caracteres
**Quando** a página é indexada por motores de busca
**Então** o título deve ter no máximo 60 caracteres para não ser truncado

### RF-3: Restaurant JSON-LD Schema

**Dado** que o projeto é um cardápio digital para restaurantes
**Quando** Google valida structured data
**Então** deve existir schema Restaurant com dados do estabelecimento

### RF-4: Metadata por Página

**Dado** que cada página tem conteúdo específico
**Quando** a página é compartilhada em redes sociais
**Então** deve ter metadata própria (title, description, canonical, og:*)

### RF-5: Acessibilidade de Links

**Dado** que a landing page tem links na hero section
**Quando** usuários com leitores de tela navegam
**Então** links não-texto devem ter aria-label descritivo

## Criteria de Aceitação

- [ ] `public/sitemap.xml` existe e é válido com todas as URLs públicas
- [ ] Title em layout.tsx ≤ 60 caracteres
- [ ] Restaurant JSON-LD presente no layout com @type FoodEstablishment
- [ ] 7 páginas com metadata exports completos (title, description, canonical, og:*)
- [ ] Links da landing com aria-label quando necessário
- [ ] Build completa sem erros de TypeScript