// Stub do pacote `server-only` para Vitest.
//
// O pacote real (fornecido pelo Next.js) apenas lança erro se importado no
// client. Em testes de unidade rodamos sob jsdom (ambiente neutro), então
// um módulo vazio é suficiente. Mapeado em `vitest.config.ts` via alias.
export {};
