import { describe, it, expect } from 'vitest';
import {
  PapelRestaurante,
  PapelRestauranteHelpers,
} from '@/domain/admin/value-objects/PapelRestaurante';

describe('PapelRestaurante', () => {
  describe('tipo PapelRestaurante', () => {
    it('deve permitir valor "dono"', () => {
      const papel: PapelRestaurante = 'dono';
      expect(papel).toBe('dono');
    });

    it('deve permitir valor "gerente"', () => {
      const papel: PapelRestaurante = 'gerente';
      expect(papel).toBe('gerente');
    });

    it('deve permitir valor "atendente"', () => {
      const papel: PapelRestaurante = 'atendente';
      expect(papel).toBe('atendente');
    });
  });

  describe('PapelRestauranteHelpers', () => {
    describe('isOwner', () => {
      it('deve retornar true para "dono"', () => {
        expect(PapelRestauranteHelpers.isOwner('dono')).toBe(true);
      });

      it('deve retornar false para "gerente"', () => {
        expect(PapelRestauranteHelpers.isOwner('gerente')).toBe(false);
      });

      it('deve retornar false para "atendente"', () => {
        expect(PapelRestauranteHelpers.isOwner('atendente')).toBe(false);
      });
    });

    describe('isManager', () => {
      it('deve retornar true para "gerente"', () => {
        expect(PapelRestauranteHelpers.isManager('gerente')).toBe(true);
      });

      it('deve retornar false para "dono"', () => {
        expect(PapelRestauranteHelpers.isManager('dono')).toBe(false);
      });

      it('deve retornar false para "atendente"', () => {
        expect(PapelRestauranteHelpers.isManager('atendente')).toBe(false);
      });
    });

    describe('isStaff', () => {
      it('deve retornar true para "atendente"', () => {
        expect(PapelRestauranteHelpers.isStaff('atendente')).toBe(true);
      });

      it('deve retornar false para "dono"', () => {
        expect(PapelRestauranteHelpers.isStaff('dono')).toBe(false);
      });

      it('deve retornar false para "gerente"', () => {
        expect(PapelRestauranteHelpers.isStaff('gerente')).toBe(false);
      });
    });
  });
});
