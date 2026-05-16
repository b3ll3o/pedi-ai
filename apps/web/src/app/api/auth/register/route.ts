import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, isDevDatabase, getSession, getGlobalToken } from '@/infrastructure/database';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import * as schema from '@/infrastructure/database/schema';

type Intent = 'gerenciar_restaurante' | 'fazer_pedidos';
type Role = 'dono' | 'cliente';

function intentToRole(intent: Intent): Role {
  return intent === 'gerenciar_restaurante' ? 'dono' : 'cliente';
}

export async function POST(request: NextRequest) {
  try {
    if (isDevDatabase()) {
      return handleDevRegister(request);
    } else {
      return handleSupabaseRegister(request);
    }
  } catch (error) {
    logger.error('auth', 'Unexpected error in /api/auth/register:', { error: error });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

async function handleDevRegister(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const { email, intent } = body;

  if (!email || !intent) {
    return NextResponse.json({ error: 'email e intent são obrigatórios' }, { status: 400 });
  }

  if (intent !== 'gerenciar_restaurante' && intent !== 'fazer_pedidos') {
    return NextResponse.json(
      { error: 'intent inválido. Use: gerenciar_restaurante ou fazer_pedidos' },
      { status: 400 }
    );
  }

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

  const role: Role = intentToRole(intent);

  // Check if profile already exists
  const existingProfile = db
    .select({ id: schema.usersProfiles.id })
    .from(schema.usersProfiles)
    .where(eq(schema.usersProfiles.user_id, session.userId))
    .get();

  if (existingProfile) {
    return NextResponse.json({ success: true, message: 'Perfil já existe' });
  }

  // Create user profile in SQLite
  const profileId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.insert(schema.usersProfiles)
    .values({
      id: profileId,
      user_id: session.userId,
      email: email.toLowerCase(),
      role,
      name: '',
      restaurant_id: null,
      created_at: now,
    })
    .run();

  return NextResponse.json({ success: true }, { status: 201 });
}

async function handleSupabaseRegister(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const { email, intent } = body;

  if (!email || !intent) {
    return NextResponse.json({ error: 'email e intent são obrigatórios' }, { status: 400 });
  }

  if (intent !== 'gerenciar_restaurante' && intent !== 'fazer_pedidos') {
    return NextResponse.json(
      { error: 'intent inválido. Use: gerenciar_restaurante ou fazer_pedidos' },
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

  // Get authenticated user from session (set after signUp)
  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
  }

  const role: Role = intentToRole(intent);

  // Create Supabase client with service role key to bypass RLS
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Admin client doesn't need to set cookies
        },
      },
    }
  );

  // Check if profile already exists
  const { data: existingProfile } = await supabaseAdmin
    .from('users_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existingProfile) {
    return NextResponse.json({ success: true, message: 'Perfil já existe' });
  }

  // Create user profile
  const { error: insertError } = await supabaseAdmin.from('users_profiles').insert({
    user_id: user.id,
    email: email.toLowerCase(),
    role,
    name: '',
    restaurant_id: null,
  });

  if (insertError) {
    logger.error('auth', 'Error creating user profile:', { error: insertError });
    return NextResponse.json({ error: 'Falha ao criar perfil do usuário' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
