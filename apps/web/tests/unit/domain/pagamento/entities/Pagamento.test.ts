import { describe, it, expect } from 'vitest';
import { Pagamento } from '@/domain/pagamento/entities/Pagamento';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

describe('Pagamento', () => {
  const criarPagamento = (): Pagamento => {
    return Pagamento.criar({
      id: 'pag-1',
      pedidoId: 'pedido-1',
      valor: Dinheiro.criar(10000),
      metodo: 'pix',
    });
  };

  describe('criar', () => {
    it('deve criar pagamento pendente', () => {
      const pag = criarPagamento();
      expect(pag.status.isPendente()).toBe(true);
      expect(pag.valor.valor).toBe(10000);
    });
  });

  describe('confirmar', () => {
    it('deve confirmar pagamento pendente', () => {
      const pag = criarPagamento();
      pag.confirmar('provider-1');

      expect(pag.status.isConfirmado()).toBe(true);
      expect(pag.transacaoId).toBe('provider-1');
    });

    it('deve lançar erro se já confirmado', () => {
      const pag = criarPagamento();
      pag.confirmar('provider-1');
      expect(() => pag.confirmar('provider-2')).toThrow(/não está pendente/);
    });
  });

  describe('falhar', () => {
    it('deve marcar pagamento como falhou', () => {
      const pag = criarPagamento();
      pag.falhar();

      expect(pag.status.isFalhou()).toBe(true);
    });
  });

  describe('reembolsar', () => {
    it('deve reembolsar pagamento confirmado', () => {
      const pag = criarPagamento();
      pag.confirmar('provider-1');
      pag.reembolsar();

      expect(pag.status.isReembolsado()).toBe(true);
    });

    it('deve lançar erro se não confirmado', () => {
      const pag = criarPagamento();
      expect(() => pag.reembolsar()).toThrow(/confirmados/);
    });
  });

  describe('cancelar', () => {
    it('deve cancelar pagamento pendente', () => {
      const pag = criarPagamento();
      pag.cancelar();

      expect(pag.status.isCancelado()).toBe(true);
    });

    it('deve lançar erro se não pendente', () => {
      const pag = criarPagamento();
      pag.confirmar('provider-1');
      expect(() => pag.cancelar()).toThrow(/pendente/);
    });
  });

  describe('equals', () => {
    it('deve verificar igualdade por id', () => {
      const pag1 = criarPagamento();
      const pag2 = Pagamento.criar({
        id: 'pag-1',
        pedidoId: 'pedido-2',
        valor: Dinheiro.criar(5000),
        metodo: 'cartao',
      });

      expect(pag1.equals(pag2)).toBe(true);
    });
  });
});