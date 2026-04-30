import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // 1. Executa la internacionalització primer
  const response = intlMiddleware(request);

  // Si next-intl necessita fer una redirecció de localització (ex: /admin -> /ca/admin)
  // respectem aquesta acció i sortim immediatament per evitar trencar el routing.
  if (response.status === 307 || response.status === 308) {
    return response;
  }

  const pathname = request.nextUrl.pathname;
  
  // 2. Definició de l'escut. EXCLOEM les rutes de login per evitar el bucle infinit.
  const isAdminRoute = pathname.includes('/admin') && !pathname.includes('/login');

  if (isAdminRoute) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Accés denegat. Sessió requerida.' }, { status: 401 });
      }
      
      // Com que hem respectat la redirecció prèvia, aquí sabem segur que hi ha locale (ex: /ca/admin)
      const locale = pathname.split('/')[1] || 'ca';
      const loginUrl = new URL(`/${locale}/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\..*).*)']
};
