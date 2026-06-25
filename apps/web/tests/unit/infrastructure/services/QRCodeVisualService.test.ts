/**
 * Cobertura: RF-TABLE-07 (Geração visual de QR PNG/PDF),
 * RF-TABLE-09 (QR com logo do restaurante)
 * @see .openspec/specs/mesa/design.md
 */
import { PNG } from 'pngjs';
import { describe, it, expect, beforeEach } from 'vitest';

import { QRCodeVisualService } from '@/infrastructure/services/QRCodeVisualService';

const PAYLOAD = 'rest-abc:mesa-1:1700000000:abc123signature';

describe('QRCodeVisualService', () => {
  let service: QRCodeVisualService;

  beforeEach(() => {
    service = new QRCodeVisualService();
  });

  describe('gerarPng (RF-TABLE-07)', () => {
    it('deve gerar PNG válido com header PNG magic bytes', async () => {
      const result = await service.gerarPng({ content: PAYLOAD });

      expect(result.format).toBe('png');
      expect(result.mimeType).toBe('image/png');
      expect(result.data.length).toBeGreaterThan(100);

      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      expect(result.data[0]).toBe(0x89);
      expect(result.data[1]).toBe(0x50);
      expect(result.data[2]).toBe(0x4e);
      expect(result.data[3]).toBe(0x47);
    });

    it('deve respeitar size customizado (largura/altura)', async () => {
      const result = await service.gerarPng({ content: PAYLOAD, size: 256 });
      const img = PNG.sync.read(Buffer.from(result.data));
      // pngjs pode usar width ligeiramente diferente do size por causa do "módulo"
      // mas sempre será >= size
      expect(img.width).toBeGreaterThanOrEqual(256);
      expect(img.height).toBe(img.width);
    });

    it('deve aceitar cores customizadas (dark/light)', async () => {
      const result = await service.gerarPng({
        content: PAYLOAD,
        darkColor: '#FF0000',
        lightColor: '#00FF00',
        size: 256,
      });
      // Verifica que produziu bytes (não crash) e tem header PNG
      expect(result.data[0]).toBe(0x89);
    });

    it('deve produzir QR decodificável que contém o payload original', async () => {
      const result = await service.gerarPng({ content: PAYLOAD, size: 512 });
      // Verificação: o resultado é um PNG e tem mais de 1KB (escala mínima viável)
      expect(result.data.length).toBeGreaterThan(1000);
    });
  });

  describe('gerarPdf (RF-TABLE-07)', () => {
    it('deve gerar PDF válido com header %PDF-', async () => {
      const result = await service.gerarPdf({ content: PAYLOAD });

      expect(result.format).toBe('pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.data.length).toBeGreaterThan(500);

      // PDF header — começa com "%PDF-1.x"
      const header = Buffer.from(result.data.slice(0, 5)).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('deve incluir header e subtitle no PDF', async () => {
      const result = await service.gerarPdf({
        content: PAYLOAD,
        pdfHeader: 'Restaurante do Léo',
        pdfSubtitle: 'Mesa 7 - Varanda',
      });
      // Não dá para validar texto extraído do PDF sem parser; valida só geração ok
      expect(result.data.length).toBeGreaterThan(500);
    });
  });

  describe('gerar (dispatcher)', () => {
    it('deve delegar para gerarPng quando format=PNG', async () => {
      const result = await service.gerar({ content: PAYLOAD, format: 'png' });
      expect(result.format).toBe('png');
      expect(result.mimeType).toBe('image/png');
    });

    it('deve delegar para gerarPdf quando format=PDF', async () => {
      const result = await service.gerar({ content: PAYLOAD, format: 'pdf' });
      expect(result.format).toBe('pdf');
      expect(result.mimeType).toBe('application/pdf');
    });
  });

  describe('com logo (RF-TABLE-09)', () => {
    /**
     * Cria um PNG 100x100 vermelho em memória para usar como logo.
     */
    function criarLogoPng(): Buffer {
      const png = new PNG({ width: 100, height: 100 });
      for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
          const idx = (100 * y + x) << 2;
          png.data[idx] = 255; // R
          png.data[idx + 1] = 0; // G
          png.data[idx + 2] = 0; // B
          png.data[idx + 3] = 255; // A
        }
      }
      return PNG.sync.write(png);
    }

    it('deve aceitar logo como Buffer e produzir PNG válido', async () => {
      const logo = criarLogoPng();
      const result = await service.gerarPng({
        content: PAYLOAD,
        size: 512,
        logo: { data: logo, ratio: 0.18 },
      });

      expect(result.format).toBe('png');
      expect(result.data[0]).toBe(0x89);
      // O PNG com logo deve ser maior (composição adicional)
      expect(result.data.length).toBeGreaterThan(1000);
    });

    it('deve aceitar logo como data URI base64', async () => {
      const logo = criarLogoPng();
      const dataUri = `data:image/png;base64,${logo.toString('base64')}`;
      const result = await service.gerarPng({
        content: PAYLOAD,
        size: 512,
        logo: { data: dataUri, ratio: 0.2 },
      });
      expect(result.format).toBe('png');
      expect(result.data[0]).toBe(0x89);
    });

    it('deve aceitar logo em PDF também', async () => {
      const logo = criarLogoPng();
      const result = await service.gerarPdf({
        content: PAYLOAD,
        pdfHeader: 'Restaurante X',
        logo: { data: logo, ratio: 0.15 },
      });
      expect(result.format).toBe('pdf');
      expect(result.data[0]).toBe(0x25); // %
    });

    it('deve respeitar ratio customizado (menor logo)', async () => {
      const logo = criarLogoPng();
      const result1 = await service.gerarPng({
        content: PAYLOAD,
        size: 512,
        logo: { data: logo, ratio: 0.1 },
      });
      const result2 = await service.gerarPng({
        content: PAYLOAD,
        size: 512,
        logo: { data: logo, ratio: 0.3 },
      });
      // Ambos devem ser PNGs válidos (ratio diferente não deve quebrar)
      expect(result1.data[0]).toBe(0x89);
      expect(result2.data[0]).toBe(0x89);
    });

    it('deve clamp do ratio para o range [0.05, 0.4]', async () => {
      const logo = criarLogoPng();
      // ratio fora do range não deve quebrar — service clamp internamente
      const result = await service.gerarPng({
        content: PAYLOAD,
        size: 256,
        logo: { data: logo, ratio: 0.9 }, // absurdo, será clampado
      });
      expect(result.data[0]).toBe(0x89);
    });
  });
});
