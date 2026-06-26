export interface RespostaErroPadrao {
  statusCode: number;
  mensagem: string;
  codigo?: string;
  detalhes?: unknown;
  timestamp: string;
  caminho: string;
  /** ID de correlação (auditoria A15) — eco do header `x-request-id`. */
  requestId?: string;
}
