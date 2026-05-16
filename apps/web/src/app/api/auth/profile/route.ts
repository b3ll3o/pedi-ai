import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, isDevDatabase, getSession, getGlobalToken } from '@/infrastructure/database';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import * as schema from '@/infrastructure/database/schema';

export async function GET(request: NextRequest) {
  try {
    if (isDevDatabase()) {
      return handleDevProfile(request);
    } else {
      return handleSupabaseProfile();
    }
  } catch (error) {
    logger.error('auth', 'Erro inesperado em /api/auth/profile:', { error: error });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

async function handleDevProfile(request: NextRequest): Promise<NextResponse> {
  // Get dev auth token from cookie or header
  const cookieHeader = request.headers.get('cookie') || '';
  const devToken = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith('dev_auth_token='))
    ?.split('=')[1]
    ?.trim();

  const token = devToken || getGlobalToken();

  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 });
  }

  // Query user profile from SQLite
  const profile = db
    .select({
      role: schema.usersProfiles.role,
      restaurant_id: schema.usersProfiles.restaurant_id,
    })
    .from(schema.usersProfiles)
    .where(eq(schema.usersProfiles.user_id, session.userId))
    .get();

  if (!profile) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    role: profile.role,
    restaurant_id: profile.restaurant_id,
  });
}

async function handleSupabaseProfile(): Promise<NextResponse> {
  // Criar client server para obter usuário autenticado via session cookies
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
            // Server Component - ignorar
          }
        },
      },
    }
  );

  // Obter usuário autenticado da sessão
  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
  }

  // Criar client admin com service role key para buscar profile (bypass RLS)
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Admin client não precisa definir cookies
        },
      },
    }
  );

  // Buscar profile do usuário
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users_profiles')
    .select('role, restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    role: profile.role,
    restaurant_id: profile.restaurant_id,
  });
}
