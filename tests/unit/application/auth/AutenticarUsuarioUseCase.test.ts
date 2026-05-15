import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutenticarUsuarioUseCase } from '@/application/autenticacao/services/AutenticarUsuarioUseCase';
import type { AutenticarInput } from '@/application/autenticacao/services/AutenticarUsuarioUseCase';
import type { IAuthAdapter } from '@/application/autenticacao/services/RegistrarUsuarioUseCase';
import { Sessao } from '@/domain/autenticacao/entities/Sessao';

// Mock do AuthAdapter
const mockAutenticar = vi.fn();

const mockAuthAdapter: IAuthAdapter = {
  criarUsuario: vi.fn(),
  enviarRedefinicaoSenha: vi.fn(),
  validarToken: vi.fn(),
  autenticar: mockAutenticar,
};

// Mock do repositório de sessões
const mockSessaoRepoCreate = vi.fn();
const mockSessaoRepoFindByUsuarioId = vi.fn();
const mockSessaoRepoDeleteByUsuarioId = vi.fn();

const mockSessaoRepo = {
  create: mockSessaoRepoCreate,
  findByUsuarioId: mockSessaoRepoFindByUsuarioId,
  deleteByUsuarioId: mockSessaoRepoDeleteByUsuarioId,
};

describe('AutenticarUsuarioUseCase', () => {
  let useCase: AutenticarUsuarioUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new AutenticarUsuarioUseCase(mockAuthAdapter, mockSessaoRepo);
  });

  describe('execute', () => {
    const baseInput: AutenticarInput = {
      email: 'usuario@exemplo.com',
      senha: 'senha123',
      dispositivo: 'Chrome on Windows',
    };

    it('deve autenticar usuário e criar sessão com sucesso', async () => {
      // Arrange
      const expiracaoEsperada = new Date();
      expiracaoEsperada.setHours(expiracaoEsperada.getHours() + 24);

      mockAutenticar.mockResolvedValue({
        token: 'jwt-token-123',
        usuarioId: 'user-id-456',
      });

      mockSessaoRepoCreate.mockImplementation(async (sessao: Sessao) => {
        return sessao;
      });

      // Act
      const resultado = await useCase.execute(baseInput);

      // Assert
      expect(resultado.token).toBe('jwt-token-123');
      expect(resultado.sessao.usuarioId).toBe('user-id-456');
      expect(resultado.sessao.token).toBe('jwt-token-123');
      expect(resultado.sessao.dispositivo).toBe('Chrome on Windows');
      expect(mockAutenticar).toHaveBeenCalledWith('usuario@exemplo.com', 'senha123');
      expect(mockSessaoRepoCreate).toHaveBeenCalled();
    });

    it('deve criar sessão com expiração de 24 horas', async () => {
      // Arrange
      const _beforeExecute = new Date();
      mockAutenticar.mockResolvedValue({
        token: 'jwt-token-123',
        usuarioId: 'user-id-456',
      });
      mockSessaoRepoCreate.mockImplementation(async (sessao: Sessao) => sessao);

      // Act
      await useCase.execute(baseInput);

      // Assert
      const agora = new Date();
      const sessaoCriada = mockSessaoRepoCreate.mock.calls[0][0] as Sessao;
      // A expiração deve ser aproximadamente 24h no futuro (com margem de 1min)
      const diffMs = sessaoCriada.expiracao.getTime() - agora.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(23);
      expect(diffHours).toBeLessThan(25);
    });

    it('deve lançar erro quando autenticação falha', async () => {
      // Arrange
      mockAutenticar.mockRejectedValue(new Error('Credenciais inválidas'));

      // Act & Assert
      await expect(useCase.execute(baseInput)).rejects.toThrow('Credenciais inválidas');
      expect(mockSessaoRepoCreate).not.toHaveBeenCalled();
    });

    it('deve criar sessão mesmo quando dispositivo não é informado', async () => {
      // Arrange
      mockAutenticar.mockResolvedValue({
        token: 'jwt-token-789',
        usuarioId: 'user-id-999',
      });
      mockSessaoRepoCreate.mockImplementation(async (sessao: Sessao) => sessao);

      const inputSemDispositivo: AutenticarInput = {
        email: 'usuario@exemplo.com',
        senha: 'senha123',
        dispositivo: '',
      };

      // Act
      const resultado = await useCase.execute(inputSemDispositivo);

      // Assert
      expect(resultado.sessao.dispositivo).toBe('');
      expect(mockSessaoRepoCreate).toHaveBeenCalled();
    });

    it('deve preservar token retornado pelo auth adapter', async () => {
      // Arrange
      const tokenEsperado = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      mockAutenticar.mockResolvedValue({
        token: tokenEsperado,
        usuarioId: 'user-id-456',
      });
      mockSessaoRepoCreate.mockImplementation(async (sessao: Sessao) => sessao);

      // Act
      const resultado = await useCase.execute(baseInput);

      // Assert
      expect(resultado.token).toBe(tokenEsperado);
      expect(resultado.sessao.token).toBe(tokenEsperado);
    });
  });
});
