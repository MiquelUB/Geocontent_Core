import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { type NextRequest } from 'next/server'

const intlMiddleware = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  // Executar el middleware de next-intl per gestionar el locale
  const response = intlMiddleware(request)

  // Aquí es podria afegir la lògica de Supabase si calgués en el futur
  // per gestionar sessions en paral·lel a la internacionalització.
  
  return response
}

export const config = {
  // Matcher que exclou rutes d'API, fitxers estàtics i metadades
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
