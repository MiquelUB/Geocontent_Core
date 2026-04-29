'use server'

import { createClient, getSupabaseAdmin } from '@/lib/database/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { prisma } from "../database/prisma";
import { getUserProfile } from '@/lib/actions/auth';
import { GENERIC_ERROR_MESSAGE } from '@/lib/errors';
import { getPassportData as _getPassportData, getUserScore as _getUserScore } from '../services/queries';

// --- SERVER ACTION WRAPPERS (Cervell -> Múscul) ---
export async function getPassportData(userId: string) {
    return _getPassportData(userId);
}

export async function getUserScore(userId: string) {
    return _getUserScore(userId);
}

async function updateProfileXpAndLevel(userId: string, points: number) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { xp: true, level: true }
  });

  if (profile) {
    const newXp = (profile.xp || 0) + points;
    // Simple leveling logic: every 500 XP is a level
    const newLevel = Math.floor(newXp / 500) + 1;

    await prisma.profile.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel }
    });
  }
}

export async function recordVisit(userId: string, poiId: string) {
  try {
    const poi = await prisma.poi.findUnique({ where: { id: poiId } });
    if (!poi) return { success: false, error: "POI not found" };

    const existing = await prisma.userUnlock.findUnique({
      where: { userId_poiId: { userId, poiId } }
    });

    if (existing) return { success: true, message: 'Already visited' };

    // Award 100 XP for unlocking POI
    const points = 100;

    await prisma.userUnlock.create({
      data: {
        userId,
        poiId,
        unlockedAt: new Date(),
        earnedXp: points,
        progress: 0.1 // Just visited, quiz not necessarily done
      }
    });

    // Update Profile XP & Level
    await updateProfileXpAndLevel(userId, points);

    // Fetch updated for return
    const updated = await prisma.profile.findUnique({ where: { id: userId }, select: { level: true, xp: true } });
    
    // CHECK ROUTE COMPLETION
    const routePois = await prisma.routePoi.findMany({
      where: { poiId: poiId },
      select: { routeId: true }
    });

    for (const rp of routePois) {
      await checkAndAwardRouteCompletion(userId, rp.routeId);
    }

    const updatedUser = await getUserProfile(userId);
    return { success: true, user: updatedUser };
  } catch (err) {
    console.error('[recordVisit error]', err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

async function checkAndAwardRouteCompletion(userId: string, routeId: string) {
  try {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: { routePois: true }
    });
    if (!route) return;

    const totalPois = route.routePois.length;
    const unlockedPois = await prisma.userUnlock.count({
      where: {
        userId,
        poiId: { in: route.routePois.map(rp => rp.poiId) }
      }
    });

    if (totalPois > 0 && unlockedPois === totalPois) {
      // Check if already completed
      const existingProgress = await prisma.userRouteProgress.findUnique({
        where: { userId_routeId: { userId, routeId } }
      });

      if (!existingProgress) {
        // Award 500 XP for completion
        // Create record
        await prisma.userRouteProgress.create({
          data: {
            userId,
            routeId,
            completedAt: new Date()
          }
        });

        // Award XP
        await updateProfileXpAndLevel(userId, 500);
      }
    }
  } catch (e) {
    console.error("Error checking route completion:", e);
  }
}

export async function getVisitedLegends(userId: string) {
  noStore();
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from('visited_legends')
    .select(`
            *,
            legend:legends(*)
        `)
    .eq('user_id', userId)
    .order('visited_at', { ascending: false });

  if (error) {
    console.error('Error fetching visited:', error);
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((item: any) => ({
    ...item.legend,
    visited_at: item.visited_at
  }));
}

export async function getUserVisits(userId: string) {
  try {
    const visits = await prisma.userUnlock.findMany({
      where: { userId },
      include: {
        poi: {
          select: { title: true }
        }
      },
      orderBy: { unlockedAt: 'desc' }
    });

    return visits.map(v => ({
      id: `${v.userId}-${v.poiId}`,
      poi: v.poi,
      entryTime: v.unlockedAt.toISOString(),
      durationSeconds: null, 
      rating: v.quizSolved ? 5 : null 
    }));
  } catch (error) {
    console.error('Error fetching user visits (unlocks):', error);
    return [];
  }
}


export async function completePoiQuizAction(poiId: string, userId: string) {
  try {
    // 50 XP for correct quiz
    const points = 50;

    const unlock = await prisma.userUnlock.findUnique({
      where: { userId_poiId: { userId, poiId } },
      select: { quizSolved: true }
    });

    if (unlock?.quizSolved) return { success: true, message: 'Quiz already solved' };

    await prisma.userUnlock.upsert({
      where: { userId_poiId: { userId, poiId } },
      create: {
        userId,
        poiId,
        unlockedAt: new Date(),
        earnedXp: 100 + points, // Unlocked (100) + Quiz (50)
        progress: 1.0,
        quizSolved: true
      },
      update: {
        progress: 1.0,
        quizSolved: true,
        earnedXp: { increment: points }
      }
    });

    // Give XP & Level
    await updateProfileXpAndLevel(userId, points);

    const updatedUser = await getUserProfile(userId);
    revalidatePath('/profile');
    return { success: true, user: updatedUser };
  } catch (err) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function completeFinalRouteQuizAction(routeId: string, userId: string) {
  try {
    // 1000 XP for final quiz
    const points = 1000;

    await prisma.userRouteProgress.upsert({
      where: { userId_routeId: { userId, routeId } },
      create: {
        userId,
        routeId,
        finalQuizPassed: true,
        completedAt: new Date()
      },
      update: {
        finalQuizPassed: true
      }
    });

    // Give XP & Level
    await updateProfileXpAndLevel(userId, points);

    revalidatePath('/profile');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}
