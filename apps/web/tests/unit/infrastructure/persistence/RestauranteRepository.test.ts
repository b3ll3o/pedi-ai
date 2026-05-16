import { describe, it, expect, beforeEach } from 'vitest';
import { RestauranteRepository } from '@/infrastructure/persistence/admin/RestauranteRepository';
import { UsuarioRestauranteRepository } from '@/infrastructure/persistence/admin/UsuarioRestauranteRepository';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { ConfiguracoesRestaurante } from '@/domain/admin/value-objects/ConfiguracoesRestaurante';
import { createTestDatabase } from '../_test-helpers';

describe('RestauranteRepository', () => {
  let repository: RestauranteRepository;
  let db: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
    repository = new RestauranteRepository(db);
  });

  async function criarRestauranteValido(): Promise<Restaurante> {
    return Restaurante.criar({
      nome: 'Restaurante Teste',
      cnpj: '12.345.678/0001-90',
      endereco: 'Rua Teste, 123',
      telefone: '(11) 99999-9999',
      logoUrl: null,
    });
  }

  function criarConfiguracoesValidas(): ConfiguracoesRestaurante {
    return new ConfiguracoesRestaurante({
      permitePedidoOnline: true,
      permiteReserva: false,
      tempoPreparoMinutos: 30,
      taxaEntrega: 5.0,
      valorMinimoPedido: 20.0,
      modoOperacao: 'delivery',
      horariosFuncionamento: [
        { diaSemana: 1, horaAbertura: '09:00', horaFechamento: '22:00', fechado: false },
        { diaSemana: 2, horaAbertura: '09:00', horaFechamento: '22:00', fechado: false },
      ],
    });
  }

  describe('create', () => {
    it('deve criar restaurante com configurações e retorná-lo', async () => {
      const restaurante = await criarRestauranteValido();
      const configuracoes = criarConfiguracoesValidas();

      const resultado = await repository.create(restaurante, configuracoes);

      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(restaurante.id);
      expect(resultado.nome).toBe('Restaurante Teste');
      expect(resultado.cnpj).toBe('12.345.678/0001-90');
    });

    it('deve persistir restaurante no banco de dados', async () => {
      const restaurante = await criarRestauranteValido();
      const configuracoes = criarConfiguracoesValidas();

      await repository.create(restaurante, configuracoes);

      const existente = await db.restaurantes.get(restaurante.id);
      expect(existente).not.toBeNull();
      expect(existente!.nome).toBe('Restaurante Teste');
    });

    it('deve salvar configurações em tabela separada', async () => {
      const restaurante = await criarRestauranteValido();
      const configuracoes = criarConfiguracoesValidas();

      await repository.create(restaurante, configuracoes);

      const config = await db.table('configuracoes_restaurante').get(restaurante.id);
      expect(config).not.toBeNull();
      expect(config!.permitePedidoOnline).toBe(true);
      expect(config!.taxaEntrega).toBe(5.0);
    });
  });

  describe('findById', () => {
    it('deve encontrar restaurante por id', async () => {
      const restaurante = await criarRestauranteValido();
      const configuracoes = criarConfiguracoesValidas();
      await repository.create(restaurante, configuracoes);

      const resultado = await repository.findById(restaurante.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(restaurante.id);
      expect(resultado!.nome).toBe('Restaurante Teste');
    });

    it('deve retornar null quando restaurante não existe', async () => {
      const resultado = await repository.findById('id-inexistente');

      expect(resultado).toBeNull();
    });
  });

  describe('findByCNPJ', () => {
    it('deve encontrar restaurante por CNPJ', async () => {
      const restaurante = await criarRestauranteValido();
      const configuracoes = criarConfiguracoesValidas();
      await repository.create(restaurante, configuracoes);

      const resultado = await repository.findByCNPJ('12.345.678/0001-90');

      expect(resultado).not.toBeNull();
      expect(resultado!.cnpj).toBe('12.345.678/0001-90');
    });

    it('deve retornar null quando CNPJ não existe', async () => {
      const resultado = await repository.findByCNPJ('99.999.999/9999-99');

      expect(resultado).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar restaurante e configurações', async () => {
      const restaurante = await criarRestauranteValido();
      const configuracoes = criarConfiguracoesValidas();
      await repository.create(restaurante, configuracoes);

      restaurante['props'].nome = 'Restaurante Atualizado';
      const novasConfig = new ConfiguracoesRestaurante({
        permitePedidoOnline: false,
        permiteReserva: true,
        tempoPreparoMinutos: 45,
        taxaEntrega: 8.0,
        valorMinimoPedido: 30.0,
        modoOperacao: 'ambos',
        horariosFuncionamento: [],
      });

      const resultado = await repository.update(restaurante, novasConfig);

      expect(resultado.nome).toBe('Restaurante Atualizado');
    });

    it('deve persistir alterações no banco', async () => {
      const restaurante = await criarRestauranteValido();
      const configuracoes = criarConfiguracoesValidas();
      await repository.create(restaurante, configuracoes);

      restaurante['props'].nome = 'Nome Alterado';
      await repository.update(restaurante, configuracoes);

      const existente = await db.restaurantes.get(restaurante.id);
      expect(existente!.nome).toBe('Nome Alterado');
    });
  });

  describe('delete', () => {
    it('deve remover restaurante do banco', async () => {
      const restaurante = await criarRestauranteValido();
      const configuracoes = criarConfiguracoesValidas();
      await repository.create(restaurante, configuracoes);

      await repository.delete(restaurante.id);

      const existente = await db.restaurantes.get(restaurante.id);
      expect(existente).toBeUndefined();
    });

    it('deve remover configurações associadas', async () => {
      const restaurante = await criarRestauranteValido();
      const configuracoes = criarConfiguracoesValidas();
      await repository.create(restaurante, configuracoes);

      await repository.delete(restaurante.id);

      const config = await db.table('configuracoes_restaurante').get(restaurante.id);
      expect(config).toBeUndefined();
    });
  });

  describe('findAtivo', () => {
    it('deve retornar restaurante ativo', async () => {
      const restaurante = await criarRestauranteValido();
      restaurante['props'].ativo = true;
      const configuracoes = criarConfiguracoesValidas();
      await repository.create(restaurante, configuracoes);

      const resultado = await repository.findAtivo();

      expect(resultado).not.toBeNull();
      expect(resultado!.ativo).toBe(true);
    });

    it('deve retornar null quando nenhum restaurante está ativo', async () => {
      const resultado = await repository.findAtivo();

      expect(resultado).toBeNull();
    });
  });

  describe('findByUsuarioId', () => {
    it('deve retornar restaurantes vinculados ao usuário', async () => {
      const restaurante = await criarRestauranteValido();
      const configuracoes = criarConfiguracoesValidas();
      await repository.create(restaurante, configuracoes);

      const usuarioRepo = new UsuarioRestauranteRepository(db);
      const vinculo = UsuarioRestaurante.criar({
        usuarioId: 'usuario-123',
        restauranteId: restaurante.id,
        papel: 'dono',
      });
      await usuarioRepo.save(vinculo);

      const resultado = await repository.findByUsuarioId('usuario-123');

      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe(restaurante.id);
    });

    it('deve retornar array vazio quando usuário não tem restaurantes', async () => {
      const resultado = await repository.findByUsuarioId('usuario-sem-restaurantes');

      expect(resultado).toHaveLength(0);
    });
  });
});
