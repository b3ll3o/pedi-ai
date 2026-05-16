// Repositórios de autenticação
export { UsuarioRepository, SessaoRepository } from './autenticacao';

// Repositórios de admin
export {
  RestauranteRepository,
  EstatisticasRepository,
  UsuarioRestauranteRepository,
} from './admin';

// Repositórios de cardápio
export {
  CategoriaRepository,
  ItemCardapioRepository,
  ModificadorGrupoRepository,
  CardapioSyncService,
} from './cardapio';
export type { CardapioSyncResult } from './cardapio/CardapioSyncService';

// Repositórios de mesa
export { MesaRepository } from './mesa';

// Repositórios de pagamento
export { PagamentoRepository, TransacaoRepository } from './pagamento';

// Repositórios de pedido
export { PedidoRepository, CarrinhoRepository } from './pedido';

// Database
export { PediDatabase, db } from './database';
