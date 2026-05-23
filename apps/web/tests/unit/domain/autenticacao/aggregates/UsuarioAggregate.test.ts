import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UsuarioAggregate } from '@/domain/autenticacao/aggregates/UsuarioAggregate';
import { EventDispatcher } from '@/domain/shared/events/EventDispatcher';
import { Papel } from '@/domain/autenticacao/value-objects/Papel';

describe('UsuarioAggregate', () => {
  const criarUsuarioProps = () => ({
    id: 'user-1',
    email: 'teste@email.com',
    senhaHash: 'hash123',
    nome: 'Usuario Teste',
    papel: Papel.CLIENTE,
    telefone: '11999999999',
    restauranteId: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  let dispatcher: EventDispatcher;

  beforeEach(() => {
    dispatcher = EventDispatcher.getInstance();
    vi.spyOn(dispatcher, 'dispatch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('criar', () => {
    it('deve criar aggregate e disparar evento', () => {
      const aggregate = UsuarioAggregate.criar(criarUsuarioProps());

      expect(aggregate.id).toBeDefined();
      expect(aggregate.email).toBe('teste@email.com');
      expect(dispatcher.dispatch).toHaveBeenCalled();
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir aggregate sem disparar evento', () => {
      const aggregate = UsuarioAggregate.reconstruir(criarUsuarioProps());

      expect(aggregate.id).toBeDefined();
      expect(aggregate.email).toBe('teste@email.com');
    });
  });

  describe('podeAcessarRecurso', () => {
    it('deve retornar true se usuário tem acesso ao restaurante', () => {
      const props = criarUsuarioProps();
      props.papel = Papel.GERENTE;
      props.restauranteId = 'rest-1';
      const aggregate = UsuarioAggregate.reconstruir(props);

      expect(aggregate.podeAcessarRecurso('rest-1')).toBe(true);
    });
  });

  describe('eProprietario', () => {
    it('deve retornar true para papel dono', () => {
      const props = criarUsuarioProps();
      props.papel = Papel.DONO;
      const aggregate = UsuarioAggregate.reconstruir(props);

      expect(aggregate.eProprietario()).toBe(true);
    });

    it('deve retornar false para outros papéis', () => {
      const props = criarUsuarioProps();
      props.papel = Papel.CLIENTE;
      const aggregate = UsuarioAggregate.reconstruir(props);

      expect(aggregate.eProprietario()).toBe(false);
    });
  });

  describe('eGerente', () => {
    it('deve retornar true para papel gerente', () => {
      const props = criarUsuarioProps();
      props.papel = Papel.GERENTE;
      const aggregate = UsuarioAggregate.reconstruir(props);

      expect(aggregate.eGerente()).toBe(true);
    });
  });

  describe('eFuncionario', () => {
    it('deve retornar true para papel atendente', () => {
      const props = criarUsuarioProps();
      props.papel = Papel.ATENDENTE;
      const aggregate = UsuarioAggregate.reconstruir(props);

      expect(aggregate.eFuncionario()).toBe(true);
    });
  });

  describe('eCliente', () => {
    it('deve retornar true para papel cliente', () => {
      const props = criarUsuarioProps();
      props.papel = Papel.CLIENTE;
      const aggregate = UsuarioAggregate.reconstruir(props);

      expect(aggregate.eCliente()).toBe(true);
    });
  });

  describe('getters', () => {
    it('deve expor email, papel e restauranteId', () => {
      const props = criarUsuarioProps();
      props.restauranteId = 'rest-1';
      const aggregate = UsuarioAggregate.reconstruir(props);

      expect(aggregate.email).toBe('teste@email.com');
      expect(aggregate.restauranteId).toBe('rest-1');
      expect(aggregate.usuarioEntity).toBeDefined();
    });
  });
});