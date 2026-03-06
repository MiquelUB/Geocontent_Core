/**
 * PXX — Supabase Admin Client (server-side only)
 * Uses service_role key to bypass RLS for admin operations.
 * This is the primary DB access method while Prisma direct connection
 * is unavailable (IPv6-only Supabase host).
 */

import { createClient } from "@supabase/supabase-js";

const fallbackUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const fallbackKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

export const supabaseAdmin = createClient(
  fallbackUrl,
  fallbackKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Helper: Get Supabase client for public (anon) access
 */
export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  );
}
