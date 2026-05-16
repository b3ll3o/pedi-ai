import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventDispatcher } from '@/domain/shared/events/EventDispatcher'
import { DomainEvent } from '@/domain/shared/events/DomainEvent'

class TestEvent implements DomainEvent {
  constructor(
    public readonly occurredOn: Date,
    public readonly eventType: string = 'TestEvent'
  ) {}
}

describe('EventDispatcher', () => {
  beforeEach(() => {
    // Limpar instância antes de cada teste
    EventDispatcher.getInstance().clear()
  })

  describe('getInstance', () => {
    it('deve retornar a mesma instância', () => {
      const instance1 = EventDispatcher.getInstance()
      const instance2 = EventDispatcher.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('deve criar nova instância se não existir', () => {
      const instance = EventDispatcher.getInstance()
      expect(instance).toBeInstanceOf(EventDispatcher)
    })
  })

  describe('register', () => {
    it('deve registrar handler para novo tipo de evento', () => {
      const dispatcher = EventDispatcher.getInstance()
      const handler = vi.fn()

      dispatcher.register('TestEvent', handler)

      const event = new TestEvent(new Date())
      dispatcher.dispatch(event)

      expect(handler).toHaveBeenCalledWith(event)
    })

    it('deve registrar múltiplos handlers para mesmo tipo de evento', () => {
      const dispatcher = EventDispatcher.getInstance()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      dispatcher.register('TestEvent', handler1)
      dispatcher.register('TestEvent', handler2)

      const event = new TestEvent(new Date())
      dispatcher.dispatch(event)

      expect(handler1).toHaveBeenCalledWith(event)
      expect(handler2).toHaveBeenCalledWith(event)
    })

    it('deve permitir registrar handlers para diferentes tipos de eventos', () => {
      const dispatcher = EventDispatcher.getInstance()
      const handlerA = vi.fn()
      const handlerB = vi.fn()

      dispatcher.register('EventA', handlerA)
      dispatcher.register('EventB', handlerB)

      const eventA = new TestEvent(new Date(), 'EventA')
      const eventB = new TestEvent(new Date(), 'EventB')

      dispatcher.dispatch(eventA)
      dispatcher.dispatch(eventB)

      expect(handlerA).toHaveBeenCalledWith(eventA)
      expect(handlerB).toHaveBeenCalledWith(eventB)
    })
  })

  describe('dispatch', () => {
    it('deve dispatchar evento para handlers registrados', () => {
      const dispatcher = EventDispatcher.getInstance()
      const handler = vi.fn()

      dispatcher.register('PedidoCriadoEvent', handler)

      const event = new TestEvent(new Date(), 'PedidoCriadoEvent')
      dispatcher.dispatch(event)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(event)
    })

    it('deve não fazer nada se não houver handlers registrados', () => {
      const dispatcher = EventDispatcher.getInstance()
      const event = new TestEvent(new Date(), 'SemHandler')

      expect(() => dispatcher.dispatch(event)).not.toThrow()
    })

    it('deve passar a data correta do evento', () => {
      const dispatcher = EventDispatcher.getInstance()
      const handler = vi.fn()
      const date = new Date('2024-01-15')

      dispatcher.register('TestEvent', handler)

      const event = new TestEvent(date)
      dispatcher.dispatch(event)

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ occurredOn: date }))
    })
  })

  describe('clear', () => {
    it('deve remover todos os handlers', () => {
      const dispatcher = EventDispatcher.getInstance()
      const handler = vi.fn()

      dispatcher.register('TestEvent', handler)
      dispatcher.clear()

      const event = new TestEvent(new Date(), 'TestEvent')
      dispatcher.dispatch(event)

      expect(handler).not.toHaveBeenCalled()
    })

    it('deve permitir registrar novos handlers após clear', () => {
      const dispatcher = EventDispatcher.getInstance()
      const handler = vi.fn()

      dispatcher.register('TestEvent', handler)
      dispatcher.clear()
      dispatcher.register('TestEvent', handler)

      const event = new TestEvent(new Date(), 'TestEvent')
      dispatcher.dispatch(event)

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })
})
