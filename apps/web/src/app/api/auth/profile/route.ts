import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { sql } from '@/infrastructure/database/pg-client';

export async function GET(request: NextRequest) {
  try {
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

    // Get authenticated user from session
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // Query user profile from PostgreSQL
    const profile = await sql`
      SELECT role, restaurant_id
      FROM users_profiles
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    if (profile.length === 0) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      role: profile[0].role,
      restaurant_id: profile[0].restaurant_id,
    });
  } catch (error) {
    logger.error('auth', 'Erro inesperado em /api/auth/profile:', { error: error });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
