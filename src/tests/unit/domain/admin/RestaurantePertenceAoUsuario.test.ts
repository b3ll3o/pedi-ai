import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';

describe('Restaurante.pertenceAoUsuario', () => {
  const mockRepository: IUsuarioRestauranteRepository = {
    findByUsuarioId: vi.fn(),
    findByRestauranteId: vi.fn(),
    findByUsuarioIdAndRestauranteId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar true quando usuário está vinculado ao restaurante', async () => {
    const restaurante = Restaurante.criar({
      nome: 'Restaurante Teste',
      cnpj: '12345678000199',
      endereco: 'Rua Teste, 123',
      telefone: null,
      logoUrl: null,
      ativo: true,
    });

    const vinculo = UsuarioRestaurante.criar({
      usuarioId: 'usuario-1',
      restauranteId: restaurante.id,
      papel: 'owner',
    });

    mockRepository.findByUsuarioIdAndRestauranteId = vi.fn().mockResolvedValue(vinculo);

    const result = await restaurante.pertenceAoUsuario('usuario-1', mockRepository);

    expect(result).toBe(true);
    expect(mockRepository.findByUsuarioIdAndRestauranteId).toHaveBeenCalledWith(
      'usuario-1',
      restaurante.id
    );
  });

  it('deve retornar false quando usuário não está vinculado ao restaurante', async () => {
    const restaurante = Restaurante.criar({
      nome: 'Restaurante Teste',
      cnpj: '12345678000199',
      endereco: 'Rua Teste, 123',
      telefone: null,
      logoUrl: null,
      ativo: true,
    });

    mockRepository.findByUsuarioIdAndRestauranteId = vi.fn().mockResolvedValue(null);

    const result = await restaurante.pertenceAoUsuario('usuario-2', mockRepository);

    expect(result).toBe(false);
    expect(mockRepository.findByUsuarioIdAndRestauranteId).toHaveBeenCalledWith(
      'usuario-2',
      restaurante.id
    );
  });

  it('deve retornar true para gerente vinculado', async () => {
    const restaurante = Restaurante.criar({
      nome: 'Restaurante Teste',
      cnpj: '12345678000199',
      endereco: 'Rua Teste, 123',
      telefone: null,
      logoUrl: null,
      ativo: true,
    });

    const vinculo = UsuarioRestaurante.criar({
      usuarioId: 'usuario-1',
      restauranteId: restaurante.id,
      papel: 'manager',
    });

    mockRepository.findByUsuarioIdAndRestauranteId = vi.fn().mockResolvedValue(vinculo);

    const result = await restaurante.pertenceAoUsuario('usuario-1', mockRepository);

    expect(result).toBe(true);
  });

  it('deve retornar true para staff vinculado', async () => {
    const restaurante = Restaurante.criar({
      nome: 'Restaurante Teste',
      cnpj: '12345678000199',
      endereco: 'Rua Teste, 123',
      telefone: null,
      logoUrl: null,
      ativo: true,
    });

    const vinculo = UsuarioRestaurante.criar({
      usuarioId: 'usuario-1',
      restauranteId: restaurante.id,
      papel: 'staff',
    });

    mockRepository.findByUsuarioIdAndRestauranteId = vi.fn().mockResolvedValue(vinculo);

    const result = await restaurante.pertenceAoUsuario('usuario-1', mockRepository);

    expect(result).toBe(true);
  });
});
