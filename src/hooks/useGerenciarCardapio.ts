/**
 * useGerenciarCardapio Hook
 * Hook para gerenciar categorias e produtos do cardápio usando use cases do application layer.
 */

import { useState, useCallback } from 'react';
import { db } from '@/infrastructure/persistence/database';
import { CategoriaRepository } from '@/infrastructure/persistence/cardapio/CategoriaRepository';
import { ItemCardapioRepository } from '@/infrastructure/persistence/cardapio/ItemCardapioRepository';
import { GerenciarCategoriaUseCase, type CategoriaInput, type CategoriaOutput } from '@/application/admin/services/GerenciarCategoriaUseCase';
import { GerenciarProdutoUseCase, type ProdutoInput, type ProdutoOutput } from '@/application/admin/services/GerenciarProdutoUseCase';
import type { Categoria } from '@/domain/cardapio/entities/Categoria';
import type { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';

// Instanciar repositories
const categoriaRepo = new CategoriaRepository(db);
const produtoRepo = new ItemCardapioRepository(db);

// Instanciar use cases
const gerenciarCategoriaUseCase = new GerenciarCategoriaUseCase(categoriaRepo);
const gerenciarProdutoUseCase = new GerenciarProdutoUseCase(produtoRepo, categoriaRepo);

export interface UseGerenciarCardapioResult {
  // Categorias
  categorias: Categoria[];
  loadingCategorias: boolean;
  criarCategoria: (input: Omit<CategoriaInput, 'acao'>) => Promise<CategoriaOutput>;
  atualizarCategoria: (input: Omit<CategoriaInput & { id: string }, 'acao'>) => Promise<CategoriaOutput>;
  excluirCategoria: (id: string, restauranteId: string) => Promise<CategoriaOutput>;
  ativarCategoria: (id: string, restauranteId: string) => Promise<CategoriaOutput>;
  desativarCategoria: (id: string, restauranteId: string) => Promise<CategoriaOutput>;

  // Produtos
  produtos: ItemCardapio[];
  loadingProdutos: boolean;
  criarProduto: (input: Omit<ProdutoInput, 'acao'>) => Promise<ProdutoOutput>;
  atualizarProduto: (input: Omit<ProdutoInput & { id: string }, 'acao'>) => Promise<ProdutoOutput>;
  excluirProduto: (id: string, categoriaId: string) => Promise<ProdutoOutput>;
  ativarProduto: (id: string, categoriaId: string) => Promise<ProdutoOutput>;
  desativarProduto: (id: string, categoriaId: string) => Promise<ProdutoOutput>;

  // Loading geral
  loading: boolean;
  error: Error | null;
}

/**
 * Hook para gerenciar categorias e produtos do cardápio.
 * Usa GerenciarCategoriaUseCase e GerenciarProdutoUseCase do application layer.
 *
 * @param restauranteId - ID do restaurante
 * @param categoriaId - ID da categoria para carregar produtos (opcional)
 * @returns Funções e estados para gerenciar o cardápio
 */
export function useGerenciarCardapio(restauranteId: string, categoriaId?: string): UseGerenciarCardapioResult {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<ItemCardapio[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Buscar categorias do restaurante
  const buscarCategorias = useCallback(async () => {
    if (!restauranteId) return;

    setLoadingCategorias(true);
    try {
      const resultado = await categoriaRepo.buscarPorRestaurante(restauranteId);
      setCategorias(resultado);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao buscar categorias'));
    } finally {
      setLoadingCategorias(false);
    }
  }, [restauranteId]);

  // Buscar produtos da categoria
  const buscarProdutos = useCallback(async () => {
    if (!categoriaId) return;

    setLoadingProdutos(true);
    try {
      const resultado = await produtoRepo.buscarPorCategoria(categoriaId);
      setProdutos(resultado);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao buscar produtos'));
    } finally {
      setLoadingProdutos(false);
    }
  }, [categoriaId]);

  // Carregar dados iniciais
  useState(() => {
    buscarCategorias();
    if (categoriaId) {
      buscarProdutos();
    }
  });

  // Ações de categoria
  const criarCategoria = useCallback(async (input: Omit<CategoriaInput, 'acao'>): Promise<CategoriaOutput> => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await gerenciarCategoriaUseCase.execute({ ...input, acao: 'criar' });
      await buscarCategorias();
      return resultado;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao criar categoria');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [buscarCategorias]);

  const atualizarCategoria = useCallback(async (input: Omit<CategoriaInput & { id: string }, 'acao'>): Promise<CategoriaOutput> => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await gerenciarCategoriaUseCase.execute({ ...input, acao: 'atualizar' });
      await buscarCategorias();
      return resultado;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao atualizar categoria');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [buscarCategorias]);

  const excluirCategoria = useCallback(async (id: string, restauranteId: string): Promise<CategoriaOutput> => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await gerenciarCategoriaUseCase.execute({ id, restauranteId, acao: 'excluir' });
      await buscarCategorias();
      return resultado;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao excluir categoria');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [buscarCategorias]);

  const ativarCategoria = useCallback(async (id: string, restauranteId: string): Promise<CategoriaOutput> => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await gerenciarCategoriaUseCase.execute({ id, restauranteId, acao: 'ativar' });
      await buscarCategorias();
      return resultado;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao ativar categoria');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [buscarCategorias]);

  const desativarCategoria = useCallback(async (id: string, restauranteId: string): Promise<CategoriaOutput> => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await gerenciarCategoriaUseCase.execute({ id, restauranteId, acao: 'desativar' });
      await buscarCategorias();
      return resultado;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao desativar categoria');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [buscarCategorias]);

  // Ações de produto
  const criarProduto = useCallback(async (input: Omit<ProdutoInput, 'acao'>): Promise<ProdutoOutput> => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await gerenciarProdutoUseCase.execute({ ...input, acao: 'criar' });
      if (categoriaId) {
        await buscarProdutos();
      }
      return resultado;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao criar produto');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [buscarProdutos, categoriaId]);

  const atualizarProduto = useCallback(async (input: Omit<ProdutoInput & { id: string }, 'acao'>): Promise<ProdutoOutput> => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await gerenciarProdutoUseCase.execute({ ...input, acao: 'atualizar' });
      if (categoriaId) {
        await buscarProdutos();
      }
      return resultado;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao atualizar produto');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [buscarProdutos, categoriaId]);

  const excluirProduto = useCallback(async (id: string, categoriaId: string): Promise<ProdutoOutput> => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await gerenciarProdutoUseCase.execute({ categoriaId, id, acao: 'excluir' });
      await buscarProdutos();
      return resultado;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao excluir produto');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [buscarProdutos]);

  const ativarProduto = useCallback(async (id: string, categoriaId: string): Promise<ProdutoOutput> => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await gerenciarProdutoUseCase.execute({ categoriaId, id, acao: 'ativar' });
      await buscarProdutos();
      return resultado;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao ativar produto');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [buscarProdutos]);

  const desativarProduto = useCallback(async (id: string, categoriaId: string): Promise<ProdutoOutput> => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await gerenciarProdutoUseCase.execute({ categoriaId, id, acao: 'desativar' });
      await buscarProdutos();
      return resultado;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao desativar produto');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [buscarProdutos]);

  return {
    categorias,
    loadingCategorias,
    criarCategoria,
    atualizarCategoria,
    excluirCategoria,
    ativarCategoria,
    desativarCategoria,
    produtos,
    loadingProdutos,
    criarProduto,
    atualizarProduto,
    excluirProduto,
    ativarProduto,
    desativarProduto,
    loading: loading || loadingCategorias || loadingProdutos,
    error,
  };
}
