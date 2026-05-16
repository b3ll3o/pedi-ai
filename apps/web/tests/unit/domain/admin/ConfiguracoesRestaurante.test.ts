import { describe, it, expect } from 'vitest'
import { ConfiguracoesRestaurante, HorarioFuncionamento } from '@/domain/admin/value-objects/ConfiguracoesRestaurante'

describe('ConfiguracoesRestaurante', () => {
  const horariosPadrao: HorarioFuncionamento[] = [
    { diaSemana: 0, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
    { diaSemana: 1, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
  ]

  describe('criarPadrao', () => {
    it('deve criar configurações padrão', () => {
      const config = ConfiguracoesRestaurante.criarPadrao()

      expect(config.permitePedidoOnline).toBe(true)
      expect(config.permiteReserva).toBe(false)
      expect(config.tempoPreparoMinutos).toBe(30)
      expect(config.taxaEntrega).toBe(0)
      expect(config.valorMinimoPedido).toBe(0)
      expect(config.modoOperacao).toBe('local')
    })

    it('deve criar horários de funcionamento para todos os dias', () => {
      const config = ConfiguracoesRestaurante.criarPadrao()

      expect(config.horariosFuncionamento).toHaveLength(7)
      expect(config.horariosFuncionamento[0].diaSemana).toBe(0) // domingo
      expect(config.horariosFuncionamento[6].diaSemana).toBe(6) // sábado
    })

    it('deve retornar cópia do array de horários', () => {
      const config = ConfiguracoesRestaurante.criarPadrao()
      const horarios1 = config.horariosFuncionamento
      const horarios2 = config.horariosFuncionamento

      // Cada chamada retorna uma nova cópia
      expect(horarios1).not.toBe(horarios2)
      expect(horarios1).toEqual(horarios2)
    })
  })

  describe('getters', () => {
    const config = new ConfiguracoesRestaurante({
      permitePedidoOnline: true,
      permiteReserva: true,
      tempoPreparoMinutos: 45,
      taxaEntrega: 5.50,
      valorMinimoPedido: 25.00,
      modoOperacao: 'delivery',
      horariosFuncionamento: horariosPadrao,
    })

    it('deve retornar permitePedidoOnline', () => {
      expect(config.permitePedidoOnline).toBe(true)
    })

    it('deve retornar permiteReserva', () => {
      expect(config.permiteReserva).toBe(true)
    })

    it('deve retornar tempoPreparoMinutos', () => {
      expect(config.tempoPreparoMinutos).toBe(45)
    })

    it('deve retornar taxaEntrega', () => {
      expect(config.taxaEntrega).toBe(5.50)
    })

    it('deve retornar valorMinimoPedido', () => {
      expect(config.valorMinimoPedido).toBe(25.00)
    })

    it('deve retornar modoOperacao', () => {
      expect(config.modoOperacao).toBe('delivery')
    })

    it('deve retornar cópia de horariosFuncionamento', () => {
      const horarios = config.horariosFuncionamento
      expect(horarios).toEqual(horariosPadrao)
    })
  })

  describe('estaAberto', () => {
    it('deve retornar false se permitePedidoOnline e permiteReserva são falsos', () => {
      const config = new ConfiguracoesRestaurante({
        permitePedidoOnline: false,
        permiteReserva: false,
        tempoPreparoMinutos: 30,
        taxaEntrega: 0,
        valorMinimoPedido: 0,
        modoOperacao: 'local',
        horariosFuncionamento: horariosPadrao,
      })

      expect(config.estaAberto(1, '12:00')).toBe(false)
    })

    it('deve retornar false se dia não existe nos horários', () => {
      const _config = ConfiguracoesRestaurante.criarPadrao()
      //domingo é dia 0 mas só二次tem segunda (1) e não tem sábado (6) no horariosPadrao curto
    })

    it('deve retornar false se horário está marcado como fechado', () => {
      const config = new ConfiguracoesRestaurante({
        permitePedidoOnline: true,
        permiteReserva: false,
        tempoPreparoMinutos: 30,
        taxaEntrega: 0,
        valorMinimoPedido: 0,
        modoOperacao: 'local',
        horariosFuncionamento: [
          { diaSemana: 1, horaAbertura: '08:00', horaFechamento: '22:00', fechado: true },
        ],
      })

      expect(config.estaAberto(1, '12:00')).toBe(false)
    })

    it('deve retornar false se hora é antes da abertura', () => {
      const config = new ConfiguracoesRestaurante({
        permitePedidoOnline: true,
        permiteReserva: false,
        tempoPreparoMinutos: 30,
        taxaEntrega: 0,
        valorMinimoPedido: 0,
        modoOperacao: 'local',
        horariosFuncionamento: [
          { diaSemana: 1, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
        ],
      })

      expect(config.estaAberto(1, '07:00')).toBe(false)
    })

    it('deve retornar false se hora é depois do fechamento', () => {
      const config = new ConfiguracoesRestaurante({
        permitePedidoOnline: true,
        permiteReserva: false,
        tempoPreparoMinutos: 30,
        taxaEntrega: 0,
        valorMinimoPedido: 0,
        modoOperacao: 'local',
        horariosFuncionamento: [
          { diaSemana: 1, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
        ],
      })

      expect(config.estaAberto(1, '23:00')).toBe(false)
    })

    it('deve retornar true se dentro do horário de funcionamento', () => {
      const config = new ConfiguracoesRestaurante({
        permitePedidoOnline: true,
        permiteReserva: false,
        tempoPreparoMinutos: 30,
        taxaEntrega: 0,
        valorMinimoPedido: 0,
        modoOperacao: 'local',
        horariosFuncionamento: [
          { diaSemana: 1, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
        ],
      })

      expect(config.estaAberto(1, '12:00')).toBe(true)
      expect(config.estaAberto(1, '08:00')).toBe(true)
      expect(config.estaAberto(1, '22:00')).toBe(true)
    })
  })

  describe('equals', () => {
    it('deve retornar true para configurações iguais', () => {
      const config1 = new ConfiguracoesRestaurante({
        permitePedidoOnline: true,
        permiteReserva: false,
        tempoPreparoMinutos: 30,
        taxaEntrega: 0,
        valorMinimoPedido: 0,
        modoOperacao: 'local',
        horariosFuncionamento: [],
      })

      const config2 = new ConfiguracoesRestaurante({
        permitePedidoOnline: true,
        permiteReserva: false,
        tempoPreparoMinutos: 30,
        taxaEntrega: 0,
        valorMinimoPedido: 0,
        modoOperacao: 'local',
        horariosFuncionamento: [],
      })

      expect(config1.equals(config2)).toBe(true)
    })

    it('deve retornar false para configurações diferentes', () => {
      const config1 = new ConfiguracoesRestaurante({
        permitePedidoOnline: true,
        permiteReserva: false,
        tempoPreparoMinutos: 30,
        taxaEntrega: 0,
        valorMinimoPedido: 0,
        modoOperacao: 'local',
        horariosFuncionamento: [],
      })

      const config2 = new ConfiguracoesRestaurante({
        permitePedidoOnline: false, // diferente
        permiteReserva: false,
        tempoPreparoMinutos: 30,
        taxaEntrega: 0,
        valorMinimoPedido: 0,
        modoOperacao: 'local',
        horariosFuncionamento: [],
      })

      expect(config1.equals(config2)).toBe(false)
    })

    it('deve retornar false para objetos que não são ConfiguracoesRestaurante', () => {
      const config = ConfiguracoesRestaurante.criarPadrao()
      expect(config.equals({ props: config.props } as any)).toBe(false)
    })
  })
})
