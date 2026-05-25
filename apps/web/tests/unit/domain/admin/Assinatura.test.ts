import { describe, it, expect } from 'vitest';
import { Assinatura } from '@/domain/admin/entities/Assinatura';

describe('Assinatura', () => {
  describe('criar', () => {
    it('deve criar assinatura com trial de 14 dias', () => {
      const assinatura = Assinatura.criar('rest-1');

      expect(assinatura.id).toBeDefined();
      expect(assinatura.restauranteId).toBe('rest-1');
      expect(assinatura.status).toBe('trial');
      expect(assinatura.diasRestantesTrial).toBe(14);
    });

    it('deve criar assinatura com trial customizado', () => {
      const assinatura = Assinatura.criar('rest-1', 30);

      expect(assinatura.diasRestantesTrial).toBe(30);
    });

    it('deve ter preco de R$19.99', () => {
      const assinatura = Assinatura.criar('rest-1');

      expect(assinatura.preçoFormatado).toBe('R$ 19,99');
    });
  });

  describe('trialAtivo', () => {
    it('deve retornar true para trial dentro do prazo', () => {
      const assinatura = Assinatura.criar('rest-1', 14);

      expect(assinatura.trialAtivo).toBe(true);
    });

    it('deve retornar false para assinatura ativa', () => {
      const assinatura = Assinatura.criar('rest-1');
      assinatura.ativarAssinatura('monthly');

      expect(assinatura.trialAtivo).toBe(false);
    });
  });

  describe('assinaturaAtiva', () => {
    it('deve retornar true para assinatura ativa dentro do prazo', () => {
      const assinatura = Assinatura.criar('rest-1');
      assinatura.ativarAssinatura('monthly');

      expect(assinatura.assinaturaAtiva).toBe(true);
    });

    it('deve retornar false para trial', () => {
      const assinatura = Assinatura.criar('rest-1');

      expect(assinatura.assinaturaAtiva).toBe(false);
    });
  });

  describe('periodoAtivo', () => {
    it('deve retornar true para trial ativo', () => {
      const assinatura = Assinatura.criar('rest-1');

      expect(assinatura.períodoAtivo).toBe(true);
    });

    it('deve retornar true para assinatura ativa', () => {
      const assinatura = Assinatura.criar('rest-1');
      assinatura.ativarAssinatura('monthly');

      expect(assinatura.períodoAtivo).toBe(true);
    });

    it('deve retornar false para assinatura expirada', () => {
      const assinatura = Assinatura.criar('rest-1');
      assinatura.expirar();

      expect(assinatura.períodoAtivo).toBe(false);
    });
  });

  describe('bloqueado', () => {
    it('deve retornar false para trial ativo', () => {
      const assinatura = Assinatura.criar('rest-1');

      expect(assinatura.bloqueado).toBe(false);
    });

    it('deve retornar true para assinatura expirada', () => {
      const assinatura = Assinatura.criar('rest-1');
      assinatura.expirar();

      expect(assinatura.bloqueado).toBe(true);
    });
  });

  describe('ativarAssinatura', () => {
    it('deve ativar assinatura monthly', () => {
      const assinatura = Assinatura.criar('rest-1');
      assinatura.ativarAssinatura('monthly');

      expect(assinatura.status).toBe('active');
      expect(assinatura.assinaturaAtiva).toBe(true);
    });

    it('deve ativar assinatura yearly', () => {
      const assinatura = Assinatura.criar('rest-1');
      assinatura.ativarAssinatura('yearly');

      expect(assinatura.status).toBe('active');
    });
  });

  describe('expirar', () => {
    it('deve expirar trial', () => {
      const assinatura = Assinatura.criar('rest-1');
      assinatura.expirar();

      expect(assinatura.status).toBe('expired');
      expect(assinatura.bloqueado).toBe(true);
    });
  });

  describe('cancelar', () => {
    it('deve cancelar assinatura', () => {
      const assinatura = Assinatura.criar('rest-1');
      assinatura.ativarAssinatura('monthly');
      assinatura.cancelar();

      expect(assinatura.status).toBe('cancelled');
    });
  });

  describe('toRecord', () => {
    it('deve converter para record do banco', () => {
      const assinatura = Assinatura.criar('rest-1');
      const record = assinatura.toRecord();

      expect(record.restaurant_id).toBe('rest-1');
      expect(record.status).toBe('trial');
      expect(record.plan_type).toBe('monthly');
      expect(record.price_cents).toBe(1999);
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir assinatura a partir de props', () => {
      const assinatura = Assinatura.criar('rest-1');
      const props = assinatura['props'];
      const reconstruida = Assinatura.reconstruir(props);

      expect(reconstruida.id).toBe(assinatura.id);
      expect(reconstruida.restauranteId).toBe('rest-1');
    });
  });

  describe('equals', () => {
    it('deve verificar igualdade por id', () => {
      const assinatura1 = Assinatura.criar('rest-1');
      const assinatura2 = Assinatura.reconstruir(assinatura1['props']);

      expect(assinatura1.equals(assinatura2)).toBe(true);
    });
  });
});
