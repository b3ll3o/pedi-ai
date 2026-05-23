export interface RespostaErroPadrao {
  statusCode: number;
  mensagem: string;
  codigo?: string;
  detalhes?: unknown;
  timestamp: string;
  caminho: string;
}
