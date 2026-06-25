/**
 * Interface para geração visual de QR Codes de mesa (PNG e PDF).
 *
 * Implementações ficam em `infrastructure/services/`.
 * Esta interface é pura (sem dependências de framework), permitindo
 * que use cases de application e testes unitários a consumam sem
 * acoplar a libs externas.
 *
 * @spec(RF-TABLE-07, RF-TABLE-09)
 * @see .openspec/specs/mesa/design.md
 */

export type QRCodeVisualFormat = 'png' | 'pdf';

/**
 * Buffer opaco para o conteúdo gerado (PNG bytes ou PDF bytes).
 */
export interface QRCodeVisualBuffer {
  /**
   * Bytes do arquivo gerado.
   */
  data: Uint8Array;

  /**
   * MIME type correspondente (`image/png` ou `application/pdf`).
   */
  mimeType: string;

  /**
   * Formato lógico do conteúdo.
   */
  format: QRCodeVisualFormat;
}

export interface QRCodeVisualOptions {
  /**
   * Conteúdo a ser codificado (URL ou payload serializado).
   */
  content: string;

  /**
   * Formato desejado para a saída.
   */
  format: QRCodeVisualFormat;

  /**
   * Largura/altura em pixels para PNG. Ignorado para PDF (que usa A4).
   * @default 512
   */
  size?: number;

  /**
   * Margem (em módulos do QR). @default 2
   */
  margin?: number;

  /**
   * Cor escura dos módulos (formato `#RRGGBB`). @default '#000000'
   */
  darkColor?: string;

  /**
   * Cor clara do fundo. @default '#FFFFFF'
   */
  lightColor?: string;

  /**
   * Logo a ser sobreposto no centro (RF-TABLE-09).
   * Pode ser Buffer (PNG/JPG bytes) ou string base64 com prefixo data URI.
   * Largura/altura ocupadas pelo logo em % do QR total. @default 0.18
   */
  logo?: {
    data: Buffer | string;
    /**
     * Fração do QR que o logo ocupa (0..0.4 recomendado). @default 0.18
     */
    ratio?: number;
  };

  /**
   * Cabeçalho a ser incluído em PDFs (ex.: nome do restaurante).
   * Não é codificado no QR, apenas impresso no PDF.
   */
  pdfHeader?: string;

  /**
   * Subtítulo a ser incluído em PDFs (ex.: número/nome da mesa).
   */
  pdfSubtitle?: string;
}

export interface IQRCodeVisualService {
  /**
   * Gera um arquivo visual (PNG ou PDF) com o QR Code.
   */
  gerar(options: QRCodeVisualOptions): Promise<QRCodeVisualBuffer>;

  /**
   * Atalho para gerar PNG.
   */
  gerarPng(options: Omit<QRCodeVisualOptions, 'format'>): Promise<QRCodeVisualBuffer>;

  /**
   * Atalho para gerar PDF A4 com QR centralizado e textos opcionais.
   */
  gerarPdf(options: Omit<QRCodeVisualOptions, 'format'>): Promise<QRCodeVisualBuffer>;
}
