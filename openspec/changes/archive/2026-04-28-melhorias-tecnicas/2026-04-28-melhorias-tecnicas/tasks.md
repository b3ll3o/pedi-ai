# Tasks: Melhorias Técnicas de Performance e Segurança

## Phase 1: Mobile PWA (viewport-fit e safe-area)

- [ ] 1.1 Modificar `src/app/_document.tsx` — adicionar `viewport-fit=cover` na meta tag viewport
- [ ] 1.2 Adicionar CSS custom properties em `src/styles/globals.css`:
  ```css
  :root {
    --safe-area-top: env(safe-area-inset-top);
    --safe-area-right: env(safe-area-inset-right);
    --safe-area-bottom: env(safe-area-inset-bottom);
    --safe-area-left: env(safe-area-inset-left);
  }
  ```
- [ ] 1.3 Criar hook `src/hooks/usePWAInstall.ts` para capturar beforeinstallprompt
- [ ] 1.4 Aplicar padding seguro em componentes principais (header, footer, navigation)

## Phase 2: QR Security (Nonce)

- [ ] 2.1 Modificar `src/lib/qr.ts` — adicionar nonce com `crypto.randomUUID()` ao payload
- [ ] 2.2 Modificar `src/lib/qr.ts` — alterar expiry de 24h para 4h
- [ ] 2.3 Modificar `src/lib/qr-validator.ts` — adicionar validação de nonce
- [ ] 2.4 Modificar `src/lib/qr-validator.ts` — adicionar validação de expiry (4h)
- [ ] 2.5 Implementar backward compatibility: QR codes sem nonce aceitos por 24h de grace period
- [ ] 2.6 Adicionar testes unitários para nonce e expiry

## Phase 3: Realtime (Event Filtering)

- [ ] 3.1 Identificar subscriptions em `src/lib/supabase.ts` que usam `event: '*'`
- [ ] 3.2 Atualizar subscription de `pedidos` — usar `INSERT` e `UPDATE` específicos
- [ ] 3.3 Atualizar subscription de `itens_pedido` — usar `INSERT`, `UPDATE`, `DELETE`
- [ ] 3.4 Atualizar subscription de `mesas` — usar `UPDATE` apenas
- [ ] 3.5 Atualizar subscription de `cardapio` — usar `INSERT`, `UPDATE`, `DELETE`
- [ ] 3.6 Testar cada subscription após refatoração

## Phase 4: Offline (offline.html Cacheado)

- [ ] 4.1 Criar `public/offline.html` com design consistente e conteúdo em pt-BR
- [ ] 4.2 Modificar `src/lib/sw.ts` — adicionar cache de offline.html com CacheFirst
- [ ] 4.3 Testar offline: ativar airplane mode, navegar para página não cacheada
- [ ] 4.4 Verificar que offline.html é renderizado corretamente

## Phase 5: Verificação

- [ ] 5.1 Executar `npm run build` — build completa sem erros
- [ ] 5.2 Executar `npm run lint` — verificar warnings
- [ ] 5.3 Executar `npm run test` — todos os testes passam
- [ ] 5.4 Testar visualmente em iOS simulator com notch
- [ ] 5.5 Testar QR code com token expirado — deve mostrar erro
- [ ] 5.6 Testar realtime — pedidos devem chegar em tempo real
- [ ] 5.7 Testar offline — offline.html deve aparecer quando offline
- [ ] 5.8 Testar PWA install prompt em Chrome Android
