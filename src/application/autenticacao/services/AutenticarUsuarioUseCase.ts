import { UseCase } from '@/application/shared';
import { Sessao } from '@/domain/autenticacao/entities/Sessao';
import { IAuthAdapter } from './RegistrarUsuarioUseCase';

/**
 * Input para autenticar usuário
 */
export interface AutenticarInput {
  email: string;
  senha: string;
  dispositivo: string;
}

/**
 * Output após autenticação
 */
export interface AutenticarOutput {
  sessao: Sessao;
  token: string;
}

/**
 * Use Case para autenticar usuário e criar sessão
 */
export class AutenticarUsuarioUseCase implements UseCase<AutenticarInput, AutenticarOutput> {
  constructor(
    private authAdapter: IAuthAdapter,
    private sessaoRepo: {
      create(sessao: Sessao): Promise<Sessao>;
      findByUsuarioId(usuarioId: string): Promise<Sessao[]>;
      deleteByUsuarioId(usuarioId: string): Promise<void>;
    }
  ) {}

  async execute(input: AutenticarInput): Promise<AutenticarOutput> {
    // Autenticar via AuthAdapter (Supabase)
    const { token, usuarioId } = await this.authAdapter.autenticar(input.email, input.senha);

    // Invalidar sessões existentes do usuário (opcional - depending on business rules)
    // await this.sessaoRepo.deleteByUsuarioId(usuarioId);

    // Criar nova sessão
    const expiracao = new Date();
    expiracao.setHours(expiracao.getHours() + 24); // Sessão expira em 24h

    const sessao = Sessao.criar({
      usuarioId,
      token,
      expiracao,
      dispositivo: input.dispositivo,
    });

    const sessaoPersistida = await this.sessaoRepo.create(sessao);

    return {
      sessao: sessaoPersistida,
      token,
    };
  }
}
