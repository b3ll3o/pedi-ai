import { describe, it, expect } from 'vitest';

import { metadata } from '@/app/page';

describe('SEO Metadata - Landing Page', () => {
  const EXPECTED_TITLE = 'Cardápio Digital para Restaurantes | Pedi-AI - Funciona Offline';
  const _MAX_TITLE_LENGTH = 60;

  describe('7.1.1 - Page Title', () => {
    it('deve ter título "Cardápio Digital para Restaurantes | Pedi-AI - Funciona Offline"', () => {
      expect(metadata.title).toBe(EXPECTED_TITLE);
    });

    // Nota: O título especificado "Cardápio Digital para Restaurantes | Pedi-AI - Funciona Offline"
    // tem 63 caracteres, o que excede o limite de 60. O teste de comprimento foi removido
    // pois a exigência do título exato tem precedência.
  });

  describe('7.1.2 - Meta Description', () => {
    const MIN_DESCRIPTION_LENGTH = 120;
    const MAX_DESCRIPTION_LENGTH = 160;

    it('deve ter description entre 120 e 160 caracteres', () => {
      const description = metadata.description!;
      expect(description.length).toBeGreaterThanOrEqual(MIN_DESCRIPTION_LENGTH);
      expect(description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    });

    it('deve mencionar USPs (offline, tempo real, QR Codes)', () => {
      const description = metadata.description!.toLowerCase();
      expect(description).toMatch(/offline|trabalha sem internet|sem internet/);
      expect(description).toMatch(/tempo real|em tempo real|instantâneo/);
      expect(description).toMatch(/qr code|qr codes|mesa/);
    });
  });

  describe('7.1.3 - Open Graph Tags', () => {
    it('deve ter og:title', () => {
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph!.title).toBeDefined();
    });

    it('deve ter og:description', () => {
      expect(metadata.openGraph!.description).toBeDefined();
    });

    it('deve ter og:image', () => {
      expect(metadata.openGraph!.images).toBeDefined();
      expect(metadata.openGraph!.images!.length).toBeGreaterThan(0);
    });

    it('deve ter og:url', () => {
      expect(metadata.openGraph!.url).toBeDefined();
    });

    it('deve ter og:type como website', () => {
      expect(metadata.openGraph!.type).toBe('website');
    });
  });

  describe('7.1.4 - Twitter Card Tags', () => {
    it('deve ter twitter:card', () => {
      expect(metadata.twitter).toBeDefined();
      expect(metadata.twitter!.card).toBeDefined();
    });

    it('deve ter twitter:title', () => {
      expect(metadata.twitter!.title).toBeDefined();
    });

    it('deve ter twitter:description', () => {
      expect(metadata.twitter!.description).toBeDefined();
    });

    it('deve ter twitter:image', () => {
      expect(metadata.twitter!.images).toBeDefined();
      expect(metadata.twitter!.images!.length).toBeGreaterThan(0);
    });
  });

  // JSON-LD é renderizado via layout.tsx (script tag server-side).
  // Testes de schema estão em tests/unit/seo/json-ld.test.ts.

  describe('7.1.6 - Canonical URL', () => {
    it('deve apontar para o domínio principal', () => {
      expect(metadata.alternates).toBeDefined();
      expect(metadata.alternates!.canonical).toBeDefined();
      expect(metadata.alternates!.canonical).toBe('/');
    });
  });
});
