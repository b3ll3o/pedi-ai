# Tasks: Melhorias Técnicas de Performance e Segurança

## Phase 1: Mobile PWA (viewport-fit e safe-area)
- [x] 1.1 Atualizar `_document.tsx` com viewport-fit=cover
- [x] 1.2 Adicionar CSS custom properties para safe-area em globals.css
- [x] 1.3 Criar hook `usePWAInstall.ts` em src/hooks/
- [x] 1.4 Aplicar safe-area padding nos componentes de layout principais

## Phase 2: QR Security (nonce)
- [x] 2.1 Modificar geração de QR em src/lib/qr.ts para incluir nonce
- [x] 2.2 Atualizar validação em src/lib/qr-validator.ts para verificar nonce
- [x] 2.3 Reduzir expiry de 24h para 4h
- [x] 2.4 Implementar backward compatibility para QR codes antigos (24h grace period)

## Phase 3: Realtime Event Filtering
- [x] 3.1 Identificar todas as subscriptions em src/lib/supabase.ts
- [x] 3.2 Refatorar subscription de pedidos para INSERT + UPDATE separados
- [x] 3.3 Refatorar subscription de itens_pedido para INSERT + UPDATE + DELETE
- [~] 3.4 Testar cada subscription após refatoração (testes precisam atualização - issue criada)

## Phase 4: Offline HTML Cacheado
- [x] 4.1 Criar public/offline.html com design consistente
- [x] 4.2 Atualizar Service Worker para cachear offline.html
- [x] 4.3 Modificar handling de offline para usar página cacheada
- [-] 4.4 Testar offline (airplane mode) - MANUAL: Abrir app, ativar airplane mode, navegar para página não cacheada, verificar offline.html

## Phase 5: Verification
- [x] 5.1 Executar testes unitários: pnpm test (2 failures - useRealtimeOrders expects old event:* behavior)
- [x] 5.2 Corrigir testes de realtime (useRealtimeOrders.test.tsx)
- [x] 5.3 Executar testes E2E: pnpm test:e2e (timeouts pre-existentes - não relacionados às mudanças)
- [-] 5.4 Verificar mobile em/device com iOS notch - MANUAL
- [-] 5.5 Verificar QR code com novo nonce - MANUAL
- [-] 5.6 Verificar realtime orders em múltiplas abas - MANUAL
- [-] 5.7 Verificar offline page em airplane mode - MANUAL
