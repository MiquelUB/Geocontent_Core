import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createClient = (cookieStore: any) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Contexto de Server Component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Contexto de Server Component
          }
        },
      },
    }
  )
}

// Admin client for specialized tasks (bypassing RLS)
export const getSupabaseAdmin = () => {
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!adminUrl || !adminKey) {
    throw new Error("Missing Supabase Admin Credentials");
  }

  return createSupabaseClient(adminUrl, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

