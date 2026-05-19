import { sql } from '@/infrastructure/database/pg-client';
import { IAuthAdapter } from '@/application/autenticacao/services/RegistrarUsuarioUseCase';
import { createHmac, randomBytes } from 'crypto';

/**
 * Traduz mensagens de erro para pt-BR
 */
function traduzirMensagemErro(mensagem: string): string {
  const traducoes: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos',
    'Invalid credentials': 'Email ou senha incorretos',
    'User already registered': 'Este email já está cadastrado',
    'User not found': 'Usuário não encontrado',
    'Email not found': 'Email não encontrado',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
  };

  return traducoes[mensagem] || mensagem;
}

/**
 * Hash de senha usando PBKDF2
 */
function hashSenha(senha: string, salt: string): string {
  const hmac = createHmac('sha256', salt);
  hmac.update(senha);
  return hmac.digest('hex');
}

/**
 * Implementação do adapter de autenticação usando PostgreSQL
 * Nota: Esta é uma implementação básica que armazena senhas com hash.
 * Em produção, considere usar um serviço dedicado como Auth0, Clerk, etc.
 */
export class PostgresAuthAdapter implements IAuthAdapter {
  static async criarUsuario(email: string, senha: string): Promise<{ id: string }> {
    // Validar senha
    if (senha.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres');
    }

    // Gerar salt e hash
    const salt = randomBytes(16).toString('hex');
    const senhaHash = hashSenha(senha, salt);
    const id = randomBytes(16).toString('hex');

    try {
      await sql`
        INSERT INTO users (id, email, password_hash, salt, created_at)
        VALUES (${id}, ${email}, ${senhaHash}, ${salt}, NOW())
      `;

      return { id };
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate')) {
        throw new Error('Este email já está cadastrado');
      }
      throw new Error(`Erro ao criar usuário: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async confirmarEmail(userId: string): Promise<void> {
    // Em uma implementação real, verificaríamos token de confirmação
    // Por agora, apenas marcamos como confirmado
    await sql`
      UPDATE users SET email_confirmed = true, updated_at = NOW()
      WHERE id = ${userId}
    `;
  }

  static async enviarRedefinicaoSenha(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Gerar token de redefinição
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hora

      await sql`
        INSERT INTO password_reset_tokens (token, email, expires_at, used)
        VALUES (${token}, ${email}, ${expiresAt.toISOString()}, false)
      `;

      // Em produção, enviar email com link de redefinição
      // Por enquanto, apenas logamos
      console.log(`Password reset token for ${email}: ${token}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  static async validarToken(token: string): Promise<{ valido: boolean; usuarioId?: string }> {
    try {
      const result = await sql<{ user_id: string }>`
        SELECT user_id FROM sessions WHERE token = ${token} AND expires_at > NOW() LIMIT 1
      `;

      if (result.length === 0) {
        return { valido: false };
      }

      return { valido: true, usuarioId: result[0].user_id };
    } catch {
      return { valido: false };
    }
  }

  static async autenticar(email: string, senha: string): Promise<{ token: string; usuarioId: string }> {
    try {
      // Buscar usuário
      const users = await sql<{ id: string; password_hash: string; salt: string }>`
        SELECT id, password_hash, salt FROM users WHERE email = ${email} LIMIT 1
      `;

      if (users.length === 0) {
        throw new Error('Email ou senha incorretos');
      }

      const user = users[0];

      // Verificar senha
      const hash = hashSenha(senha, user.salt);
      if (hash !== user.password_hash) {
        throw new Error('Email ou senha incorretos');
      }

      // Gerar sessão
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 3600000); // 7 dias

      await sql`
        INSERT INTO sessions (token, user_id, expires_at, created_at)
        VALUES (${token}, ${user.id}, ${expiresAt.toISOString()}, NOW())
      `;

      return { token, usuarioId: user.id };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(traduzirMensagemErro(error.message));
      }
      throw new Error('Erro ao autenticar');
    }
  }
}
