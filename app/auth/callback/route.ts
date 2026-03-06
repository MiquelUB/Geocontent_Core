import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    if (session?.user) {
      // Redirect to home with user info so the SPA can initialize the session
      const redirectUrl = new URL('/', requestUrl.origin)
      redirectUrl.searchParams.set('auth_success', '1')
      redirectUrl.searchParams.set('uid', session.user.id)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirect to home page after authentication
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
