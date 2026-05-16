import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, isDevDatabase, hashPassword } from '@/infrastructure/database';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import * as schema from '@/infrastructure/database/schema';

type ResetPasswordResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse<ResetPasswordResponse>> {
  try {
    if (isDevDatabase()) {
      return handleDevResetPassword(request);
    } else {
      return handleSupabaseResetPassword(request);
    }
  } catch (error) {
    logger.error("auth", "Unexpected error in /api/auth/reset-password:", { error: error });
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function handleDevResetPassword(request: NextRequest): Promise<NextResponse<ResetPasswordResponse>> {
  const body = await request.json();
  const { token, novaSenha } = body;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Token é obrigatório' },
      { status: 400 }
    );
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

  // Find the password reset token
  const resetToken = db
    .select()
    .from(schema.passwordResetTokens)
    .where(
      and(
        eq(schema.passwordResetTokens.token, token),
        eq(schema.passwordResetTokens.used, false)
      )
    )
    .get();

  if (!resetToken) {
    return NextResponse.json(
      { success: false, error: 'Token inválido ou expirado' },
      { status: 400 }
    );
  }

  // Check if token is expired
  const now = new Date();
  const expiresAt = new Date(resetToken.expires_at);
  if (now > expiresAt) {
    return NextResponse.json(
      { success: false, error: 'Token expirado' },
      { status: 400 }
    );
  }

  // Update the user's password hash
  const passwordHash = hashPassword(novaSenha);

  db.update(schema.usersProfiles)
    .set({ password_hash: passwordHash })
    .where(eq(schema.usersProfiles.user_id, resetToken.user_id))
    .run();

  // Mark token as used
  db.update(schema.passwordResetTokens)
    .set({ used: true })
    .where(eq(schema.passwordResetTokens.id, resetToken.id))
    .run();

  return NextResponse.json(
    { success: true, message: 'Senha atualizada com sucesso' },
    { status: 200 }
  );
}

async function handleSupabaseResetPassword(request: NextRequest): Promise<NextResponse<ResetPasswordResponse>> {
  const body = await request.json();
  const { token, novaSenha } = body;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Token é obrigatório' },
      { status: 400 }
    );
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return NextResponse.json(
      { success: false, error: 'Token inválido ou expirado' },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: novaSenha,
  });

  if (updateError) {
    logger.error("auth", "Error updating password:", { error: updateError });
    return NextResponse.json(
      { success: false, error: 'Falha ao redefinir senha' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, message: 'Senha atualizada com sucesso' },
    { status: 200 }
  );
}
