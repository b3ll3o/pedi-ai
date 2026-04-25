# Proposal: Definir Paleta de Cores Oficial do Pedi-AI

## Intent

O projeto Pedi-AI não possui uma paleta de cores consistente. O `globals.css` atual define apenas `--background: #ffffff` e `--foreground: #171717` (light) e `#0a0a0a/#ededed` (dark), sem other design tokens. Cores hardcoded espalhadas pelo codebase (`#667eea`, `#764ba2`, `#2563eb`) não seguem padrão, dificultam manutenção e criam inconsistência visual.

O objetivo desta mudança é estabelecer uma paleta de cores oficial, inspirada em cores quentes (estímulo ao apetite) e tons naturais (freshness), documentada como CSS Custom Properties em `globals.css`, e aplicada consistentemente em todos os componentes.

## Scope

### In Scope

- Definir CSS Custom Properties para todas as cores do projeto em `src/app/globals.css`
- Identificar e listar todos os arquivos CSS do projeto afetados pela mudança
- Substituir cores hardcoded nos componentes por variáveis CSS
- Documentar rationale de cada cor (psicológico, semântico)
- Garantir suporte a dark mode via CSS Custom Properties
- Definir gradiente oficial para elementos de destaque

### Out of Scope

- Alterar estrutura HTML ou lógica de componentes
- Modificar funcionalidades existentes (apenas视觉 updates)
- Criar novos componentes
- Alterar imagens, ícones ou tipografia
- Atualizar testes E2E (será feito em fase de apply se necessário)

## Approach

### Fase 1: Definição da Paleta

Manter a paleta proposta pelo contexto:

| Categoria | Token | Valor | Rationale |
|-----------|-------|-------|-----------|
| Primary | `--color-primary` | `#E85D04` | Laranja - estímulo ao apetite |
| Primary Light | `--color-primary-light` | `#F48C06` | Variação clara |
| Primary Dark | `--color-primary-dark` | `#D64804` | Variação escura |
| Accent | `--color-accent` | `#DC2626` | Vermelho - urgência/ação |
| Secondary | `--color-secondary` | `#588157` | Verde - freshness |
| Success | `--color-success` | `#16A34A` | Verde - confirmação |
| Background | `--color-background` | `#FFFBF5` | Creme quente |
| Surface | `--color-surface` | `#FFFFFF` | Branco |
| Surface Elevated | `--color-surface-elevated` | `#FFF8F0` | Superfície elevada |
| Text Primary | `--color-text-primary` | `#1C1917` | Quase preto quente |
| Text Secondary | `--color-text-secondary` | `#57534E` | Cinza quente |
| Error | `--color-error` | `#DC2626` | Vermelho |
| Warning | `--color-warning` | `#F59E0B` | Amarelo âmbar |
| Info | `--color-info` | `#0284C7` | Azul |
| Border | `--color-border` | `#E7E5E4` | Cinza suave |
| Focus Ring | `--color-focus-ring` | `rgba(232, 93, 4, 0.4)` | Laranja semi-transparente |
| Gradient | `--gradient-primary` | `linear-gradient(135deg, #E85D04 0%, #F48C06 100%)` | Destaque |

### Fase 2: Migração de Arquivos CSS

Arquivos CSS identificados (aproximadamente 50+ arquivos):

**App-level:**
- `src/app/globals.css` (raiz)
- `src/app/page.module.css`
- `src/app/table/[code]/page.module.css`
- `src/app/register/page.module.css`
- `src/app/login/page.module.css`
- `src/app/kitchen/page.module.css`
- `src/app/admin/**/*.module.css` (12 arquivos)

**Component-level:**
- `src/components/**/*.module.css` (30+ arquivos)
- `src/app/(customer)**/*/page.module.css` (6 arquivos)

### Fase 3: Substituição de Hardcoded Colors

Padrão de substituição:
1. Cores RGB hex → variáveis CSS (`#667eea` → `var(--color-primary)`)
2. Cores de status → variáveis semânticas (`#DC2626` para erro → `var(--color-error)`)
3. Backgrounds → variáveis de surface
4. Borders → `var(--color-border)`
5. Textos → `var(--color-text-primary)` ou `var(--color-text-secondary)`

### Estratégia de Migração Incremental

1. Atualizar `globals.css` com nova paleta
2. Criar mapa de cores hardcoded → tokens (regex-based)
3. Aplicar substituição por arquivo
4. Validar visualmente cada área (menu, checkout, admin)
5. Build sem erros

## Affected Areas

### Arquivos que precisam de update:

```
src/app/globals.css
src/app/page.module.css
src/app/(customer)/*/page.module.css
src/app/admin/*/page.module.css
src/components/**/*.module.css
```

### Componentes críticos (verificação visual obrigatória):
- Landing page (primeira impressão)
- Cardápio/Menu (的核心 experiência)
- Carrinho e Checkout (conversão)
- Admin Dashboard (gestão)

### Áreas de risco:
- Qualquer componente que use cores para comunicar estado (sucesso, erro, warning)
- Elementos com contraste baixo podem violar acessibilidade
- Botões de CTA podem perder visibilidadese a cor não tiver contraste adequado

## Risks

### Risk 1: Cores hardcoded não identificadas
- **Probabilidade**: Alta (muitos arquivos)
- **Impacto**: Inconsistência visual persistente
- **Mitigação**: Usar grep para buscar padrões hex antes de aplicar; criar script de validação

### Risk 2: Contraste insuficiente para acessibilidade
- **Probabilidade**: Média
- **Impacto**: WCAG violations,用户体验 ruim
- **Mitigação**: Verificar contraste com工具 (Wave, Lighthouse) após implementação

### Risk 3: Breaking changes em dark mode
- **Probabilidade**: Média
- **Impacto**: Elementos invisíveis ou ilegíveis no modo escuro
- **Mitigação**: Testar em ambos os esquemas de cores antes de merge

### Risk 4: Regressão visual em produção
- **Probabilidade**: Baixa (se feito corretamente)
- **Impacto**: Experiência visual inconsistente para usuários
- **Mitigação**: Screenshots antes/depois; branch de feature; code review

## Rollback Plan

Se a mudança causar problemas críticos:

1. **Git revert** do commit de implementação
2. **Restaurar** `globals.css` original
3. **Reverter** todos os arquivos CSS para versão anterior
4. **Verificar** se aplicação funciona normally

Comando de rollback:
```bash
git revert HEAD --no-commit
git commit -m "chore: rollback paleta-de-cores-oficial"
```

## Success Criteria

- [ ] `src/app/globals.css` contém todas as CSS Custom Properties definidas
- [ ] Zero cores hardcoded (hex codes) em arquivos `.module.css` do projeto
- [ ] Todos os componentes usam variáveis CSS (`var(--color-*)`) em vez de cores fixas
- [ ] Dark mode funciona corretamente com as novas variáveis
- [ ] Contraste WCAG AA (4.5:1) para texto normal em ambas as themes
- [ ] Build completa sem erros de TypeScript
- [ ] Landing page, Menu, Checkout e Admin verificados visualmente
- [ ] Gradiente `--gradient-primary` aplicado em CTAs principais
