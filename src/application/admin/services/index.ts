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

// Multi-restaurant Use Cases
export { CriarRestauranteUseCase } from './CriarRestauranteUseCase';
export type { CriarRestauranteInput, CriarRestauranteOutput } from './CriarRestauranteUseCase';

export { ListarRestaurantesDoOwnerUseCase } from './ListarRestaurantesDoOwnerUseCase';
export type { ListarRestaurantesDoOwnerInput, ListarRestaurantesDoOwnerOutput } from './ListarRestaurantesDoOwnerUseCase';

export { AtualizarRestauranteUseCase } from './AtualizarRestauranteUseCase';
export type { AtualizarRestauranteInput, AtualizarRestauranteOutput } from './AtualizarRestauranteUseCase';

export { DesativarRestauranteUseCase } from './DesativarRestauranteUseCase';
export type { DesativarRestauranteInput, DesativarRestauranteOutput } from './DesativarRestauranteUseCase';

export { VincularUsuarioRestauranteUseCase } from './VincularUsuarioRestauranteUseCase';
export type { VincularUsuarioRestauranteInput, VincularUsuarioRestauranteOutput } from './VincularUsuarioRestauranteUseCase';

export { DesvincularUsuarioRestauranteUseCase } from './DesvincularUsuarioRestauranteUseCase';
export type { DesvincularUsuarioRestauranteInput, DesvincularUsuarioRestauranteOutput } from './DesvincularUsuarioRestauranteUseCase';

export { ListarEquipeRestauranteUseCase } from './ListarEquipeRestauranteUseCase';
export type { ListarEquipeRestauranteInput, ListarEquipeRestauranteOutput, MembroEquipe } from './ListarEquipeRestauranteUseCase';

export { ObterCardapioCompletoUseCase } from './ObterCardapioCompletoUseCase';
export type { ObterCardapioCompletoInput, ObterCardapioCompletoOutput, CardapioCompleto } from './ObterCardapioCompletoUseCase';
