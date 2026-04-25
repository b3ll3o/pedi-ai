/**
 * Interface para o adapter de Pix.
 * Será implementada por infrastructure/external/PixAdapter em Phase 4.
 */
export interface PixCharge {
  id: string;
  valor: number;
  imagemQrCode: string;
  codigoPix: string;
  expiracao: Date;
}

export interface IPixAdapter {
  criarCobranca(valorEmCentavos: number, pedidoId: string): Promise<PixCharge>;
}
