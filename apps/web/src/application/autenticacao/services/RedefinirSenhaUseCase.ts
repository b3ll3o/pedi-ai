import { UseCase } from '@/application/shared';
import { IAuthAdapter } from './RegistrarUsuarioUseCase';

/**
 * Input para solicitar redefinição de senha
 */
export interface RedefinirSenhaInput {
  email: string;
}

/**
 * Use Case para solicitar redefinição de senha via email
 */
export class RedefinirSenhaUseCase implements UseCase<RedefinirSenhaInput, void> {
  constructor(
    private authAdapter: IAuthAdapter,
    private usuarioRepo: {
      findByEmail(email: string): Promise<{ id: string } | null>;
    }
  ) {}

  async execute(input: RedefinirSenhaInput): Promise<void> {
    // Verificar se usuário existe
    const usuario = await this.usuarioRepo.findByEmail(input.email);
    if (!usuario) {
      // Por segurança, não revelamos se o email existe ou não
      return;
    }

    // Solicitar redefinição via AuthAdapter (Supabase)
    await this.authAdapter.enviarRedefinicaoSenha(input.email);
  }
}
