import { prisma } from '@/lib/database/prisma';
import { getSupabaseAdmin } from '@/lib/database/supabase/server';

export async function getUserProfileInternal(userId: string) {
  if (!userId) return null;
  try {
    const supabaseAdmin = getSupabaseAdmin();
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUser?.user) {
        const email = authUser.user.email || '';
        const username = authUser.user.user_metadata?.username
          || email.split('@')[0]
          || 'Explorador';

        const { data: newProfile } = await supabaseAdmin
          .from('profiles')
          .insert({ id: userId, username, email })
          .select()
          .single();

        profile = newProfile;
      }
    }

    if (!profile) return null;

    const { count } = await supabaseAdmin
      .from('user_unlocks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      ...profile,
      visitedCount: count || 0,
      username: profile.username || profile.display_name || profile.name || "Explorador",
      avatarUrl: profile.avatar_url,
      xp: profile.xp || 0
    };
  } catch (err) {
    console.error('[getUserProfileInternal error]', err);
    return null;
  }
}
