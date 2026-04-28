import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RedefinirSenhaUseCase } from '@/application/autenticacao/services/RedefinirSenhaUseCase'
import type { IAuthAdapter } from '@/application/autenticacao/services/RegistrarUsuarioUseCase'

// Mock para o AuthAdapter
const mockEnviarRedefinicaoSenha = vi.fn()
const mockUsuarioRepoFindByEmail = vi.fn()

// Mock da interface IAuthAdapter
const mockAuthAdapter: IAuthAdapter = {
  criarUsuario: vi.fn(),
  enviarRedefinicaoSenha: mockEnviarRedefinicaoSenha,
  validarToken: vi.fn(),
  autenticar: vi.fn(),
}

// Mock do repositório de usuários
const mockUsuarioRepo = {
  findByEmail: mockUsuarioRepoFindByEmail,
  create: vi.fn(),
}

describe('RedefinirSenhaUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('deve chamar enviarRedefinicaoSenha quando email é válido e usuário existe', async () => {
      // Arrange
      mockUsuarioRepoFindByEmail.mockResolvedValue({ id: 'user-123' })
      mockEnviarRedefinicaoSenha.mockResolvedValue(undefined)

      const useCase = new RedefinirSenhaUseCase(mockAuthAdapter, mockUsuarioRepo)

      // Act
      await useCase.execute({ email: 'usuario@exemplo.com' })

      // Assert
      expect(mockUsuarioRepoFindByEmail).toHaveBeenCalledWith('usuario@exemplo.com')
      expect(mockEnviarRedefinicaoSenha).toHaveBeenCalledWith('usuario@exemplo.com')
    })

    it('não deve lançar erro quando email não existe no sistema', async () => {
      // Arrange - usuário não encontrado
      mockUsuarioRepoFindByEmail.mockResolvedValue(null)

      const useCase = new RedefinirSenhaUseCase(mockAuthAdapter, mockUsuarioRepo)

      // Act & Assert - não deve lançar erro (por segurança)
      await expect(useCase.execute({ email: 'naoexiste@exemplo.com' })).resolves.not.toThrow()
      expect(mockEnviarRedefinicaoSenha).not.toHaveBeenCalled()
    })

    it('deve lidar com erros do Supabase graciosamente', async () => {
      // Arrange
      mockUsuarioRepoFindByEmail.mockResolvedValue({ id: 'user-123' })
      mockEnviarRedefinicaoSenha.mockRejectedValue(new Error('Erro do Supabase'))

      const useCase = new RedefinirSenhaUseCase(mockAuthAdapter, mockUsuarioRepo)

      // Act & Assert
      await expect(useCase.execute({ email: 'usuario@exemplo.com' })).rejects.toThrow(
        'Erro do Supabase'
      )
    })
  })
})
