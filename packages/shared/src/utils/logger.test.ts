import { describe, it, expect, vi } from 'vitest';
import { logger } from '@pedi-ai/shared/utils/logger';

describe('logger', () => {
  describe('error', () => {
    it('deve registrar mensagem de erro', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('TestContext', 'Mensagem de erro');

      expect(consoleSpy).toHaveBeenCalled();
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('[ERROR]');
      expect(loggedMessage).toContain('[TestContext]');
      expect(loggedMessage).toContain('Mensagem de erro');

      consoleSpy.mockRestore();
    });

    it('deve incluir metadata se fornecida', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('TestContext', 'Erro com meta', { code: 500 });

      expect(consoleSpy).toHaveBeenCalled();
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('"code":500');

      consoleSpy.mockRestore();
    });
  });

  describe('warn', () => {
    it('deve registrar mensagem de aviso', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logger.warn('TestContext', 'Mensagem de aviso');

      expect(consoleSpy).toHaveBeenCalled();
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('[WARN]');
      expect(loggedMessage).toContain('[TestContext]');
      expect(loggedMessage).toContain('Mensagem de aviso');

      consoleSpy.mockRestore();
    });
  });

  describe('info', () => {
    it('deve registrar mensagem de info', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.info('TestContext', 'Mensagem de info');

      expect(consoleSpy).toHaveBeenCalled();
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('[INFO]');
      expect(loggedMessage).toContain('[TestContext]');
      expect(loggedMessage).toContain('Mensagem de info');

      consoleSpy.mockRestore();
    });
  });

  describe('debug', () => {
    it('deve registrar mensagem de debug', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.debug('TestContext', 'Mensagem de debug');

      expect(consoleSpy).toHaveBeenCalled();
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('[DEBUG]');
      expect(loggedMessage).toContain('[TestContext]');
      expect(loggedMessage).toContain('Mensagem de debug');

      consoleSpy.mockRestore();
    });
  });

  describe('sanitization', () => {
    it('deve redacted dados sensíveis', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('TestContext', 'Erro com dados sensíveis', {
        password: 'minha-senha',
        token: 'meu-token',
        email: 'user@email.com',
      });

      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).not.toContain('minha-senha');
      expect(loggedMessage).not.toContain('meu-token');

      consoleSpy.mockRestore();
    });

    it('deve redacted chave cpj', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('TestContext', 'Erro com CPF', { cpf: '123.456.789-00' });

      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).not.toContain('123.456.789-00');

      consoleSpy.mockRestore();
    });

    it('deve redacted nested sensitive keys', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('TestContext', 'Erro aninhado', {
        user: {
          password: 'secret123',
          name: 'John',
        },
      });

      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).not.toContain('secret123');
      expect(loggedMessage).toContain('John');

      consoleSpy.mockRestore();
    });

    it('deve lidar com array de objetos sensíveis', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('TestContext', 'Erro com array', {
        users: [
          { name: 'Alice', token: 'token-alice' },
          { name: 'Bob', token: 'token-bob' },
        ],
      });

      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).not.toContain('token-alice');
      expect(loggedMessage).not.toContain('token-bob');
      expect(loggedMessage).toContain('Alice');
      expect(loggedMessage).toContain('Bob');

      consoleSpy.mockRestore();
    });
  });

  describe('timestamp', () => {
    it('deve incluir timestamp ISO no formato', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.info('TestContext', 'Mensagem');

      const loggedMessage = consoleSpy.mock.calls[0][0];
      // ISO timestamp format: [2024-01-01T00:00:00.000Z]
      expect(loggedMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      consoleSpy.mockRestore();
    });
  });

  describe('log levels', () => {
    it('deve aceitar objeto como último argumento', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      logger.info('TestContext', 'Info message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
