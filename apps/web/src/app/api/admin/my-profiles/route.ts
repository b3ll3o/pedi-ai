import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { db, isDevDatabase, getGlobalToken } from '@/infrastructure/database';
import { usersProfiles } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/admin/my-profiles - Get current user's restaurant profiles (with roles)
 * Returns the user's profiles linking them to restaurants with their roles
 */
export async function GET() {
  try {
    let userId: string | null = null;

    if (isDevDatabase()) {
      // In dev, get user ID from global JWT token
      const token = getGlobalToken();
      if (token) {
        // Decode JWT payload (base64url)
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        userId = payload.sub || null;
      }
    } else {
      // Get session from cookies (production Supabase)
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
                // Server component - ignore
              }
            },
          },
        }
      );

      const {
        data: { user },
        error: authError,
      } = await supabaseAuth.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Get user's profiles
    const profiles = await db.select().from(usersProfiles).where(eq(usersProfiles.user_id, userId));

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('Error in GET /api/admin/my-profiles:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
