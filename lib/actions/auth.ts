'use server'

import { getSupabaseAdmin } from '@/lib/database/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { prisma } from "../database/prisma";

import { GENERIC_ERROR_MESSAGE } from '@/lib/errors';

export async function loginOrRegister(name: string, email: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Check if user already exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return { success: false, error: GENERIC_ERROR_MESSAGE };
    }

    const existingAuthUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const isSuperAdmin = Boolean(superAdminEmail && email.toLowerCase() === superAdminEmail.toLowerCase());

    if (existingAuthUser) {
      // User exists, just ensure profile table is in sync
      let fullProfile = await getUserProfile(existingAuthUser.id);
      
      if (isSuperAdmin && fullProfile && fullProfile.role !== 'admin') {
        await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', existingAuthUser.id);
        fullProfile = await getUserProfile(existingAuthUser.id); // Reload
      }

      if (fullProfile) {
        return { success: true, user: fullProfile };
      }

      // If profile missing, create it
      const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
        id: existingAuthUser.id,
        username: name,
        role: isSuperAdmin ? 'admin' : 'user',
        xp: 0,
        level: 1
      });

      if (upsertError) throw upsertError;

      return { success: true, user: await getUserProfile(existingAuthUser.id) };
    }

    // 2. Create new user as CONFIRMED
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: 'NoPassword' + Math.random(),
      email_confirm: true,
      user_metadata: { username: name }
    });

    if (authError) throw authError;
    if (!authUser.user) throw new Error("No s'ha pogut crear l'usuari");

    // 3. Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authUser.user.id,
      username: name,
      role: isSuperAdmin ? 'admin' : 'user',
      xp: 0,
      level: 1
    });

    if (profileError) throw profileError;

    const fullProfile = await getUserProfile(authUser.user.id);
    return { success: true, user: fullProfile };
  } catch (err: any) {
    console.error('[loginOrRegister error]', err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

/**
 * Inicia sessió saltant-se el Magic Link (bypass de confirmació d'email)
 * Útil mentre no estigui configurat el correu.
 */
export async function loginAsVisitor(name: string, email: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Intentem buscar si l'usuari ja existeix a Auth per el seu email
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existing = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

    let finalUserId = existing?.id;

    if (!finalUserId) {
      // Si no existeix, el creem confirmat i sense enviar cap email
      const { data: authResult, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { username: name }
      });

      if (authError) throw authError;
      finalUserId = authResult.user?.id;
    }

    if (!finalUserId) throw new Error("No s'ha pogut establir l'identificador d'usuari");

    // Obtenim/Creem el perfil a la taula pública
    let profile = await getUserProfile(finalUserId);
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const isSuperAdmin = Boolean(superAdminEmail && email.toLowerCase() === superAdminEmail.toLowerCase());

    if (isSuperAdmin && profile && profile.role !== 'admin') {
      await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', finalUserId);
      profile = await getUserProfile(finalUserId); // Reload
    }

    return { success: true, user: profile };
  } catch (err: any) {
    console.error('[loginAsVisitor error]', err);
    return { success: false, error: "Error d'autenticació. Contacteu amb suport." };
  }
}

export async function verifyAdminPassword(municipalityId: string, password: string) {
  try {
    if (!password) return { success: false, error: "La clau és requerida" };
    const superPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (superPassword && password === superPassword) return { success: true };

    const muni = await prisma.municipality.findUnique({
      where: { id: municipalityId },
      select: { adminMasterPassword: true } as any
    }) as any;

    if (!muni || !muni.adminMasterPassword) {
      // Return a generic error to keep tests running a standard flow
      return { success: false, error: "Contrasenya incorrecta o no vàlida" };
    }

    return { success: muni.adminMasterPassword === password, error: "Contrasenya incorrecta" };
  } catch (err) {
    return { success: false, error: "Error de verificació" };
  }
}

export async function verifySuperAdminPassword(password: string) {
  const superPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (!superPassword) { console.error("[CRÍTIC] SUPER_ADMIN_PASSWORD no configurada."); return { success: false, error: "Error de configuració" }; }
  return { success: password === superPassword };
}

import { getUserProfileInternal } from '../services/auth-service';

export async function getUserProfile(userId: string) {
  noStore();
  return getUserProfileInternal(userId);
}

export async function elevateToAdmin(userId: string, password?: string) {
  try {
    if (!userId || !password) return { success: false, error: "Dades incompletes" };

    const superPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (!superPassword || password !== superPassword) return { success: false, error: "Contrasenya mestra incorrecta o sistema no configurat" };

    const supabaseAdmin = getSupabaseAdmin();
    
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);

    if (error) {
      console.error('Error elevating to admin:', error);
      return { success: false, error: "No s'ha pogut actualitzar el rol" };
    }

    revalidatePath('/');
    return { success: true, message: "Rol actualitzat a Administrador! Reinicia l'aplicació per aplicar els canvis." };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: "Error intern de servidor" };
  }
}
