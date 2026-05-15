import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger';


// GET /api/auth/profile - Obter perfil do usuário autenticado
export async function GET(_request: NextRequest) {
  try {
    // Criar client server para obter usuário autenticado via session cookies
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component - ignorar
            }
          },
        },
      }
    )

    // Obter usuário autenticado da sessão
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    // Criar client admin com service role key para buscar profile (bypass RLS)
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Admin client não precisa definir cookies
          },
        },
      }
    )

    // Buscar profile do usuário
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users_profiles')
      .select('role, restaurant_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      role: profile.role,
      restaurant_id: profile.restaurant_id,
    })
  } catch (error) {
    logger.error("auth", "Erro inesperado em /api/auth/profile:", { error: error })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
