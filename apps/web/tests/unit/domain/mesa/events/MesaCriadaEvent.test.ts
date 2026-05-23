import { describe, it, expect } from 'vitest';
import { MesaCriadaEvent } from '@/domain/mesa/events/MesaCriadaEvent';
import { Mesa } from '@/domain/mesa/entities/Mesa';
import { QRCodePayload } from '@/domain/mesa/value-objects/QRCodePayload';

describe('MesaCriadaEvent', () => {
  it('deve criar evento com data atual se nao fornecida', () => {
    const mesa = criarMesa();
    const event = new MesaCriadaEvent(mesa);

    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.eventType).toBe('MesaCriadaEvent');
    expect(event.mesa).toBe(mesa);
  });

  it('deve usar data fornecida', () => {
    const mesa = criarMesa();
    const dataPersonalizada = new Date('2024-01-01');
    const event = new MesaCriadaEvent(mesa, dataPersonalizada);

    expect(event.occurredOn).toEqual(dataPersonalizada);
  });
});

function criarMesa(): Mesa {
  return Mesa.criar({
    id: 'mesa-1',
    label: 'Mesa 1',
    restauranteId: 'rest-1',
    ativo: true,
    qrCodePayload: QRCodePayload.reconstruir({
      restauranteId: 'rest-1',
      mesaId: 'mesa-1',
      assinatura: 'test',
    }),
  });
}