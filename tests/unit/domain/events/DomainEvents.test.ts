import { describe, it, expect } from 'vitest'
import { RestauranteCriadoEvent } from '@/domain/admin/events/RestauranteCriadoEvent'
import { RestauranteAtualizadoEvent } from '@/domain/admin/events/RestauranteAtualizadoEvent'
import { RestauranteDesativadoEvent } from '@/domain/admin/events/RestauranteDesativadoEvent'
import { UsuarioVinculadoRestauranteEvent } from '@/domain/admin/events/UsuarioVinculadoRestauranteEvent'
import { UsuarioDesvinculadoRestauranteEvent } from '@/domain/admin/events/UsuarioDesvinculadoRestauranteEvent'
import { CardapioAtualizadoEvent } from '@/domain/admin/events/CardapioAtualizadoEvent'
import { MesaCriadaEvent } from '@/domain/mesa/events/MesaCriadaEvent'
import { MesaDesativadaEvent } from '@/domain/mesa/events/MesaDesativadaEvent'
import { SessaoCriadaEvent } from '@/domain/autenticacao/events/SessaoCriadaEvent'
import { SessaoExpiradaEvent } from '@/domain/autenticacao/events/SessaoExpiradaEvent'
import { UsuarioCriadoEvent } from '@/domain/autenticacao/events/UsuarioCriadoEvent'
import { PedidoCriadoEvent } from '@/domain/pedido/events/PedidoCriadoEvent'
import { PedidoStatusAlteradoEvent } from '@/domain/pedido/events/PedidoStatusAlteradoEvent'

describe('Domain Events', () => {
  describe('RestauranteCriadoEvent', () => {
    it('deve criar evento com props e occurredOn', () => {
      const before = new Date()
      const event = new RestauranteCriadoEvent({
        restauranteId: 'rest-123',
        nome: 'Restaurante Teste',
        proprietarioId: 'user-456',
      })
      const after = new Date()

      expect(event.props.restauranteId).toBe('rest-123')
      expect(event.props.nome).toBe('Restaurante Teste')
      expect(event.props.proprietarioId).toBe('user-456')
      expect(event.eventType).toBe('RestauranteCriado')
      expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('RestauranteAtualizadoEvent', () => {
    it('deve criar evento com props corretos', () => {
      const event = new RestauranteAtualizadoEvent({
        restauranteId: 'rest-123',
        nome: 'Nome Atualizado',
      })

      expect(event.props.restauranteId).toBe('rest-123')
      expect(event.props.nome).toBe('Nome Atualizado')
      expect(event.eventType).toBe('RestauranteAtualizado')
    })
  })

  describe('RestauranteDesativadoEvent', () => {
    it('deve criar evento com props corretos', () => {
      const event = new RestauranteDesativadoEvent({
        restauranteId: 'rest-123',
      })

      expect(event.props.restauranteId).toBe('rest-123')
      expect(event.eventType).toBe('RestauranteDesativado')
    })
  })

  describe('UsuarioVinculadoRestauranteEvent', () => {
    it('deve criar evento com props corretos', () => {
      const event = new UsuarioVinculadoRestauranteEvent({
        usuarioId: 'user-123',
        restauranteId: 'rest-456',
        papel: 'gerente',
      })

      expect(event.props.usuarioId).toBe('user-123')
      expect(event.props.restauranteId).toBe('rest-456')
      expect(event.props.papel).toBe('gerente')
      expect(event.eventType).toBe('UsuarioVinculadoRestaurante')
    })
  })

  describe('UsuarioDesvinculadoRestauranteEvent', () => {
    it('deve criar evento com props corretos', () => {
      const event = new UsuarioDesvinculadoRestauranteEvent({
        usuarioId: 'user-123',
        restauranteId: 'rest-456',
      })

      expect(event.props.usuarioId).toBe('user-123')
      expect(event.props.restauranteId).toBe('rest-456')
      expect(event.eventType).toBe('UsuarioDesvinculadoRestaurante')
    })
  })

  describe('CardapioAtualizadoEvent', () => {
    it('deve criar evento com props corretos', () => {
      const event = new CardapioAtualizadoEvent({
        restauranteId: 'rest-123',
        categoriaId: 'cat-456',
      })

      expect(event.props.restauranteId).toBe('rest-123')
      expect(event.props.categoriaId).toBe('cat-456')
      expect(event.eventType).toBe('CardapioAtualizado')
    })

    it('deve criar evento sem categoriaId', () => {
      const event = new CardapioAtualizadoEvent({
        restauranteId: 'rest-123',
      })

      expect(event.props.restauranteId).toBe('rest-123')
      expect(event.props.categoriaId).toBeUndefined()
    })
  })

  describe('MesaCriadaEvent', () => {
    it('deve existir', () => {
      expect(MesaCriadaEvent).toBeDefined()
      expect(typeof MesaCriadaEvent).toBe('function')
    })
  })

  describe('MesaDesativadaEvent', () => {
    it('deve existir', () => {
      expect(MesaDesativadaEvent).toBeDefined()
      expect(typeof MesaDesativadaEvent).toBe('function')
    })
  })

  describe('SessaoCriadaEvent', () => {
    it('deve existir', () => {
      expect(SessaoCriadaEvent).toBeDefined()
      expect(typeof SessaoCriadaEvent).toBe('function')
    })
  })

  describe('SessaoExpiradaEvent', () => {
    it('deve criar evento com props corretos', () => {
      const event = new SessaoExpiradaEvent('sessao-123', 'user-456')

      expect(event.sessaoId).toBe('sessao-123')
      expect(event.usuarioId).toBe('user-456')
      expect(event.eventType).toBe('SessaoExpiradaEvent')
    })
  })

  describe('UsuarioCriadoEvent', () => {
    it('deve existir', () => {
      expect(UsuarioCriadoEvent).toBeDefined()
      expect(typeof UsuarioCriadoEvent).toBe('function')
    })
  })

  describe('PedidoCriadoEvent', () => {
    it('deve existir', () => {
      expect(PedidoCriadoEvent).toBeDefined()
      expect(typeof PedidoCriadoEvent).toBe('function')
    })
  })

  describe('PedidoStatusAlteradoEvent', () => {
    it('deve existir', () => {
      expect(PedidoStatusAlteradoEvent).toBeDefined()
      expect(typeof PedidoStatusAlteradoEvent).toBe('function')
    })
  })
})
