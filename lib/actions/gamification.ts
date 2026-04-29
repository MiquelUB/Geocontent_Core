'use server'

import { createClient, getSupabaseAdmin } from '@/lib/database/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { prisma } from "../database/prisma";
import { getUserProfile } from '@/lib/actions/auth';
import { GENERIC_ERROR_MESSAGE } from '@/lib/errors';
import path from 'path';
import fs from 'fs';
import os from 'os';

function logToFile(msg: string) {
  try {
    const logPath = path.join(os.tmpdir(), 'geocontent-server-debug.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) { }
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
        logToFile(`[GAMIFICATION] Route ${routeId} completed by ${userId}. Awarded 500 XP.`);
      }
    }
  } catch (e) {
    console.error("Error checking route completion:", e);
  }
}

export async function getUserScore(userId: string) {
  noStore();
  try {
    const unlocks = await prisma.userUnlock.findMany({
      where: { userId },
      select: { earnedXp: true, quizSolved: true }
    });

    const routePointsCount = await prisma.userRouteProgress.count({
      where: { userId }
    });

    const finalQuizzesPassedCount = await prisma.userRouteProgress.count({
      where: { userId, finalQuizPassed: true }
    });

    const totalScore = unlocks.reduce((acc, curr) => acc + (curr.earnedXp || 0), 0) + (routePointsCount * 500) + (finalQuizzesPassedCount * 1000);
    const solvedQuizzesCount = unlocks.filter(u => u.quizSolved).length;

    logToFile(`[GAMIFICATION] Calculated score for ${userId}: ${totalScore} XP and ${solvedQuizzesCount} quizes solved.`);

    return {
      totalScore,
      solvedQuizzesCount
    };
  } catch (err) {
    console.error('[getUserScore error]', err);
    return { totalScore: 0, solvedQuizzesCount: 0 };
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

export async function getPassportData(userId: string) {
  noStore();
  if (!userId) return [];

  try {
    // 1. Get the municipality's configured biome/theme
    const municipality = await prisma.municipality.findFirst({
      select: { themeId: true }
    });
    const municipalityBiome = (municipality as any)?.themeId || 'mountain';

    // Biome theme → stamp folder mapping
    const biomePathMap: Record<string, string> = {
      mountain: 'Montanya',
      coast: 'Mar',
      city: 'City',
      interior: 'Interior',
      bloom: 'Blossom',
    };
    const globalBiomePath = biomePathMap[municipalityBiome] || 'Montanya';

    // 2. List real stamp images for this biome from filesystem (server-side safe)
    const stampsDir = path.join(process.cwd(), 'public', 'stamps', globalBiomePath);
    let availableStampImages: string[] = [];
    try {
      availableStampImages = fs.readdirSync(stampsDir)
        .filter((f: string) => /\.(png|jpg|jpeg|webp)$/i.test(f))
        .sort(); // Alphabetical for determinism
    } catch {
      availableStampImages = ['bolet.webp']; // Safe fallback
    }

    // 3. Fetch all routes with POIs and this user's unlocks
    const routes = await prisma.route.findMany({
      where: { routePois: { some: {} } },
      include: {
        routePois: {
          include: {
            poi: {
              include: {
                userUnlocks: {
                  where: { userId },
                  select: { progress: true, unlockedAt: true, earnedXp: true, quizSolved: true }
                }
              }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return await Promise.all(routes.map(async (route, routeIdx) => {
      const orderedPois = route.routePois.map(rp => {
        const unlock = rp.poi.userUnlocks[0] || null;
        return {
          id: rp.poi.id,
          title: rp.poi.title,
          isVisited: unlock !== null,
          isQuizDone: unlock !== null && (unlock.progress ?? 0) >= 1.0,
          quizSolved: unlock?.quizSolved ?? false,
          progress: unlock?.progress ?? 0,
          unlockedAt: unlock?.unlockedAt ?? null,
          hasQuiz: !!rp.poi.manualQuiz,
        };
      });

      const totalPois = orderedPois.length;
      const visitedPois = orderedPois.filter(p => p.isVisited).length;
      const quizDonePois = orderedPois.filter(p => p.isQuizDone).length;
      // Stamp considered complete when ALL quizzes are done
      const isCompleted = totalPois > 0 && quizDonePois === totalPois;

      // Latest activity date for the stamp label
      const unlockDates = orderedPois
        .filter(p => p.unlockedAt)
        .map(p => new Date(p.unlockedAt!).getTime());
      const latestDate = unlockDates.length > 0
        ? new Date(Math.max(...unlockDates)).toLocaleDateString('ca-ES', {
          day: '2-digit', month: 'short', year: 'numeric'
        })
        : null;

      // Biome path per route (uses route's own themeId, falling back to municipality biome)
      const routeTheme = route.themeId?.toLowerCase() || municipalityBiome;
      const routeBiomePath = biomePathMap[routeTheme] || globalBiomePath;

      // List images for this route's specific biome, or reuse the global list
      let routeStampImages = availableStampImages;
      if (routeBiomePath !== globalBiomePath) {
        const routeStampsDir = path.join(process.cwd(), 'public', 'stamps', routeBiomePath);
        try {
          routeStampImages = fs.readdirSync(routeStampsDir)
            .filter((f: string) => /\.(png|jpg|jpeg|webp)$/i.test(f))
            .sort();
        } catch {
          routeStampImages = availableStampImages;
        }
      }

      // Deterministic image selection: hash route.id to an index
      const hashCode = route.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const imgIndex = routeStampImages.length > 0 ? hashCode % routeStampImages.length : 0;
      const stampImage = routeStampImages[imgIndex] || routeStampImages[0] || 'bolet.webp';
      const stampUrl = `/stamps/${routeBiomePath}/${stampImage}`;

      return {
        id: route.id,
        name: route.name || route.slug || 'Ruta',
        biome: routeTheme,
        biomePath: routeBiomePath,
        stampUrl,
        totalPois: Math.max(totalPois, 1),
        visitedPois,
        quizDonePois,
        poisProgress: orderedPois,
        isCompleted,
        date: latestDate,
        finalQuizPassed: (await prisma.userRouteProgress.findUnique({
          where: { userId_routeId: { userId, routeId: route.id } }
        }))?.finalQuizPassed ?? false,
      };
    }));
  } catch (err) {
    console.error('[getPassportData error]', err);
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
