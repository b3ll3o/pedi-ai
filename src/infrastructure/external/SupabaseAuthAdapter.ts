import { signUp, signIn, resetPassword } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { IAuthAdapter } from '@/application/autenticacao/services/RegistrarUsuarioUseCase';
import type { User as _User } from '@supabase/supabase-js';

/**
 * Implementação do adapter de autenticação usando Supabase Auth
 */
export class SupabaseAuthAdapter implements IAuthAdapter {
  async criarUsuario(email: string, senha: string): Promise<{ id: string }> {
    const { data, error } = await signUp(email, senha);

    if (error) {
      throw new Error(`Erro ao criar usuário: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Usuário não foi criado');
    }

    return { id: data.user.id };
  }

  async enviarRedefinicaoSenha(email: string): Promise<void> {
    await resetPassword(email);
  }

  async validarToken(token: string): Promise<{ valido: boolean; usuarioId?: string }> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return { valido: false };
    }

    return { valido: true, usuarioId: data.user.id };
  }

  async autenticar(email: string, senha: string): Promise<{ token: string; usuarioId: string }> {
    const { data, error } = await signIn(email, senha);

    if (error) {
      throw new Error(`Erro na autenticação: ${error.message}`);
    }

    if (!data.session || !data.user) {
      throw new Error('Sessão não foi criada');
    }

    return {
      token: data.session.access_token,
      usuarioId: data.user.id,
    };
  }
}
