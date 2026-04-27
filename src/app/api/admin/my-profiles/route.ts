import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Admin client for bypassing RLS - uses service role key directly
 */
function getSupabaseAdmin() {
  return createSupabaseClient(
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
 * Auth client for validating user sessions via cookies
 */
async function getSupabaseAuth() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // Server component - ignore
          }
        },
      },
    }
  );
}

/**
 * GET /api/admin/my-profiles - Get current user's restaurant profiles (with roles)
 * Returns the user's profiles linking them to restaurants with their roles
 */
export async function GET() {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get user's profiles with restaurant info
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('users_profiles')
      .select('*')
      .eq('user_id', user.id);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: 'Erro ao buscar perfis' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profiles: profiles || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/my-profiles:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
