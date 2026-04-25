import { UseCase } from '@/application/shared';
import { IAuthAdapter } from './RegistrarUsuarioUseCase';

/**
 * Input para validar sessão
 */
export interface ValidarSessaoInput {
  token: string;
}

/**
 * Output após validação
 */
export interface ValidarSessaoOutput {
  valido: boolean;
  usuarioId?: string;
}

/**
 * Use Case para validar token de sessão
 */
export class ValidarSessaoUseCase implements UseCase<ValidarSessaoInput, ValidarSessaoOutput> {
  constructor(
    private authAdapter: IAuthAdapter,
    private sessaoRepo: {
      findByToken(token: string): Promise<{ expiracao: Date } | null>;
    }
  ) {}

  async execute(input: ValidarSessaoInput): Promise<ValidarSessaoOutput> {
    // Validar token no AuthAdapter (Supabase)
    const { valido, usuarioId } = await this.authAdapter.validarToken(input.token);

    if (!valido || !usuarioId) {
      return { valido: false };
    }

    // Verificar se sessão não está expirada no repositório local
    const sessao = await this.sessaoRepo.findByToken(input.token);
    if (!sessao) {
      return { valido: false };
    }

    if (new Date() > sessao.expiracao) {
      return { valido: false };
    }

    return {
      valido: true,
      usuarioId,
    };
  }
}
