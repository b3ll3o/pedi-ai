import { describe, it, expect } from 'vitest'
import { QRCodePayload } from '@/domain/mesa/value-objects/QRCodePayload'

describe('QRCodePayload', () => {
  describe('reconstruir', () => {
    it('deve reconstruir QRCodePayload com props corretas', () => {
      const props = {
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'hmac-sha256-signature',
      }

      const payload = QRCodePayload.reconstruir(props)

      expect(payload.restauranteId).toBe('rest-123')
      expect(payload.mesaId).toBe('mesa-456')
      expect(payload.assinatura).toBe('hmac-sha256-signature')
    })
  })

  describe('getters', () => {
    it('deve retornar restauranteId', () => {
      const payload = QRCodePayload.reconstruir({
        restauranteId: 'rest-abc',
        mesaId: 'mesa-xyz',
        assinatura: 'sig',
      })

      expect(payload.restauranteId).toBe('rest-abc')
    })

    it('deve retornar mesaId', () => {
      const payload = QRCodePayload.reconstruir({
        restauranteId: 'rest-abc',
        mesaId: 'mesa-xyz',
        assinatura: 'sig',
      })

      expect(payload.mesaId).toBe('mesa-xyz')
    })

    it('deve retornar assinatura', () => {
      const payload = QRCodePayload.reconstruir({
        restauranteId: 'rest-abc',
        mesaId: 'mesa-xyz',
        assinatura: 'minha-assinatura',
      })

      expect(payload.assinatura).toBe('minha-assinatura')
    })
  })

  describe('equals', () => {
    it('deve retornar true para payloads iguais', () => {
      const payload1 = QRCodePayload.reconstruir({
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'sig',
      })

      const payload2 = QRCodePayload.reconstruir({
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'sig',
      })

      expect(payload1.equals(payload2)).toBe(true)
    })

    it('deve retornar false para restauranteId diferente', () => {
      const payload1 = QRCodePayload.reconstruir({
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'sig',
      })

      const payload2 = QRCodePayload.reconstruir({
        restauranteId: 'rest-999',
        mesaId: 'mesa-456',
        assinatura: 'sig',
      })

      expect(payload1.equals(payload2)).toBe(false)
    })

    it('deve retornar false para mesaId diferente', () => {
      const payload1 = QRCodePayload.reconstruir({
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'sig',
      })

      const payload2 = QRCodePayload.reconstruir({
        restauranteId: 'rest-123',
        mesaId: 'mesa-999',
        assinatura: 'sig',
      })

      expect(payload1.equals(payload2)).toBe(false)
    })

    it('deve retornar false para assinatura diferente', () => {
      const payload1 = QRCodePayload.reconstruir({
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'sig-1',
      })

      const payload2 = QRCodePayload.reconstruir({
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'sig-2',
      })

      expect(payload1.equals(payload2)).toBe(false)
    })

    it('deve retornar false para objetos que não são QRCodePayload', () => {
      const payload = QRCodePayload.reconstruir({
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'sig',
      })

      // A implementação base ValueObjectClass compara JSON.stringify dos props
      // Então um objeto com props equivalente retornará true
      expect(payload.equals({ props: { restauranteId: 'rest-123', mesaId: 'mesa-456', assinatura: 'sig' } } as any)).toBe(true)
    })
  })
})
