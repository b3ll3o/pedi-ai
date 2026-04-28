# Proposal: Melhorias Técnicas de Performance e Segurança

## Intent

Implementar melhorias técnicas identificadas durante research para resolver problemas de compatibilidade mobile (iOS notch), segurança de QR codes (replay attacks), performance de realtime subscriptions e experiência offline.

## Scope

### In Scope

1. **Mobile PWA - viewport-fit e safe-area** (HIGH PRIORITY)
   - Adicionar `viewport-fit=cover` na meta tag viewport
   - Adicionar CSS com `env(safe-area-inset-*)` para iOS
   - Criar handling para `beforeinstallprompt` event

2. **QR Security - Nonce** (HIGH PRIORITY)
   - Adicionar nonce aleatório na geração do QR code usando `crypto.randomUUID()`
   - Incluir nonce na validação para prevenir replay attacks
   - Reduzir expiry de 24h para 4h

3. **Realtime - Event Filtering** (MEDIUM PRIORITY)
   - Mudar de `event: '*'` para `event: 'INSERT'` e `event: 'UPDATE'` específicos
   - Filtrar apenas os eventos necessários para performance

4. **Offline - offline.html Cacheado** (MEDIUM PRIORITY)
   - Criar página offline.html própria em `public/`
   - Cachear via Service Worker para uso offline
   - Substituir resposta HTML inline por page fetch

### Out of Scope

- Alterar estrutura DDD ou arquitetura geral
- Criar novas funcionalidades de negócio
- Modificar APIs ou integrações externas
- Alterar fluxo de autenticação ou sessões

## Approach

### Fase 1: Mobile PWA (viewport-fit e safe-area)

1. **Atualizar `_document.tsx`** para adicionar `viewport-fit=cover`:
   ```tsx
   <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
   ```

2. **Criar CSS custom properties** para safe-area em `src/styles/globals.css`:
   ```css
   :root {
     --safe-area-top: env(safe-area-inset-top);
     --safe-area-right: env(safe-area-inset-right);
     --safe-area-bottom: env(safe-area-inset-bottom);
     --safe-area-left: env(safe-area-inset-left);
   }
   ```

3. **Aplicar padding seguro** em componentes de layout principais:
   - Header, Footer, Navigation: `padding-top: var(--safe-area-top)`
   - Content areas: usar calculated insets

4. **Implementar handling de `beforeinstallprompt`**:
   - Criar hook `usePWAInstall()` em `src/hooks/`
   - Guardar evento e mostrar UI quando apropriado
   - Tracking de install events

### Fase 2: QR Security - Nonce

1. **Modificar geração de QR** em `src/lib/qr.ts`:
   ```typescript
   interface QRPayload {
     mesaId: string;
     timestamp: number;
     nonce: string; // crypto.randomUUID()
     expiry: number; // 4 horas
   }
   ```

2. **Atualizar validação de QR** em `src/lib/qr-validator.ts`:
   - Verificar presença e formato do nonce
   - Validar expiração (4h máximo)
   - Rejeitar QR codes sem nonce válido

3. **Criação de migration** para QR codes existentes:
   - QR codes antigos sem nonce: expirar em 24h (grace period)
   - QR codes novos: usar nonce com 4h expiry

### Fase 3: Realtime - Event Filtering

1. **Identificar subscriptions** em `src/lib/supabase.ts`:
   - Mapear quais tabelas usam `event: '*'`
   - Categorizar por INSERT, UPDATE, DELETE

2. **Refatorar subscriptions**:
   ```typescript
   // Antes (ineficiente)
   supabase.channel('dbchanges').on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, handleChange)

   // Depois (eficiente)
   supabase.channel('dbchanges').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, handleInsert)
   supabase.channel('dbchanges').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, handleUpdate)
   ```

3. **Testar cada subscription** após refatoração

### Fase 4: Offline - offline.html Cacheado

1. **Criar `public/offline.html`**:
   - Design consistente com a aplicação
   - Mensagens em pt-BR
   - Informações de contato ou QR code para suporte

2. **Atualizar Service Worker** em `src/lib/sw.ts`:
   ```typescript
   // Cache offline.html
   workbox.routing.registerRoute(
     '/offline.html',
     new workbox.strategies.CacheFirst({
       cacheName: 'offline-page',
     })
   );
   ```

3. **Modificar handling de offline**:
   - Antes: resposta HTML inline
   - Depois: fetch de `/offline.html` do cache

4. **Testar offline**:
   - Ativar airplane mode
   - Navegar para páginas não cacheadas
   - Verificar renderização do offline.html

## Affected Areas

- `src/app/` — pages que precisam de safe-area
- `src/styles/globals.css` — CSS custom properties
- `src/lib/qr.ts` — geração de QR
- `src/lib/qr-validator.ts` — validação de QR
- `src/lib/supabase.ts` — subscriptions realtime
- `src/lib/sw.ts` — Service Worker
- `src/hooks/usePWAInstall.ts` — novo hook
- `public/offline.html` — nova página

## Risks

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| QR codes existentes param de funcionar | Alto | Manter backward compat; nonce opcional por 24h |
| Realtime events quebram após refatoração | Alto | Testar cada subscription; rollback se necessário |
| Safe-area causa visual bugs em Android antigo | Médio | Testar em múltiplos dispositivos; fallback para padding 0 |
| offline.html não cacheia corretamente | Baixo | Fallback para HTML inline se cache falhar |

## Rollback Plan

1. Cada melhoria é independente - rollback por feature
2. QR nonce: desabilitar validação de nonce temporariamente
3. Realtime: reverter para `event: '*'` se necessário
4. Mobile: remover `viewport-fit=cover` se causar problemas
5. Offline: manter HTML inline como fallback

## Success Criteria

- [ ] Meta viewport inclui `viewport-fit=cover`
- [ ] Componentes principais usam safe-area-inset
- [ ] Hook usePWAInstall captura beforeinstallprompt
- [ ] QR codes incluem nonce com `crypto.randomUUID()`
- [ ] QR codes expiram em 4h (não 24h)
- [ ] Realtime subscriptions usam eventos específicos (INSERT/UPDATE/DELETE)
- [ ] Página offline.html existe em `public/`
- [ ] Service Worker cacheia offline.html
- [ ] Backward compatibility mantida para QR codes antigos
- [ ] Testes E2E passam após mudanças

## Technical Notes

### Nonce Generation
```typescript
// Em src/lib/qr.ts
import { randomUUID } from 'crypto';

function generateQRPayload(mesaId: string) {
  return {
    mesaId,
    timestamp: Date.now(),
    nonce: randomUUID(),
    expiry: Date.now() + (4 * 60 * 60 * 1000), // 4 horas
  };
}
```

### Safe Area CSS
```css
/* Em src/styles/globals.css */
.header {
  padding-top: max(var(--safe-area-top), 1rem);
  padding-left: max(var(--safe-area-left), 1rem);
  padding-right: max(var(--safe-area-right), 1rem);
}

.content {
  padding-bottom: calc(var(--safe-area-bottom) + 1rem);
}
```

### Realtime Event Map
| Tabela | Eventos Necessários |
|--------|---------------------|
| `pedidos` | INSERT, UPDATE |
| `itens_pedido` | INSERT, UPDATE, DELETE |
| `mesas` | UPDATE |
| `cardapio` | INSERT, UPDATE, DELETE |
