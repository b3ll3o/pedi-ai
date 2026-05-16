import { UseCase } from '@/application/shared';
import { Usuario } from '@/domain/autenticacao/entities/Usuario';
import { Papel } from '@/domain/autenticacao/value-objects/Papel';

/**
 * Input para registrar um novo usuário
 */
export interface RegistrarUsuarioInput {
  email: string;
  senha: string;
  papel: PapelValue;
  restauranteId?: string;
}

export type PapelValue = 'dono' | 'gerente' | 'atendente' | 'cliente';

/**
 * Output após registrar usuário
 */
export interface RegistrarUsuarioOutput {
  usuario: Usuario;
  evento: { tipo: string; data: Date };
}

/**
 * Interface do adapter de autenticação (implementação em Phase 4 - Infrastructure)
 */
export interface IAuthAdapter {
  /**
   * Criar usuário no sistema de autenticação (Supabase Auth)
   */
  criarUsuario(email: string, senha: string): Promise<{ id: string }>;

  /**
   * Confirmar email do usuário via Admin API (bypass de confirmação)
   */
  confirmarEmail(userId: string): Promise<void>;

  /**
   * Enviar email de redefinição de senha
   */
  enviarRedefinicaoSenha(email: string): Promise<void>;

  /**
   * Validar token de autenticação
   */
  validarToken(token: string): Promise<{ valido: boolean; usuarioId?: string }>;

  /**
   * Autenticar usuário com email e senha
   */
  autenticar(email: string, senha: string): Promise<{ token: string; usuarioId: string }>;
}

/**
 * Use Case para registrar um novo usuário no sistema
 */
export class RegistrarUsuarioUseCase implements UseCase<
  RegistrarUsuarioInput,
  RegistrarUsuarioOutput
> {
  constructor(
    private usuarioRepo: {
      create(usuario: Usuario): Promise<Usuario>;
      findByEmail(email: string): Promise<Usuario | null>;
    },
    private authAdapter: IAuthAdapter
  ) {}

  async execute(input: RegistrarUsuarioInput): Promise<RegistrarUsuarioOutput> {
    // Validar email único
    const existente = await this.usuarioRepo.findByEmail(input.email);
    if (existente) {
      throw new Error('Email já está em uso');
    }

    // Validar senha (mínimo 6 caracteres)
    if (input.senha.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }

    // Criar usuário no sistema de autenticação (Supabase)
    const { id: authId } = await this.authAdapter.criarUsuario(input.email, input.senha);

    // Confirmar email via Admin API (bypass de confirmação de email)
    await this.authAdapter.confirmarEmail(authId);

    // Criar aggregate de usuário
    const usuario = Usuario.criar({
      id: authId,
      email: input.email,
      papel: Papel.fromValue(input.papel),
      restauranteId: input.restauranteId,
    });

    // Persistir usuário
    const usuarioPersistido = await this.usuarioRepo.create(usuario);

    return {
      usuario: usuarioPersistido,
      evento: {
        tipo: 'UsuarioCriadoEvent',
        data: new Date(),
      },
    };
  }
}
