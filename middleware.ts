import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/ad-studio/login', '/ad-studio/review', '/api/auth', '/api/feedback', '/api/client-context', '/api/review']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  const auth = req.cookies.get('as_auth')?.value
  if (auth !== process.env.DASHBOARD_PASS) {
    return NextResponse.redirect(new URL('/ad-studio/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
