// Admin Application Services
export { GerenciarCategoriaUseCase } from './GerenciarCategoriaUseCase';
export type { CategoriaInput, CategoriaOutput } from './GerenciarCategoriaUseCase';

export { GerenciarProdutoUseCase } from './GerenciarProdutoUseCase';
export type { ProdutoInput, ProdutoOutput } from './GerenciarProdutoUseCase';

export { GerenciarMesaUseCase } from './GerenciarMesaUseCase';
export type { MesaInput, MesaOutput } from './GerenciarMesaUseCase';

export { ObterEstatisticasUseCase } from './ObterEstatisticasUseCase';
export type { EstatisticasInput, Estatisticas, Periodo } from './ObterEstatisticasUseCase';

export { GerenciarPedidosAdminUseCase } from './GerenciarPedidosAdminUseCase';
export type { GerenciarPedidosAdminInput, GerenciarPedidosAdminOutput, FiltrosPedido } from './GerenciarPedidosAdminUseCase';
