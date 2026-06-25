/**
 * Cobertura: RF-AUTH-03 (Validar sessão)
 * @see .openspec/specs/autenticacao/design.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  ValidarSessaoUseCase,
  type ValidarSessaoInput,
} from '@/application/autenticacao/services/ValidarSessaoUseCase';
import type { IAuthAdapter } from '@/application/autenticacao/services/RegistrarUsuarioUseCase';

// Mock do AuthAdapter
const mockValidarToken = vi.fn();
const mockAuthAdapter: IAuthAdapter = {
  criarUsuario: vi.fn(),
  enviarRedefinicaoSenha: vi.fn(),
  autenticar: vi.fn(),
  validarToken: mockValidarToken,
};

// Mock do repositório de sessões
const mockSessaoRepoFindByToken = vi.fn();
const mockSessaoRepo = {
  findByToken: mockSessaoRepoFindByToken,
};

describe('ValidarSessaoUseCase', () => {
  let useCase: ValidarSessaoUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new ValidarSessaoUseCase(mockAuthAdapter, mockSessaoRepo);
  });

  const baseInput: ValidarSessaoInput = {
    token: 'valid-token-abc123',
  };

  it('deve validar sessão e retornar usuárioId quando token válido e não expirado', async () => {
    // Arrange
    const expiracaoFutura = new Date(Date.now() + 60_000);
    mockValidarToken.mockResolvedValue({ valido: true, usuarioId: 'user-123' });
    mockSessaoRepoFindByToken.mockResolvedValue({ expiracao: expiracaoFutura });

    // Act
    const result = await useCase.execute(baseInput);

    // Assert
    expect(result).toEqual({ valido: true, usuarioId: 'user-123' });
    expect(mockValidarToken).toHaveBeenCalledWith('valid-token-abc123');
    expect(mockSessaoRepoFindByToken).toHaveBeenCalledWith('valid-token-abc123');
  });

  it('deve retornar inválido quando o token não passa no AuthAdapter', async () => {
    // Arrange
    mockValidarToken.mockResolvedValue({ valido: false });
    mockSessaoRepoFindByToken.mockResolvedValue({ expiracao: new Date(Date.now() + 60_000) });

    // Act
    const result = await useCase.execute(baseInput);

    // Assert
    expect(result).toEqual({ valido: false });
    expect(result.usuarioId).toBeUndefined();
  });

  it('deve retornar inválido quando o token é válido mas a sessão não existe no repositório', async () => {
    // Arrange
    mockValidarToken.mockResolvedValue({ valido: true, usuarioId: 'user-123' });
    mockSessaoRepoFindByToken.mockResolvedValue(null);

    // Act
    const result = await useCase.execute(baseInput);

    // Assert
    expect(result).toEqual({ valido: false });
  });

  it('deve retornar inválido quando a sessão está expirada', async () => {
    // Arrange
    const expiracaoPassada = new Date(Date.now() - 60_000);
    mockValidarToken.mockResolvedValue({ valido: true, usuarioId: 'user-123' });
    mockSessaoRepoFindByToken.mockResolvedValue({ expiracao: expiracaoPassada });

    // Act
    const result = await useCase.execute(baseInput);

    // Assert
    expect(result).toEqual({ valido: false });
    expect(result.usuarioId).toBeUndefined();
  });
});
