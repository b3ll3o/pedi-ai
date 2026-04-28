import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExcluirGrupoModificadorUseCase } from '@/application/admin/services/ExcluirGrupoModificadorUseCase';
import { ExcluirGrupoModificadorInput } from '@/application/admin/services/ExcluirGrupoModificadorUseCase';
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo';
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor';
import { IModificadorGrupoRepository } from '@/domain/cardapio/repositories/IModificadorGrupoRepository';

describe('ExcluirGrupoModificadorUseCase', () => {
  let useCase: ExcluirGrupoModificadorUseCase;
  let mockGrupoRepo: IModificadorGrupoRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGrupoRepo = {
      buscarPorId: vi.fn(),
      buscarPorRestaurante: vi.fn(),
      buscarPorProduto: vi.fn(),
      salvar: vi.fn(),
      salvarMany: vi.fn(),
      excluir: vi.fn(),
    };
    useCase = new ExcluirGrupoModificadorUseCase(mockGrupoRepo);
  });

  describe('execute', () => {
    it('deve soft-delete grupo de modificadores quando grupo existe e está ativo', async () => {
      const grupoAtivo = ModificadorGrupo.criar({
        restauranteId: 'restaurante-id',
        nome: 'Grupo de Modificadores',
        obrigatorio: true,
        minSelecoes: 1,
        maxSelecoes: 3,
        valores: [],
        ativo: true,
      });

      mockGrupoRepo.buscarPorId.mockResolvedValueOnce(grupoAtivo);
      mockGrupoRepo.salvar.mockImplementation(async (g) => g);

      const input: ExcluirGrupoModificadorInput = {
        id: grupoAtivo.id,
      };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(grupoAtivo.ativo).toBe(false);
      expect(mockGrupoRepo.salvar).toHaveBeenCalledTimes(1);
      expect(mockGrupoRepo.excluir).not.toHaveBeenCalled();
    });

    it('deve preservar dados para pedidos históricos ao fazer soft-delete', async () => {
      const valorAtivo = ModificadorValor.criar({
        modificadorGrupoId: 'grupo-id',
        restauranteId: 'restaurante-id',
        nome: 'Valor de Modificador',
        ajustePreco: { valor: 500, moeda: 'BRL' } as any,
        ativo: true,
      });

      const grupoAtivo = ModificadorGrupo.criar({
        restauranteId: 'restaurante-id',
        nome: 'Grupo de Modificadores',
        obrigatorio: true,
        minSelecoes: 1,
        maxSelecoes: 3,
        valores: [valorAtivo],
        ativo: true,
      });

      mockGrupoRepo.buscarPorId.mockResolvedValueOnce(grupoAtivo);
      mockGrupoRepo.salvar.mockImplementation(async (g) => g);

      const input: ExcluirGrupoModificadorInput = {
        id: grupoAtivo.id,
      };

      await useCase.execute(input);

      // Verifica que não houve exclusão física (hard delete)
      expect(mockGrupoRepo.excluir).not.toHaveBeenCalled();
      // Verifica que os valores ainda estão presentes (preservados para histórico)
      expect(grupoAtivo.valores).toHaveLength(1);
      expect(grupoAtivo.valores[0].ativo).toBe(true);
      // Verifica que apenas o grupo foi desativado
      expect(grupoAtivo.ativo).toBe(false);
    });

    it('deve lançar erro quando grupo não existe', async () => {
      mockGrupoRepo.buscarPorId.mockResolvedValueOnce(null);

      const input: ExcluirGrupoModificadorInput = {
        id: 'grupo-inexistente-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Grupo de modificador não encontrado'
      );
      expect(mockGrupoRepo.salvar).not.toHaveBeenCalled();
      expect(mockGrupoRepo.excluir).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando grupo já está desativado', async () => {
      const grupoDesativado = ModificadorGrupo.criar({
        restauranteId: 'restaurante-id',
        nome: 'Grupo de Modificadores',
        obrigatorio: true,
        minSelecoes: 1,
        maxSelecoes: 3,
        valores: [],
        ativo: false,
      });

      mockGrupoRepo.buscarPorId.mockResolvedValueOnce(grupoDesativado);

      const input: ExcluirGrupoModificadorInput = {
        id: grupoDesativado.id,
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Grupo de modificador já está desativado'
      );
      expect(mockGrupoRepo.salvar).not.toHaveBeenCalled();
      expect(mockGrupoRepo.excluir).not.toHaveBeenCalled();
    });

    it('deve chamar salvar com grupo desativado após soft-delete', async () => {
      const grupoAtivo = ModificadorGrupo.criar({
        restauranteId: 'restaurante-id',
        nome: 'Grupo de Modificadores',
        obrigatorio: false,
        minSelecoes: 0,
        maxSelecoes: 5,
        valores: [],
        ativo: true,
      });

      mockGrupoRepo.buscarPorId.mockResolvedValueOnce(grupoAtivo);
      mockGrupoRepo.salvar.mockImplementation(async (g) => g);

      const input: ExcluirGrupoModificadorInput = {
        id: grupoAtivo.id,
      };

      await useCase.execute(input);

      // Verifica que salvar foi chamado com o grupo modificado
      expect(mockGrupoRepo.salvar).toHaveBeenCalledWith(grupoAtivo);
      expect(grupoAtivo.ativo).toBe(false);
    });
  });
});
