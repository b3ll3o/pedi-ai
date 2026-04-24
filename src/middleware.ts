import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase } = await createClient(request)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isAdminRoute =
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/api/admin')

  if (!session && isAdminRoute) {
    const redirectUrl = new URL('/admin/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
