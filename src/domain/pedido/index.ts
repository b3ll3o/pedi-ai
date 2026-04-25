// Entities
export { Pedido } from './entities/Pedido';
export type { PedidoProps } from './entities/Pedido';
export { ItemPedido } from './entities/ItemPedido';
export type { ItemPedidoProps } from './entities/ItemPedido';

// Value Objects
export { Dinheiro } from './value-objects/Dinheiro';
export type { DinheiroValue } from './value-objects/Dinheiro';
export { StatusPedido } from './value-objects/StatusPedido';
export type { StatusPedidoValue } from './value-objects/StatusPedido';
export { MetodoPagamento } from './value-objects/MetodoPagamento';
export type { MetodoPagamentoValue } from './value-objects/MetodoPagamento';
export { ModificadorSelecionado } from './value-objects/ModificadorSelecionado';
export type { ModificadorSelecionadoProps } from './value-objects/ModificadorSelecionado';

// Aggregates
export { PedidoAggregate } from './aggregates/PedidoAggregate';
export { CarrinhoAggregate } from './aggregates/CarrinhoAggregate';
export type { CarrinhoProps } from './aggregates/CarrinhoAggregate';

// Events
export { PedidoCriadoEvent } from './events/PedidoCriadoEvent';
export { PedidoStatusAlteradoEvent } from './events/PedidoStatusAlteradoEvent';
export { PagamentoConfirmadoEvent } from './events/PagamentoConfirmadoEvent';

// Services
export { CalculadoraTotal } from './services/CalculadoraTotal';
export type { ResultadoCalculo } from './services/CalculadoraTotal';

// Repositories
export type { IPedidoRepository } from './repositories/IPedidoRepository';
export type { ICarrinhoRepository } from './repositories/ICarrinhoRepository';
