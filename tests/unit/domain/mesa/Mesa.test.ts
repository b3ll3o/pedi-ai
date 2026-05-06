import { describe, it, expect } from 'vitest'
import { Mesa } from '@/domain/mesa/entities/Mesa'
import { QRCodePayload } from '@/domain/mesa/value-objects/QRCodePayload'

describe('Mesa', () => {
  const criarQRCodePayload = (overrides?: Partial<{ restauranteId: string; mesaId: string; assinatura: string }>) => {
    return QRCodePayload.reconstruir({
      restauranteId: overrides?.restauranteId ?? 'rest-123',
      mesaId: overrides?.mesaId ?? 'mesa-456',
      assinatura: overrides?.assinatura ?? 'hmac-signature',
    })
  }

  const criarMesa = (props?: {
    id?: string
    restauranteId?: string
    label?: string
    ativo?: boolean
  }) => {
    return Mesa.criar({
      id: props?.id ?? 'mesa-1',
      restauranteId: props?.restauranteId ?? 'rest-1',
      label: props?.label ?? 'Mesa 1',
      qrCodePayload: criarQRCodePayload(),
      ativo: props?.ativo ?? true,
    })
  }

  describe('criar', () => {
    it('deve criar uma mesa com ID e datas', () => {
      const mesa = criarMesa()

      expect(mesa.id).toBeDefined()
      expect(mesa.restauranteId).toBe('rest-1')
      expect(mesa.label).toBe('Mesa 1')
      expect(mesa.ativo).toBe(true)
      expect(mesa.qrCodePayload).toBeInstanceOf(QRCodePayload)
      expect(mesa.createdAt).toBeInstanceOf(Date)
      expect(mesa.updatedAt).toBeInstanceOf(Date)
    })

    it('deve criar mesa inativa quando ativo é false', () => {
      const mesa = criarMesa({ ativo: false })

      expect(mesa.ativo).toBe(false)
    })

    it('deve criar mesa com label customizado', () => {
      const mesa = criarMesa({ label: 'Área VIP' })

      expect(mesa.label).toBe('Área VIP')
    })
  })

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const mesa1 = criarMesa({ id: 'mesa-1' })
      const mesa2 = Mesa.criar({
        id: 'mesa-1',
        restauranteId: 'rest-2',
        label: 'Different',
        qrCodePayload: criarQRCodePayload(),
        ativo: false,
      })

      expect(mesa1.equals(mesa2)).toBe(true)
    })

    it('deve ser diferente quando IDs são diferentes', () => {
      const mesa1 = criarMesa({ id: 'mesa-1' })
      const mesa2 = criarMesa({ id: 'mesa-2' })

      expect(mesa1.equals(mesa2)).toBe(false)
    })

    it('deve retornar false para objetos que não são Mesa', () => {
      const mesa = criarMesa()

      expect(mesa.equals({ props: mesa.props } as any)).toBe(false)
    })
  })

  describe('desativar', () => {
    it('deve desativar mesa ativa', () => {
      const mesa = criarMesa({ ativo: true })

      mesa.desativar()

      expect(mesa.ativo).toBe(false)
    })

    it('não deve alterar se já está desativada', () => {
      const mesa = criarMesa({ ativo: false })
      const updatedAtOriginal = mesa.updatedAt

      mesa.desativar()

      expect(mesa.ativo).toBe(false)
      expect(mesa.updatedAt).toEqual(updatedAtOriginal)
    })

    it('deve atualizar updatedAt ao desativar', () => {
      const mesa = criarMesa({ ativo: true })
      const createdAt = mesa.createdAt

      mesa.desativar()

      expect(mesa.updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime())
    })
  })

  describe('ativar', () => {
    it('deve ativar mesa inativa', () => {
      const mesa = criarMesa({ ativo: false })

      mesa.ativar()

      expect(mesa.ativo).toBe(true)
    })

    it('não deve alterar se já está ativa', () => {
      const mesa = criarMesa({ ativo: true })
      const updatedAtOriginal = mesa.updatedAt

      mesa.ativar()

      expect(mesa.ativo).toBe(true)
      expect(mesa.updatedAt).toEqual(updatedAtOriginal)
    })

    it('deve atualizar updatedAt ao ativar', () => {
      const mesa = criarMesa({ ativo: false })
      const createdAt = mesa.createdAt

      mesa.ativar()

      expect(mesa.updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime())
    })
  })

  describe('atualizarLabel', () => {
    it('deve atualizar label da mesa', () => {
      const mesa = criarMesa({ label: 'Mesa 1' })

      mesa.atualizarLabel('Terraço')

      expect(mesa.label).toBe('Terraço')
    })

    it('não deve alterar se label é o mesmo', () => {
      const mesa = criarMesa({ label: 'Mesa 1' })
      const updatedAtOriginal = mesa.updatedAt

      mesa.atualizarLabel('Mesa 1')

      expect(mesa.label).toBe('Mesa 1')
      expect(mesa.updatedAt).toEqual(updatedAtOriginal)
    })

    it('deve atualizar updatedAt ao alterar label', () => {
      const mesa = criarMesa({ label: 'Mesa 1' })
      const createdAt = mesa.createdAt

      mesa.atualizarLabel('Novo Label')

      expect(mesa.updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime())
    })
  })

  describe('getters', () => {
    it('deve retornar restauranteId', () => {
      const mesa = criarMesa({ restauranteId: 'rest-test' })

      expect(mesa.restauranteId).toBe('rest-test')
    })

    it('deve retornar label', () => {
      const mesa = criarMesa({ label: 'Label Teste' })

      expect(mesa.label).toBe('Label Teste')
    })

    it('deve retornar qrCodePayload', () => {
      const qrPayload = criarQRCodePayload()
      const mesa = Mesa.criar({
        id: 'mesa-1',
        restauranteId: 'rest-1',
        label: 'Mesa 1',
        qrCodePayload: qrPayload,
        ativo: true,
      })

      expect(mesa.qrCodePayload).toBe(qrPayload)
    })

    it('deve retornar createdAt', () => {
      const mesa = criarMesa()

      expect(mesa.createdAt).toBeInstanceOf(Date)
    })

    it('deve retornar updatedAt', () => {
      const mesa = criarMesa()

      expect(mesa.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('edge cases', () => {
    it('deve permitir label com caracteres especiais', () => {
      const mesa = criarMesa({ label: 'Mesa #5 - "Área Externa"' })

      expect(mesa.label).toBe('Mesa #5 - "Área Externa"')
    })

    it('deve permitir label vazio após atualização', () => {
      const mesa = criarMesa({ label: 'Mesa 1' })

      mesa.atualizarLabel('')

      expect(mesa.label).toBe('')
    })
  })
})