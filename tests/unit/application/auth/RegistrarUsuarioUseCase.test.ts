import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegistrarUsuarioUseCase } from '@/application/autenticacao/services/RegistrarUsuarioUseCase';
import type { IAuthAdapter, RegistrarUsuarioInput } from '@/application/autenticacao/services/RegistrarUsuarioUseCase';
import { Usuario } from '@/domain/autenticacao/entities/Usuario';
import { Papel } from '@/domain/autenticacao/value-objects/Papel';

// Mock da feature flag
vi.mock('@/lib/feature-flags', () => ({
  isMultiRestaurantEnabled: vi.fn().mockReturnValue(false),
}));

// Mock do repositório de usuários
const mockUsuarioRepoFindByEmail = vi.fn();
const mockUsuarioRepoCreate = vi.fn();

const mockUsuarioRepo = {
  create: mockUsuarioRepoCreate,
  findByEmail: mockUsuarioRepoFindByEmail,
};

// Mock do AuthAdapter
const mockCriarUsuario = vi.fn();
const mockConfirmarEmail = vi.fn();

const mockAuthAdapter: IAuthAdapter = {
  criarUsuario: mockCriarUsuario,
  confirmarEmail: mockConfirmarEmail,
  enviarRedefinicaoSenha: vi.fn(),
  validarToken: vi.fn(),
  autenticar: vi.fn(),
};

describe('RegistrarUsuarioUseCase', () => {
  let useCase: RegistrarUsuarioUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new RegistrarUsuarioUseCase(mockUsuarioRepo, mockAuthAdapter);
  });

  describe('execute', () => {
    const baseInput: RegistrarUsuarioInput = {
      email: 'usuario@exemplo.com',
      senha: 'senha123',
      papel: 'dono',
    };

    it('deve registrar usuário com sucesso quando email é único e senha válida', async () => {
      // Arrange
      mockUsuarioRepoFindByEmail.mockResolvedValue(null);
      mockCriarUsuario.mockResolvedValue({ id: 'auth-id-123' });
      mockConfirmarEmail.mockResolvedValue(undefined);
      mockUsuarioRepoCreate.mockResolvedValue({
        id: 'auth-id-123',
        email: 'usuario@exemplo.com',
        papel: Papel.DONO,
      } as unknown as Usuario);

      // Act
      const resultado = await useCase.execute(baseInput);

      // Assert
      expect(resultado.usuario.email).toBe('usuario@exemplo.com');
      expect(resultado.evento.tipo).toBe('UsuarioCriadoEvent');
      expect(mockUsuarioRepoFindByEmail).toHaveBeenCalledWith('usuario@exemplo.com');
      expect(mockCriarUsuario).toHaveBeenCalledWith('usuario@exemplo.com', 'senha123');
      expect(mockConfirmarEmail).toHaveBeenCalledWith('auth-id-123');
      expect(mockUsuarioRepoCreate).toHaveBeenCalled();
    });

    it('deve lançar erro quando email já está em uso', async () => {
      // Arrange
      mockUsuarioRepoFindByEmail.mockResolvedValue({
        id: 'existing-id',
        email: 'usuario@exemplo.com',
        papel: Papel.DONO,
      } as unknown as Usuario);

      // Act & Assert
      await expect(useCase.execute(baseInput)).rejects.toThrow('Email já está em uso');
      expect(mockCriarUsuario).not.toHaveBeenCalled();
      expect(mockUsuarioRepoCreate).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando senha tem menos de 6 caracteres', async () => {
      // Arrange
      mockUsuarioRepoFindByEmail.mockResolvedValue(null);
      const inputSenhaCurta: RegistrarUsuarioInput = {
        ...baseInput,
        senha: '12345',
      };

      // Act & Assert
      await expect(useCase.execute(inputSenhaCurta)).rejects.toThrow(
        'Senha deve ter pelo menos 6 caracteres'
      );
      expect(mockCriarUsuario).not.toHaveBeenCalled();
      expect(mockUsuarioRepoCreate).not.toHaveBeenCalled();
    });

    it('deve criar usuário com restauranteId quando fornecido', async () => {
      // Arrange
      mockUsuarioRepoFindByEmail.mockResolvedValue(null);
      mockCriarUsuario.mockResolvedValue({ id: 'auth-id-456' });
      mockConfirmarEmail.mockResolvedValue(undefined);
      mockUsuarioRepoCreate.mockImplementation(async (usuario: Usuario) => usuario);

      const inputComRestaurante: RegistrarUsuarioInput = {
        ...baseInput,
        papel: 'gerente',
        restauranteId: 'restaurante-123',
      };

      // Act
      const resultado = await useCase.execute(inputComRestaurante);

      // Assert
      expect(resultado.usuario.restauranteId).toBe('restaurante-123');
      expect(mockConfirmarEmail).toHaveBeenCalledWith('auth-id-456');
      expect(mockUsuarioRepoCreate).toHaveBeenCalled();
    });

    it('deve criar usuário com papel cliente', async () => {
      // Arrange
      mockUsuarioRepoFindByEmail.mockResolvedValue(null);
      mockCriarUsuario.mockResolvedValue({ id: 'auth-id-789' });
      mockConfirmarEmail.mockResolvedValue(undefined);
      mockUsuarioRepoCreate.mockImplementation(async (usuario: Usuario) => usuario);

      const inputCliente: RegistrarUsuarioInput = {
        email: 'cliente@exemplo.com',
        senha: 'senha123',
        papel: 'cliente',
      };

      // Act
      const resultado = await useCase.execute(inputCliente);

      // Assert
      expect(resultado.usuario.papel).toBe(Papel.CLIENTE);
    });

    it('deve lançar erro quando authAdapter falha', async () => {
      // Arrange
      mockUsuarioRepoFindByEmail.mockResolvedValue(null);
      mockCriarUsuario.mockRejectedValue(new Error('Erro do Supabase Auth'));

      // Act & Assert
      await expect(useCase.execute(baseInput)).rejects.toThrow('Erro do Supabase Auth');
      expect(mockUsuarioRepoCreate).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando repositório falha ao persistir', async () => {
      // Arrange
      mockUsuarioRepoFindByEmail.mockResolvedValue(null);
      mockCriarUsuario.mockResolvedValue({ id: 'auth-id-123' });
      mockUsuarioRepoCreate.mockRejectedValue(new Error('Erro ao salvar no banco'));

      // Act & Assert
      await expect(useCase.execute(baseInput)).rejects.toThrow('Erro ao salvar no banco');
    });
  });
});
