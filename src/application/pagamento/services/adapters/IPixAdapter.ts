/**
 * Interface para o adapter de Pix.
 * Implementada por infrastructure/external/PixAdapter.
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
  verificarStatus(cobrancaId: string): Promise<PixCharge>;
}
