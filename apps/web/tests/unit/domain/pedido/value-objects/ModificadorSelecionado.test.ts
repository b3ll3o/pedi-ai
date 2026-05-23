import { describe, it, expect } from 'vitest';
import { ModificadorSelecionado } from '@/domain/pedido/value-objects/ModificadorSelecionado';

describe('ModificadorSelecionado', () => {
  const criarModificador = (): ModificadorSelecionado => {
    return new ModificadorSelecionado({
      grupoId: 'grupo-1',
      grupoNome: 'Borda',
      modificadorId: 'mod-1',
      modificadorNome: 'Catupiry',
      precoAdicional: 500,
    });
  };

  describe('criar via construtor', () => {
    it('deve criar modificador com valores corretos', () => {
      const mod = criarModificador();
      expect(mod.grupoId).toBe('grupo-1');
      expect(mod.grupoNome).toBe('Borda');
      expect(mod.modificadorId).toBe('mod-1');
      expect(mod.modificadorNome).toBe('Catupiry');
      expect(mod.precoAdicional).toBe(500);
    });
  });

  describe('equals', () => {
    it('deve retornar true para mesmo modificadorId', () => {
      const mod1 = new ModificadorSelecionado({
        grupoId: 'grupo-1',
        grupoNome: 'Borda',
        modificadorId: 'mod-1',
        modificadorNome: 'Catupiry',
        precoAdicional: 500,
      });
      const mod2 = new ModificadorSelecionado({
        grupoId: 'grupo-2',
        grupoNome: 'Outro',
        modificadorId: 'mod-1',
        modificadorNome: 'Qualquer',
        precoAdicional: 1000,
      });

      expect(mod1.equals(mod2)).toBe(true);
    });

    it('deve retornar false para modificadorId diferente', () => {
      const mod1 = criarModificador();
      const mod2 = new ModificadorSelecionado({
        grupoId: 'grupo-1',
        grupoNome: 'Borda',
        modificadorId: 'mod-2',
        modificadorNome: 'Catupiry',
        precoAdicional: 500,
      });

      expect(mod1.equals(mod2)).toBe(false);
    });
  });
});