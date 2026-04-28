import { signUp, signIn, resetPassword } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { IAuthAdapter } from '@/application/autenticacao/services/RegistrarUsuarioUseCase';
import type { User as _User } from '@supabase/supabase-js';

/**
 * Admin client para operações privilegiadas (confirmar email, etc)
 */
function getSupabaseAdmin() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );
}

/**
 * Traduz mensagens de erro do Supabase para pt-BR
 */
function traduzirMensagemErro(mensagem: string): string {
  const traducoes: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos',
    'Invalid credentials': 'Email ou senha incorretos',
    'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
    'User already registered': 'Este email já está cadastrado',
    'User not found': 'Usuário não encontrado',
    'Email not found': 'Email não encontrado',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
  };

  return traducoes[mensagem] || mensagem;
}

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

  async confirmarEmail(userId: string): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (error) {
      throw new Error(`Erro ao confirmar email: ${error.message}`);
    }
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
      // Traduzir mensagens de erro comuns do Supabase para pt-BR
      const mensagemTraduzida = traduzirMensagemErro(error.message);
      throw new Error(mensagemTraduzida);
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
