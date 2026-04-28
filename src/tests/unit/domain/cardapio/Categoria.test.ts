import { describe, it, expect } from 'vitest';
import { Categoria, CategoriaProps } from '@/domain/cardapio/entities/Categoria';

describe('Categoria', () => {
  describe('criar', () => {
    it('deve criar uma categoria com ID gerado', () => {
      const props = {
        restauranteId: 'restaurante-1',
        nome: 'Bebidas',
        descricao: 'Todas as bebidas',
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      };

      const categoria = Categoria.criar(props);

      expect(categoria.id).toBeDefined();
      expect(categoria.restauranteId).toBe('restaurante-1');
      expect(categoria.nome).toBe('Bebidas');
      expect(categoria.descricao).toBe('Todas as bebidas');
      expect(categoria.ordemExibicao).toBe(1);
      expect(categoria.ativo).toBe(true);
    });

    it('deve criar categoria com imagem URL', () => {
      const categoria = Categoria.criar({
        restauranteId: 'restaurante-1',
        nome: 'Bebidas',
        descricao: null,
        imagemUrl: 'https://exemplo.com/bebidas.jpg',
        ordemExibicao: 1,
        ativo: true,
      });

      expect(categoria.imagemUrl).toBe('https://exemplo.com/bebidas.jpg');
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir uma categoria a partir de props completas', () => {
      const props: CategoriaProps = {
        id: 'categoria-1',
        restauranteId: 'restaurante-1',
        nome: 'Sobremesas',
        descricao: 'Doces e sobremesas',
        imagemUrl: 'https://exemplo.com/sobremesas.jpg',
        ordemExibicao: 3,
        ativo: true,
      };

      const categoria = Categoria.reconstruir(props);

      expect(categoria.id).toBe('categoria-1');
      expect(categoria.nome).toBe('Sobremesas');
      expect(categoria.descricao).toBe('Doces e sobremesas');
      expect(categoria.imagemUrl).toBe('https://exemplo.com/sobremesas.jpg');
      expect(categoria.ordemExibicao).toBe(3);
    });
  });

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const cat1 = Categoria.criar({
        restauranteId: 'restaurante-1',
        nome: 'Bebidas',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      });

      const cat2 = Categoria.reconstruir({
        id: cat1.id,
        restauranteId: 'restaurante-1',
        nome: 'Outra Categoria',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 2,
        ativo: false,
      });

      expect(cat1.equals(cat2)).toBe(true);
    });

    it('deve ser diferente quando IDs são diferentes', () => {
      const cat1 = Categoria.criar({
        restauranteId: 'restaurante-1',
        nome: 'Bebidas',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      });

      const cat2 = Categoria.criar({
        restauranteId: 'restaurante-1',
        nome: 'Bebidas',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      });

      expect(cat1.equals(cat2)).toBe(false);
    });
  });

  describe('ativar e desativar', () => {
    it('deve ativar a categoria', () => {
      const categoria = Categoria.criar({
        restauranteId: 'restaurante-1',
        nome: 'Bebidas',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: false,
      });

      categoria.ativar();

      expect(categoria.ativo).toBe(true);
    });

    it('deve desativar a categoria', () => {
      const categoria = Categoria.criar({
        restauranteId: 'restaurante-1',
        nome: 'Bebidas',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      });

      categoria.desativar();

      expect(categoria.ativo).toBe(false);
    });
  });

  describe('atualizarNome', () => {
    it('deve atualizar o nome', () => {
      const categoria = Categoria.criar({
        restauranteId: 'restaurante-1',
        nome: 'Bebidas',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      });

      categoria.atualizarNome('Nova Bebidas');

      expect(categoria.nome).toBe('Nova Bebidas');
    });
  });

  describe('atualizarDescricao', () => {
    it('deve atualizar a descrição', () => {
      const categoria = Categoria.criar({
        restauranteId: 'restaurante-1',
        nome: 'Bebidas',
        descricao: 'Descrição antiga',
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      });

      categoria.atualizarDescricao('Descrição nova');

      expect(categoria.descricao).toBe('Descrição nova');
    });

    it('deve permitir descrição null', () => {
      const categoria = Categoria.criar({
        restauranteId: 'restaurante-1',
        nome: 'Bebidas',
        descricao: 'Descrição',
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      });

      categoria.atualizarDescricao(null);

      expect(categoria.descricao).toBeNull();
    });
  });

  describe('atualizarOrdem', () => {
    it('deve atualizar a ordem de exibição', () => {
      const categoria = Categoria.criar({
        restauranteId: 'restaurante-1',
        nome: 'Bebidas',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      });

      categoria.atualizarOrdem(5);

      expect(categoria.ordemExibicao).toBe(5);
    });
  });
});
