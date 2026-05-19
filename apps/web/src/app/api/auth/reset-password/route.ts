import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { logger } from '@/lib/logger';
import { sql } from '@/infrastructure/database/pg-client';

type ResetPasswordResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * Simple SHA-256 password hash for password reset
 */
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export async function POST(request: NextRequest): Promise<NextResponse<ResetPasswordResponse>> {
  try {
    const body = await request.json();
    const { token, novaSenha } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token é obrigatório' }, { status: 400 });
    }

    if (!novaSenha) {
      return NextResponse.json(
        { success: false, error: 'Nova senha é obrigatória' },
        { status: 400 }
      );
    }

    if (novaSenha.length < 6) {
      return NextResponse.json(
        { success: false, error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Create server client to get authenticated user from session cookies
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component - ignore
            }
          },
        },
      }
    );

    // Get authenticated user using the reset token
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 400 }
      );
    }

    // Find the password reset token in our database
    const resetToken = await sql`
      SELECT id, user_id, expires_at, used
      FROM password_reset_tokens
      WHERE token = ${token} AND used = false
      LIMIT 1
    `;

    if (resetToken.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 400 }
      );
    }

    const tokenRecord = resetToken[0];

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({ success: false, error: 'Token expirado' }, { status: 400 });
    }

    // Update the user's password hash
    const passwordHash = hashPassword(novaSenha);

    await sql`
      UPDATE users_profiles
      SET password_hash = ${passwordHash}
      WHERE user_id = ${tokenRecord.user_id}
    `;

    // Mark token as used
    await sql`
      UPDATE password_reset_tokens
      SET used = true
      WHERE id = ${tokenRecord.id}
    `;

    return NextResponse.json(
      { success: true, message: 'Senha atualizada com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('auth', 'Unexpected error in /api/auth/reset-password:', { error: error });
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
