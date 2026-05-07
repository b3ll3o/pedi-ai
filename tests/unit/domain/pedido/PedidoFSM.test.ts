import { describe, it, expect } from 'vitest';
import { Pedido, PedidoProps } from '@/domain/pedido/entities/Pedido';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

/**
 * Unit tests para a FSM (Finite State Machine) de Pedido.
 * Valida as transições de status definidas em:
 *   pending_payment → paid → received → preparing → ready → delivered
 * E os fluxos de erro/cancelamento.
 */
describe('Pedido — FSM de Status', () => {
  // Criar Pedido com new diretamente para controle total dos props
  const criarPedido = (status: StatusPedido = StatusPedido.PENDING_PAYMENT): Pedido => {
    const props: PedidoProps = {
      id: crypto.randomUUID(),
      restauranteId: 'restaurante-1',
      status,
      itens: [],
      subtotal: Dinheiro.ZERO,
      tax: Dinheiro.ZERO,
      total: Dinheiro.ZERO,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return new Pedido(props);
  };

  // ═══════════════════════════════════════════════════════════════
  // Fluxo principal happy-path
  // ═══════════════════════════════════════════════════════════════

  describe('Fluxo principal (pagamento → entrega)', () => {
    it('pending_payment → paid (PIX confirmado)', () => {
      const pedido = criarPedido(StatusPedido.PENDING_PAYMENT);
      pedido.alterarStatus(StatusPedido.PAID);
      expect(pedido.status).toEqual(StatusPedido.PAID);
    });

    it('paid → received (restaurante aceitou o pedido)', () => {
      const pedido = criarPedido(StatusPedido.PAID);
      pedido.alterarStatus(StatusPedido.RECEIVED);
      expect(pedido.status).toEqual(StatusPedido.RECEIVED);
    });

    it('received → preparing (cozinha iniciou preparo)', () => {
      const pedido = criarPedido(StatusPedido.RECEIVED);
      pedido.alterarStatus(StatusPedido.PREPARING);
      expect(pedido.status).toEqual(StatusPedido.PREPARING);
    });

    it('preparing → ready (pedido pronto para retirada)', () => {
      const pedido = criarPedido(StatusPedido.PREPARING);
      pedido.alterarStatus(StatusPedido.READY);
      expect(pedido.status).toEqual(StatusPedido.READY);
    });

    it('ready → delivered (pedido entregue ao cliente)', () => {
      const pedido = criarPedido(StatusPedido.READY);
      pedido.alterarStatus(StatusPedido.DELIVERED);
      expect(pedido.status).toEqual(StatusPedido.DELIVERED);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Fluxo de pagamento rejeitado
  // ═══════════════════════════════════════════════════════════════

  describe('Fluxo de pagamento rejeitado', () => {
    it('pending_payment → payment_failed (pagamento recusado)', () => {
      const pedido = criarPedido(StatusPedido.PENDING_PAYMENT);
      pedido.alterarStatus(StatusPedido.PAYMENT_FAILED);
      expect(pedido.status).toEqual(StatusPedido.PAYMENT_FAILED);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Fluxos de cancelamento
  // ═══════════════════════════════════════════════════════════════

  describe('Fluxos de cancelamento', () => {
    it('pending_payment → cancelled (cliente cancela antes do pagamento)', () => {
      const pedido = criarPedido(StatusPedido.PENDING_PAYMENT);
      pedido.alterarStatus(StatusPedido.CANCELLED);
      expect(pedido.status).toEqual(StatusPedido.CANCELLED);
    });

    it('paid → cancelled (restaurante cancela após pagamento)', () => {
      const pedido = criarPedido(StatusPedido.PAID);
      pedido.alterarStatus(StatusPedido.CANCELLED);
      expect(pedido.status).toEqual(StatusPedido.CANCELLED);
    });

    it('received → cancelled', () => {
      const pedido = criarPedido(StatusPedido.RECEIVED);
      pedido.alterarStatus(StatusPedido.CANCELLED);
      expect(pedido.status).toEqual(StatusPedido.CANCELLED);
    });

    it('preparing → cancelled', () => {
      const pedido = criarPedido(StatusPedido.PREPARING);
      pedido.alterarStatus(StatusPedido.CANCELLED);
      expect(pedido.status).toEqual(StatusPedido.CANCELLED);
    });

    it('ready → cancelled', () => {
      const pedido = criarPedido(StatusPedido.READY);
      pedido.alterarStatus(StatusPedido.CANCELLED);
      expect(pedido.status).toEqual(StatusPedido.CANCELLED);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Fluxos de rejeição
  // ═══════════════════════════════════════════════════════════════

  describe('Fluxos de rejeição (restaurante recusa)', () => {
    it('paid → rejected', () => {
      const pedido = criarPedido(StatusPedido.PAID);
      pedido.alterarStatus(StatusPedido.REJECTED);
      expect(pedido.status).toEqual(StatusPedido.REJECTED);
    });

    it('received → rejected', () => {
      const pedido = criarPedido(StatusPedido.RECEIVED);
      pedido.alterarStatus(StatusPedido.REJECTED);
      expect(pedido.status).toEqual(StatusPedido.REJECTED);
    });

    it('preparing → rejected', () => {
      const pedido = criarPedido(StatusPedido.PREPARING);
      pedido.alterarStatus(StatusPedido.REJECTED);
      expect(pedido.status).toEqual(StatusPedido.REJECTED);
    });

    it('ready → rejected', () => {
      const pedido = criarPedido(StatusPedido.READY);
      pedido.alterarStatus(StatusPedido.REJECTED);
      expect(pedido.status).toEqual(StatusPedido.REJECTED);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Fluxo de reembolso
  // ═══════════════════════════════════════════════════════════════

  describe('Fluxo de reembolso', () => {
    it('paid → refunded (estorno após pagamento)', () => {
      const pedido = criarPedido(StatusPedido.PAID);
      pedido.alterarStatus(StatusPedido.REFUNDED);
      expect(pedido.status).toEqual(StatusPedido.REFUNDED);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Transições INVÁLIDAS — devem lançar erro
  // ═══════════════════════════════════════════════════════════════

  describe('Transições inválidas (devem lançar erro)', () => {
    it('pending_payment → preparing é inválido (pula paid)', () => {
      const pedido = criarPedido(StatusPedido.PENDING_PAYMENT);
      expect(() => pedido.alterarStatus(StatusPedido.PREPARING)).toThrow();
    });

    it('pending_payment → ready é inválido', () => {
      const pedido = criarPedido(StatusPedido.PENDING_PAYMENT);
      expect(() => pedido.alterarStatus(StatusPedido.READY)).toThrow();
    });

    it('pending_payment → delivered é inválido', () => {
      const pedido = criarPedido(StatusPedido.PENDING_PAYMENT);
      expect(() => pedido.alterarStatus(StatusPedido.DELIVERED)).toThrow();
    });

    it('pending_payment → received é inválido (pula paid)', () => {
      const pedido = criarPedido(StatusPedido.PENDING_PAYMENT);
      expect(() => pedido.alterarStatus(StatusPedido.RECEIVED)).toThrow();
    });

    it('paid → preparing é inválido (pula received)', () => {
      const pedido = criarPedido(StatusPedido.PAID);
      expect(() => pedido.alterarStatus(StatusPedido.PREPARING)).toThrow();
    });

    it('paid → ready é inválido', () => {
      const pedido = criarPedido(StatusPedido.PAID);
      expect(() => pedido.alterarStatus(StatusPedido.READY)).toThrow();
    });

    it('paid → delivered é inválido', () => {
      const pedido = criarPedido(StatusPedido.PAID);
      expect(() => pedido.alterarStatus(StatusPedido.DELIVERED)).toThrow();
    });

    it('paid → pending_payment é inválido', () => {
      const pedido = criarPedido(StatusPedido.PAID);
      expect(() => pedido.alterarStatus(StatusPedido.PENDING_PAYMENT)).toThrow();
    });

    it('received → paid é inválido (não pode voltar)', () => {
      const pedido = criarPedido(StatusPedido.RECEIVED);
      expect(() => pedido.alterarStatus(StatusPedido.PAID)).toThrow();
    });

    it('preparing → paid é inválido', () => {
      const pedido = criarPedido(StatusPedido.PREPARING);
      expect(() => pedido.alterarStatus(StatusPedido.PAID)).toThrow();
    });

    it('preparing → received é inválido', () => {
      const pedido = criarPedido(StatusPedido.PREPARING);
      expect(() => pedido.alterarStatus(StatusPedido.RECEIVED)).toThrow();
    });

    it('ready → preparing é inválido', () => {
      const pedido = criarPedido(StatusPedido.READY);
      expect(() => pedido.alterarStatus(StatusPedido.PREPARING)).toThrow();
    });

    it('ready → paid é inválido', () => {
      const pedido = criarPedido(StatusPedido.READY);
      expect(() => pedido.alterarStatus(StatusPedido.PAID)).toThrow();
    });

    it('delivered → any é inválido (estado terminal)', () => {
      const pedido = criarPedido(StatusPedido.DELIVERED);
      expect(() => pedido.alterarStatus(StatusPedido.PAID)).toThrow();
      expect(() => pedido.alterarStatus(StatusPedido.CANCELLED)).toThrow();
      expect(() => pedido.alterarStatus(StatusPedido.REJECTED)).toThrow();
    });

    it('cancelled → any é inválido (estado terminal)', () => {
      const pedido = criarPedido(StatusPedido.CANCELLED);
      expect(() => pedido.alterarStatus(StatusPedido.PAID)).toThrow();
      expect(() => pedido.alterarStatus(StatusPedido.PENDING_PAYMENT)).toThrow();
    });

    it('payment_failed → any é inválido (estado terminal)', () => {
      const pedido = criarPedido(StatusPedido.PAYMENT_FAILED);
      expect(() => pedido.alterarStatus(StatusPedido.PAID)).toThrow();
      expect(() => pedido.alterarStatus(StatusPedido.PENDING_PAYMENT)).toThrow();
    });

    it('refunded → any é inválido (estado terminal)', () => {
      const pedido = criarPedido(StatusPedido.REFUNDED);
      expect(() => pedido.alterarStatus(StatusPedido.PAID)).toThrow();
    });

    it('rejected → any é inválido (estado terminal)', () => {
      const pedido = criarPedido(StatusPedido.REJECTED);
      expect(() => pedido.alterarStatus(StatusPedido.PAID)).toThrow();
      expect(() => pedido.alterarStatus(StatusPedido.RECEIVED)).toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Não alterar se status é o mesmo
  // ═══════════════════════════════════════════════════════════════

  describe('Não altera se status é o mesmo', () => {
    it('não lança erro e não altera updatedAt quando status é idêntico', () => {
      const pedido = criarPedido(StatusPedido.PAID);
      const updatedAtAntes = pedido.updatedAt;

      pedido.alterarStatus(StatusPedido.PAID);

      expect(pedido.status).toEqual(StatusPedido.PAID);
      expect(pedido.updatedAt).toEqual(updatedAtAntes);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Mensagem de erro da FSM
  // ═══════════════════════════════════════════════════════════════

  describe('Mensagem de erro da FSM', () => {
    it('inclui o status atual e o desejado na mensagem', () => {
      const pedido = criarPedido(StatusPedido.PENDING_PAYMENT);
      try {
        pedido.alterarStatus(StatusPedido.PREPARING);
        expect.fail('Deveria ter lançado erro');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        expect(msg).toContain('pending_payment');
        expect(msg).toContain('preparing');
      }
    });
  });
});
