// Entities
export { Usuario } from './entities/Usuario';
export type { UsuarioProps } from './entities/Usuario';
export { Sessao } from './entities/Sessao';
export type { SessaoProps } from './entities/Sessao';

// Value Objects
export { Papel } from './value-objects/Papel';
export type { PapelValue } from './value-objects/Papel';
export { Credenciais } from './value-objects/Credenciais';
export type { CredenciaisValue } from './value-objects/Credenciais';

// Aggregates
export { UsuarioAggregate } from './aggregates/UsuarioAggregate';

// Events
export { UsuarioCriadoEvent } from './events/UsuarioCriadoEvent';
export { SessaoCriadaEvent } from './events/SessaoCriadaEvent';
export { SessaoExpiradaEvent } from './events/SessaoExpiradaEvent';

// Repositories
export type { IUsuarioRepository } from './repositories/IUsuarioRepository';
export type { ISessaoRepository } from './repositories/ISessaoRepository';
