import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { supabase } = await createClient(request)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isAdminRoute =
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/api/admin')

  const isMenuRoute = request.nextUrl.pathname.startsWith('/menu')

  if (!session && isAdminRoute) {
    // Don't redirect if already on login page
    if (request.nextUrl.pathname === '/admin/login') {
      return NextResponse.next()
    }
    const redirectUrl = new URL('/admin/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (!session && isMenuRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/menu/:path*'],
}
