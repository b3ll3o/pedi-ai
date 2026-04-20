import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/users/[id] - Get a single user
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const supabase = await createClient()

    const { data: user, error } = await supabase
      .from('users_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Unexpected error in /api/admin/users/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/users/[id] - Update user (role, name, active status)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, role, active } = body

    const supabase = await createClient()

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users_profiles')
      .select('id, role, restaurant_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Validate role if provided
    if (role !== undefined) {
      const validRoles = ['owner', 'manager', 'staff']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `role must be one of: ${validRoles.join(', ')}` },
          { status: 400 }
        )
      }

      // Prevent changing the last owner's role
      if (existingUser.role === 'owner' && role !== 'owner') {
        const { data: owners, error: ownersError } = await supabase
          .from('users_profiles')
          .select('id')
          .eq('restaurant_id', existingUser.restaurant_id as string)
          .eq('role', 'owner')

        if (ownersError) {
          console.error('Error checking owners:', ownersError)
          return NextResponse.json(
            { error: 'Failed to verify ownership' },
            { status: 500 }
          )
        }

        if ((owners?.length || 0) <= 1) {
          return NextResponse.json(
            { error: 'Cannot change the role of the last owner' },
            { status: 400 }
          )
        }
      }
    }

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (active !== undefined) updateData.active = active

    const { data: user, error: updateError } = await supabase
      .from('users_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Unexpected error in /api/admin/users/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/[id] - Remove a user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const supabase = await createClient()

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users_profiles')
      .select('id, role, restaurant_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent deleting the last owner
    if (existingUser.role === 'owner') {
      const { data: owners, error: ownersError } = await supabase
        .from('users_profiles')
        .select('id')
        .eq('restaurant_id', existingUser.restaurant_id as string)
        .eq('role', 'owner')

      if (ownersError) {
        console.error('Error checking owners:', ownersError)
        return NextResponse.json(
          { error: 'Failed to verify ownership' },
          { status: 500 }
        )
      }

      if ((owners?.length || 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last owner' },
          { status: 400 }
        )
      }
    }

    const { error: deleteError } = await supabase
      .from('users_profiles')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in /api/admin/users/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
