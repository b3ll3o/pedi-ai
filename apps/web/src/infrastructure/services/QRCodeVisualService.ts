import PDFDocument from 'pdfkit';
import { PNG } from 'pngjs';
import QRCode from 'qrcode';

import {
  IQRCodeVisualService,
  QRCodeVisualBuffer,
  QRCodeVisualOptions,
} from '@/domain/mesa/services/IQRCodeVisualService';

/**
 * Implementação de `IQRCodeVisualService` baseada em:
 *  - `qrcode` para geração de PNG/PDF do QR Code.
 *  - `pngjs` para composição do logo (RF-TABLE-09).
 *  - `pdfkit` para geração de PDF A4 imprimível.
 *
 * Suporta:
 *  - RF-TABLE-07: geração visual de QR em PNG e PDF.
 *  - RF-TABLE-09: sobreposição de logo do restaurante no centro do QR.
 *
 * @spec(RF-TABLE-07, RF-TABLE-09)
 * @see .openspec/specs/mesa/design.md
 */
export class QRCodeVisualService implements IQRCodeVisualService {
  /**
   * @inheritdoc
   */
  async gerar(options: QRCodeVisualOptions): Promise<QRCodeVisualBuffer> {
    if (options.format === 'png') {
      return this.gerarPng(options);
    }
    return this.gerarPdf(options);
  }

  /**
   * @inheritdoc
   */
  async gerarPng(options: Omit<QRCodeVisualOptions, 'format'>): Promise<QRCodeVisualBuffer> {
    const size = options.size ?? 512;
    const margin = options.margin ?? 2;

    const pngBuffer = await QRCode.toBuffer(options.content, {
      errorCorrectionLevel: 'H', // High — necessário pois logo ocupa ~18% do QR
      type: 'png',
      width: size,
      margin,
      color: {
        dark: options.darkColor ?? '#000000',
        light: options.lightColor ?? '#FFFFFF',
      },
    });

    let finalBytes: Uint8Array = pngBuffer;

    if (options.logo) {
      const composite = this.comporLogoSobrePng(pngBuffer, options.logo.data, {
        ratio: options.logo.ratio ?? 0.18,
      });
      finalBytes = composite;
    }

    return {
      data: finalBytes,
      mimeType: 'image/png',
      format: 'png',
    };
  }

  /**
   * @inheritdoc
   */
  async gerarPdf(options: Omit<QRCodeVisualOptions, 'format'>): Promise<QRCodeVisualBuffer> {
    const pngBuffer = await this.gerarPng({
      ...options,
      // PDF sempre recebe um PNG com/sem logo já composto
    });

    return new Promise<QRCodeVisualBuffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'portrait',
          margin: 48,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBytes = Buffer.concat(chunks);
          resolve({
            data: new Uint8Array(pdfBytes),
            mimeType: 'application/pdf',
            format: 'pdf',
          });
        });
        doc.on('error', (err) => reject(err));

        // Cabeçalho
        if (options.pdfHeader) {
          doc.fontSize(20).fillColor('#111').text(options.pdfHeader, { align: 'center' });
        }
        if (options.pdfSubtitle) {
          doc.moveDown(0.3);
          doc.fontSize(14).fillColor('#444').text(options.pdfSubtitle, { align: 'center' });
        }
        doc.moveDown(1.5);

        // QR centralizado
        const qrSize = 320;
        const pageWidth = doc.page.width;
        const xOffset = (pageWidth - qrSize) / 2;
        doc.image(Buffer.from(pngBuffer.data), xOffset, doc.y, { width: qrSize, height: qrSize });

        // Rodapé instrutivo
        doc.moveDown(2);
        doc
          .fontSize(11)
          .fillColor('#555')
          .text(
            'Escaneie este QR Code com a câmera do seu celular para acessar o cardápio digital.',
            { align: 'center' }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Sobrepõe o logo no centro do PNG do QR (RF-TABLE-09).
   *
   * Estratégia:
   *  1. Decodifica o PNG do QR e o logo.
   *  2. Redimensiona o logo para `ratio` da área total.
   *  3. Compõe pixel-a-pixel com alpha blending simples.
   *  4. Adiciona uma borda branca ao redor do logo para isolar dos
   *     módulos do QR.
   */
  private comporLogoSobrePng(
    qrPng: Uint8Array,
    logo: Buffer | string,
    opts: { ratio: number }
  ): Uint8Array {
    const ratio = Math.max(0.05, Math.min(0.4, opts.ratio));

    const qrImg = PNG.sync.read(qrPng);
    const logoBytes = this.normalizarLogoInput(logo);
    const logoImg = PNG.sync.read(logoBytes);

    const logoWidth = Math.max(1, Math.floor(qrImg.width * ratio));
    const logoHeight = Math.max(1, Math.floor((logoImg.height / logoImg.width) * logoWidth));

    const resized = this.resizeNearestNeighbor(logoImg, logoWidth, logoHeight);
    const padding = Math.max(2, Math.floor(logoWidth * 0.06));
    const bgWidth = logoWidth + padding * 2;
    const bgHeight = logoHeight + padding * 2;

    // Posição central
    const startX = Math.floor((qrImg.width - bgWidth) / 2);
    const startY = Math.floor((qrImg.height - bgHeight) / 2);

    // 1. Pintar fundo branco arredondado (sem cantos arredondados para simplicidade)
    for (let y = startY; y < startY + bgHeight; y++) {
      for (let x = startX; x < startX + bgWidth; x++) {
        if (x < 0 || y < 0 || x >= qrImg.width || y >= qrImg.height) continue;
        const idx = (qrImg.width * y + x) << 2;
        qrImg.data[idx] = 255;
        qrImg.data[idx + 1] = 255;
        qrImg.data[idx + 2] = 255;
        qrImg.data[idx + 3] = 255;
      }
    }

    // 2. Sobrepor logo com alpha blending
    const logoStartX = startX + padding;
    const logoStartY = startY + padding;
    for (let y = 0; y < resized.height; y++) {
      for (let x = 0; x < resized.width; x++) {
        const dx = logoStartX + x;
        const dy = logoStartY + y;
        if (dx < 0 || dy < 0 || dx >= qrImg.width || dy >= qrImg.height) continue;
        const srcIdx = (resized.width * y + x) << 2;
        const dstIdx = (qrImg.width * dy + dx) << 2;
        const srcA = resized.data[srcIdx + 3] / 255;
        const invA = 1 - srcA;
        qrImg.data[dstIdx] = Math.round(resized.data[srcIdx] * srcA + qrImg.data[dstIdx] * invA);
        qrImg.data[dstIdx + 1] = Math.round(
          resized.data[srcIdx + 1] * srcA + qrImg.data[dstIdx + 1] * invA
        );
        qrImg.data[dstIdx + 2] = Math.round(
          resized.data[srcIdx + 2] * srcA + qrImg.data[dstIdx + 2] * invA
        );
        qrImg.data[dstIdx + 3] = 255;
      }
    }

    return PNG.sync.write(qrImg);
  }

  /**
   * Normaliza a entrada do logo para um Buffer PNG.
   * Aceita Buffer (já decodificado) ou string data URI/base64.
   */
  private normalizarLogoInput(logo: Buffer | string): Buffer {
    if (Buffer.isBuffer(logo)) return logo;
    // aceita "data:image/png;base64,XXX" ou base64 puro
    const match = logo.match(/^data:[^;]+;base64,(.+)$/);
    const b64 = match ? match[1] : logo;
    return Buffer.from(b64, 'base64');
  }

  /**
   * Redimensionamento nearest neighbor (rápido, sem libs).
   * Suficiente para logos pequenos sobre QR.
   */
  private resizeNearestNeighbor(src: PNG, newW: number, newH: number): PNG {
    const dst = new PNG({ width: newW, height: newH });
    const xRatio = src.width / newW;
    const yRatio = src.height / newH;
    for (let y = 0; y < newH; y++) {
      for (let x = 0; x < newW; x++) {
        const sx = Math.min(src.width - 1, Math.floor(x * xRatio));
        const sy = Math.min(src.height - 1, Math.floor(y * yRatio));
        const srcIdx = (src.width * sy + sx) << 2;
        const dstIdx = (newW * y + x) << 2;
        dst.data[dstIdx] = src.data[srcIdx];
        dst.data[dstIdx + 1] = src.data[srcIdx + 1];
        dst.data[dstIdx + 2] = src.data[srcIdx + 2];
        dst.data[dstIdx + 3] = src.data[srcIdx + 3];
      }
    }
    return dst;
  }
}
