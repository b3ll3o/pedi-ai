import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Save original env
const originalNodeEnv = process.env.NODE_ENV;

describe('lib/logger', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.spyOn(console, 'warn').mockImplementation(vi.fn());
    vi.spyOn(console, 'log').mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
  });

  // Re-import logger to pick up env changes
  const reimportLogger = () => {
    vi.resetModules();
    return import('@/lib/logger');
  };

  describe('log levels', () => {
    it('deve logar error com console.error', async () => {
      const { logger } = await reimportLogger();
      logger.error('TestContext', 'Error message');

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[TestContext]'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error message'));
    });

    it('deve logar warn com console.warn', async () => {
      const { logger } = await reimportLogger();
      logger.warn('TestContext', 'Warn message');

      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[TestContext]'));
    });

    it('deve logar info com console.log', async () => {
      const { logger } = await reimportLogger();
      logger.info('TestContext', 'Info message');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[TestContext]'));
    });

    it('deve logar debug com console.log', async () => {
      const { logger } = await reimportLogger();
      logger.debug('TestContext', 'Debug message');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
    });
  });

  describe('timestamp format', () => {
    it('deve incluir ISO timestamp no formato', async () => {
      const { logger } = await reimportLogger();
      logger.info('Context', 'Message');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      );
    });
  });

  describe('meta object', () => {
    it('deve incluir meta quando fornecido', async () => {
      const { logger } = await reimportLogger();
      const meta = { data: 'value', number: 42 };
      logger.info('Context', 'Message', meta);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('{"data":"value","number":42}')
      );
    });

    it('deve não incluir meta quando undefined', async () => {
      const { logger } = await reimportLogger();
      logger.info('Context', 'Message');

      // Deve logar sem trailing meta
      expect(console.log).toHaveBeenCalledWith(expect.not.stringContaining('undefined'));
    });
  });

  describe('sanitization', () => {
    it('deve censurar campos sensíveis (password)', async () => {
      const { logger } = await reimportLogger();
      const meta = { username: 'john', password: 'secret123' };
      logger.info('Context', 'Message', meta);

      const loggedOutput = (console.log as any).mock.calls[0][0];
      expect(loggedOutput).toContain('[REDACTED]');
      expect(loggedOutput).not.toContain('secret123');
    });

    it('deve censurar campos sensíveis (token)', async () => {
      const { logger } = await reimportLogger();
      const meta = { action: 'login', token: 'jwt-token-xyz' };
      logger.info('Context', 'Message', meta);

      const loggedOutput = (console.log as any).mock.calls[0][0];
      expect(loggedOutput).toContain('[REDACTED]');
      expect(loggedOutput).not.toContain('jwt-token-xyz');
    });

    it('deve censurar campos sensíveis (secret)', async () => {
      const { logger } = await reimportLogger();
      const meta = { api: 'rest', secret: 'top-secret' };
      logger.info('Context', 'Message', meta);

      const loggedOutput = (console.log as any).mock.calls[0][0];
      expect(loggedOutput).toContain('[REDACTED]');
      expect(loggedOutput).not.toContain('top-secret');
    });

    it('deve censurar campos sensíveis (key)', async () => {
      const { logger } = await reimportLogger();
      const meta = { service: 'api', key: 'abc123' };
      logger.info('Context', 'Message', meta);

      const loggedOutput = (console.log as any).mock.calls[0][0];
      expect(loggedOutput).toContain('[REDACTED]');
      expect(loggedOutput).not.toContain('abc123');
    });

    it('deve censurar campos sensíveis (cpf)', async () => {
      const { logger } = await reimportLogger();
      const meta = { user: 'john', cpf: '123.456.789-00' };
      logger.info('Context', 'Message', meta);

      const loggedOutput = (console.log as any).mock.calls[0][0];
      expect(loggedOutput).toContain('[REDACTED]');
      expect(loggedOutput).not.toContain('123.456.789-00');
    });

    it('deve censurar campos sensíveis (cnpj)', async () => {
      const { logger } = await reimportLogger();
      const meta = { company: 'Acme', cnpj: '12.345.678/0001-90' };
      logger.info('Context', 'Message', meta);

      const loggedOutput = (console.log as any).mock.calls[0][0];
      expect(loggedOutput).toContain('[REDACTED]');
      expect(loggedOutput).not.toContain('12.345.678/0001-90');
    });

    it('deve censurar campos sensíveis (email)', async () => {
      const { logger } = await reimportLogger();
      const meta = { user: 'john', email: 'john@example.com' };
      logger.info('Context', 'Message', meta);

      const loggedOutput = (console.log as any).mock.calls[0][0];
      expect(loggedOutput).toContain('[REDACTED]');
      expect(loggedOutput).not.toContain('john@example.com');
    });

    it('deve censurar campos sensíveis (phone)', async () => {
      const { logger } = await reimportLogger();
      const meta = { contact: 'john', phone: '+55-11-99999-9999' };
      logger.info('Context', 'Message', meta);

      const loggedOutput = (console.log as any).mock.calls[0][0];
      expect(loggedOutput).toContain('[REDACTED]');
      expect(loggedOutput).not.toContain('+55-11-99999-9999');
    });

    it('deve ser case insensitive para chaves sensíveis', async () => {
      const { logger } = await reimportLogger();
      const meta = { PASSWORD: 'secret', Token: 'bearer' };
      logger.info('Context', 'Message', meta);

      const loggedOutput = (console.log as any).mock.calls[0][0];
      expect(loggedOutput).toContain('[REDACTED]');
      expect(loggedOutput).not.toContain('secret');
      expect(loggedOutput).not.toContain('bearer');
    });

    it('deve sanitizar objetos aninhados', async () => {
      const { logger } = await reimportLogger();
      const meta = {
        user: {
          name: 'john',
          credentials: {
            password: 'secret123',
          },
        },
      };
      logger.info('Context', 'Message', meta);

      const loggedOutput = (console.log as any).mock.calls[0][0];
      expect(loggedOutput).toContain('[REDACTED]');
      expect(loggedOutput).not.toContain('secret123');
    });

    it('deve sanitizar arrays', async () => {
      const { logger } = await reimportLogger();
      const meta = {
        users: [
          { name: 'john', password: 'secret1' },
          { name: 'jane', password: 'secret2' },
        ],
      };
      logger.info('Context', 'Message', meta);

      const loggedOutput = (console.log as any).mock.calls[0][0];
      expect(loggedOutput).toContain('[REDACTED]');
      expect(loggedOutput).not.toContain('secret1');
      expect(loggedOutput).not.toContain('secret2');
    });
  });

  describe('sanitizeMeta edge cases', () => {
    it('deve retornar primitivos sem modificação', async () => {
      const { logger } = await reimportLogger();

      // String
      logger.info('Context', 'Message', 'just a string');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('just a string'));
    });

    it('deve retornar null sem modificação', async () => {
      const { logger } = await reimportLogger();
      logger.info('Context', 'Message', null);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('null'));
    });

    it('deve lidar com meta undefined', async () => {
      const { logger } = await reimportLogger();
      // Não deve lançar
      expect(() => logger.info('Context', 'Message', undefined as any)).not.toThrow();
    });
  });

  describe('production mode (NODE_ENV=production)', () => {
    it('deve suprimir debug em produção', async () => {
      process.env.NODE_ENV = 'production';
      const { logger } = await reimportLogger();

      logger.debug('Context', 'Debug message');
      expect(console.log).not.toHaveBeenCalled();
    });

    it('deve suprimir info em produção', async () => {
      process.env.NODE_ENV = 'production';
      const { logger } = await reimportLogger();

      logger.info('Context', 'Info message');
      expect(console.log).not.toHaveBeenCalled();
    });

    it('deve.emitir warn em produção', async () => {
      process.env.NODE_ENV = 'production';
      const { logger } = await reimportLogger();

      logger.warn('Context', 'Warn message');
      expect(console.warn).toHaveBeenCalled();
    });

    it('deve.emitir error em produção', async () => {
      process.env.NODE_ENV = 'production';
      const { logger } = await reimportLogger();

      logger.error('Context', 'Error message');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('development mode (NODE_ENV=development)', () => {
    it('deve.emitir todos os níveis em desenvolvimento', async () => {
      process.env.NODE_ENV = 'development';
      const { logger } = await reimportLogger();

      logger.debug('Context', 'Debug');
      logger.info('Context', 'Info');
      logger.warn('Context', 'Warn');
      logger.error('Context', 'Error');

      expect(console.log).toHaveBeenCalledTimes(2); // debug + info
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledTimes(1);
    });
  });
});
