import { describe, it, expect } from 'vitest';
import { ConfiguracoesRestaurante } from '@/domain/admin/value-objects/ConfiguracoesRestaurante';

describe('ConfiguracoesRestaurante', () => {
  const horariosValidos = [
    { diaSemana: 0, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
    { diaSemana: 1, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
    { diaSemana: 2, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
    { diaSemana: 3, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
    { diaSemana: 4, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
    { diaSemana: 5, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
    { diaSemana: 6, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
  ];

  const criarConfigValida = () => ({
    permitePedidoOnline: true,
    permiteReserva: false,
    tempoPreparoMinutos: 30,
    taxaEntrega: 5.0,
    valorMinimoPedido: 10.0,
    modoOperacao: 'local' as const,
    horariosFuncionamento: horariosValidos,
  });

  describe('getters', () => {
    it('deve retornar valores corretos para props', () => {
      const config = new ConfiguracoesRestaurante(criarConfigValida());

      expect(config.permitePedidoOnline).toBe(true);
      expect(config.permiteReserva).toBe(false);
      expect(config.tempoPreparoMinutos).toBe(30);
      expect(config.taxaEntrega).toBe(5.0);
      expect(config.valorMinimoPedido).toBe(10.0);
      expect(config.modoOperacao).toBe('local');
      expect(config.horariosFuncionamento).toHaveLength(7);
    });

    it('deve retornar cópia de horariosFuncionamento', () => {
      const config = new ConfiguracoesRestaurante(criarConfigValida());
      const horarios = config.horariosFuncionamento;

      horarios.push({
        diaSemana: 7,
        horaAbertura: '09:00',
        horaFechamento: '23:00',
        fechado: false,
      });

      expect(config.horariosFuncionamento).toHaveLength(7);
    });
  });

  describe('equals', () => {
    it('deve retornar true para configurações idênticas', () => {
      const config1 = new ConfiguracoesRestaurante(criarConfigValida());
      const config2 = new ConfiguracoesRestaurante(criarConfigValida());

      expect(config1.equals(config2)).toBe(true);
    });

    it('deve retornar false para configurações diferentes', () => {
      const config1 = new ConfiguracoesRestaurante(criarConfigValida());
      const config2 = new ConfiguracoesRestaurante({
        ...criarConfigValida(),
        permitePedidoOnline: false,
      });

      expect(config1.equals(config2)).toBe(false);
    });

    it('deve retornar false para objeto que não é ConfiguracoesRestaurante', () => {
      const config = new ConfiguracoesRestaurante(criarConfigValida());

      expect(config.equals({ permitePedidoOnline: true } as any)).toBe(false);
    });
  });

  describe('estaAberto', () => {
    it('deve retornar true quando está dentro do horário', () => {
      const config = new ConfiguracoesRestaurante(criarConfigValida());

      expect(config.estaAberto(1, '10:00')).toBe(true);
    });

    it('deve retornar false quando está fora do horário de abertura', () => {
      const config = new ConfiguracoesRestaurante(criarConfigValida());

      expect(config.estaAberto(1, '07:00')).toBe(false);
    });

    it('deve retornar false quando está fora do horário de fechamento', () => {
      const config = new ConfiguracoesRestaurante(criarConfigValida());

      expect(config.estaAberto(1, '23:00')).toBe(false);
    });

    it('deve retornar false quando permitePedidoOnline e permiteReserva são false', () => {
      const config = new ConfiguracoesRestaurante({
        ...criarConfigValida(),
        permitePedidoOnline: false,
        permiteReserva: false,
      });

      expect(config.estaAberto(1, '10:00')).toBe(false);
    });

    it('deve retornar false quando dia está fechado', () => {
      const horariosComDomingoFechado = [...horariosValidos];
      horariosComDomingoFechado[0] = {
        diaSemana: 0,
        horaAbertura: '08:00',
        horaFechamento: '22:00',
        fechado: true,
      };
      const config = new ConfiguracoesRestaurante({
        ...criarConfigValida(),
        horariosFuncionamento: horariosComDomingoFechado,
      });

      expect(config.estaAberto(0, '10:00')).toBe(false);
    });

    it('deve retornar false quando horário não existe para o dia', () => {
      const horariosIncompletos = horariosValidos.slice(1); // só segunda a sábado
      const config = new ConfiguracoesRestaurante({
        ...criarConfigValida(),
        horariosFuncionamento: horariosIncompletos,
      });

      expect(config.estaAberto(0, '10:00')).toBe(false);
    });
  });

  describe('criarPadrao', () => {
    it('deve criar configuração com valores padrão', () => {
      const config = ConfiguracoesRestaurante.criarPadrao();

      expect(config.permitePedidoOnline).toBe(true);
      expect(config.permiteReserva).toBe(false);
      expect(config.tempoPreparoMinutos).toBe(30);
      expect(config.taxaEntrega).toBe(0);
      expect(config.valorMinimoPedido).toBe(0);
      expect(config.modoOperacao).toBe('local');
      expect(config.horariosFuncionamento).toHaveLength(7);
    });

    it('deve criar horários de funcionamento padrão', () => {
      const config = ConfiguracoesRestaurante.criarPadrao();

      for (const horario of config.horariosFuncionamento) {
        expect(horario.horaAbertura).toBe('08:00');
        expect(horario.horaFechamento).toBe('22:00');
        expect(horario.fechado).toBe(false);
      }
    });
  });
});
