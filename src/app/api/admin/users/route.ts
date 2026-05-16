import { NextRequest, NextResponse } from 'next/server'
import { isDevDatabase, getSupabaseAdmin, db } from '@/infrastructure/database'
import { usersProfiles } from '@/infrastructure/database/schema'
import { eq, and, asc } from 'drizzle-orm'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

// GET /api/admin/users - List users for a restaurant
export async function GET(_request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono'])

    const restaurantId = getRestaurantId(authUser)

    if (isDevDatabase()) {
      const result = await db
        .select()
        .from(usersProfiles)
        .where(and(eq(usersProfiles.restaurant_id, restaurantId)))
        .orderBy(asc(usersProfiles.created_at))

      return NextResponse.json({ users: result })
    } else {
      const supabase = getSupabaseAdmin()

      const { data: users, error } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json(
          { error: 'Failed to fetch users' },
          { status: 500 }
        )
      }

      return NextResponse.json({ users })
    }
  } catch (error) {
    console.error('Unexpected error in /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Invite a new staff member
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono'])

    const restaurantId = getRestaurantId(authUser)
    const body = await request.json()
    const { email, name, role } = body

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'email, name, and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['dono', 'gerente', 'atendente']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    if (isDevDatabase()) {
      // Check if user with this email already exists in the restaurant
      const existing = await db
        .select()
        .from(usersProfiles)
        .where(and(eq(usersProfiles.restaurant_id, restaurantId), eq(usersProfiles.email, email.toLowerCase())))
        .limit(1)

      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'A user with this email already exists in this restaurant' },
          { status: 409 }
        )
      }

      // Create invitation record
      const now = new Date().toISOString()
      const invitation = {
        id: crypto.randomUUID(),
        restaurant_id: restaurantId,
        email: email.toLowerCase(),
        name,
        role,
        created_at: now,
      }

      // In dev, we store directly in usersProfiles for simplicity
      await db.insert(usersProfiles).values({
        id: invitation.id,
        user_id: null, // Will be linked after actual signup
        restaurant_id: restaurantId,
        name,
        email: email.toLowerCase(),
        role: role as 'dono' | 'gerente' | 'atendente',
        created_at: now,
      })

      return NextResponse.json({ invitation }, { status: 201 })
    } else {
      const supabase = getSupabaseAdmin()

      // Check if user with this email already exists in the restaurant
      const { data: existingUser, error: checkError } = await supabase
        .from('users_profiles')
        .select('id, email')
        .eq('restaurant_id', restaurantId)
        .eq('email', email.toLowerCase())
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError)
        return NextResponse.json(
          { error: 'Failed to check existing user' },
          { status: 500 }
        )
      }

      if (existingUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists in this restaurant' },
          { status: 409 }
        )
      }

      // Create invitation record and send email via Supabase Auth
      // Note: In a real app, you'd use Supabase Auth's inviteByEmail function
      // For now, we'll create a pending invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          restaurant_id: restaurantId,
          email: email.toLowerCase(),
          name,
          role,
          status: 'pending',
        })
        .select()
        .single()

      if (inviteError) {
        console.error('Error creating invitation:', inviteError)
        return NextResponse.json(
          { error: 'Failed to create invitation' },
          { status: 500 }
        )
      }

      // In production, you would trigger the email here:
      // await supabase.auth.inviteUser(email)

      return NextResponse.json({ invitation }, { status: 201 })
    }
  } catch (error) {
    console.error('Unexpected error in /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
