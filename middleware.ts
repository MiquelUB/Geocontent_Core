import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // 1. Executa la internacionalització per obtenir la resposta base
  const response = intlMiddleware(request);

  // 2. Definició de l'escut per rutes sensibles
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.includes('/admin');

  if (isAdminRoute) {
    // Inicialitza Supabase específicament per al middleware (manipulació de cookies)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
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

    // Verificació d'Autenticació (AuthN)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Accés denegat. Sessió requerida.' }, { status: 401 });
      }
      
      // Redirecció neta al login mantenint l'idioma actual
      const locale = pathname.split('/')[1] || 'ca';
      const loginUrl = new URL(`/${locale}/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  // Matcher actualitzat: INCLOU /api però exclou fitxers estàtics i interns de Next
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
