'use server'

import { prisma } from "../database/prisma";
import { getSupabaseAdmin } from "@/lib/database/supabase/server";
import { TerritorialPackage, OfflineRoute, OfflinePoi } from "../types/offline";
import { packagerQueue } from "../queue/client";
import { revalidatePath } from "next/cache";

/**
 * Genera un Paquet Territorial desnormalitzat per al municipi especificat.
 * Aquest fitxer JSON és el cervell de la sincronització offline de l'App Mòbil.
 * Inclou rutes, POIs, metadades i URLs de media per a pre-càrrega.
 */
export async function generateTerritorialPackage(municipalityId: string) {
  try {
    const muni = await prisma.municipality.findUnique({
      where: { id: municipalityId },
      include: {
        routes: {
          include: {
            routePois: {
              orderBy: { orderIndex: 'asc' },
              include: { poi: true }
            }
          }
        }
      }
    });

    if (!muni) throw new Error("Municipi no trobat");

    // Càlcul dinàmic del Bounding Box (BBOX) basat en els POIs existents
    const allPois = muni.routes.flatMap(r => r.routePois.map(rp => rp.poi));
    const allLats = allPois.map(p => p.latitude || 0).filter(lat => lat !== 0);
    const allLngs = allPois.map(p => p.longitude || 0).filter(lng => lng !== 0);

    // BBOX segur amb fallback a la geografia de Catalunya [minLng, minLat, maxLng, maxLat]
    const safeBbox: [number, number, number, number] = (allLats.length > 0 && allLngs.length > 0)
      ? [
          Math.min(...allLngs), 
          Math.min(...allLats), 
          Math.max(...allLngs), 
          Math.max(...allLats)
        ]
      : [0.15, 40.5, 3.3, 42.9];

    const offlineRoutes: OfflineRoute[] = muni.routes.map(route => {
      const pois: OfflinePoi[] = route.routePois.map(rp => {
        const p = rp.poi;
        // Consolidació de totes les URLs d'actius per al CacheManager del mòbil
        const mediaUrls = [
          p.appThumbnail,
          p.header16x9,
          p.audioUrl,
          ...(p.videoUrls || []),
          ...(p.carouselImages || [])
        ].filter((url): url is string => !!url);

        return {
          id: p.id,
          latitude: p.latitude ?? 0,
          longitude: p.longitude ?? 0,
          // Fallback al català si les traduccions no estan poblades
          title: (p.titleTranslations as Record<string, string>) || { ca: p.title },
          icon: p.icon || 'map-pin',
          mediaUrls,
          quiz: p.manualQuiz as OfflinePoi['quiz']
        };
      });

      return {
        id: route.id,
        slug: route.slug,
        title: (route.nameTranslations as Record<string, string>) || { ca: route.name || '' },
        description: (route.descriptionTranslations as Record<string, string>) || { ca: route.description || '' },
        estimatedTime: 0, // Placeholder: Futur càlcul basat en waypoints
        distance: 0,      // Placeholder: Futur càlcul basat en track
        pois
      };
    });

    // Construcció del paquet territorial final
    const packageData: TerritorialPackage = {
      // Format: YYYYMMDDHHMM (Ex: 202604292145)
      version: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12),
      municipality: {
        id: muni.id,
        name: muni.name,
        bbox: safeBbox
      },
      config: {
        biomeTheme: muni.themeId || 'mountain',
        // Referències a actius globals de configuració
        iconsMappingUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/geocontent/config/icons-mapping.json`
      },
      cartography: {
        // PMTiles per a suport de Range Requests i baix consum de dades
        vectorTileUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/territorial-packages/${muni.id}/cartography.pmtiles`,
        styleUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/geocontent/config/map-style.json`
      },
      routes: offlineRoutes
    };

    const fileBody = JSON.stringify(packageData, null, 2);
    
    // Upload a Supabase Storage (Bucket dedicat per a paquets)
    // El fitxer es guarda a [municipalityId]/package.json
    const { error } = await getSupabaseAdmin().storage
      .from('territorial-packages')
      .upload(`${muni.id}/package.json`, Buffer.from(fileBody), {
        contentType: 'application/json',
        upsert: true
      });

    if (error) throw error;

    // Actualitzar la data de publicació per al control de deltes
    await (prisma.municipality as any).update({
      where: { id: municipalityId },
      data: { 
        lastPublishedAt: new Date(),
        packagingStatus: 'IDLE'
      }
    });

    revalidatePath('/admin');

    return { 
      success: true, 
      version: packageData.version,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/territorial-packages/${muni.id}/package.json`
    };
  } catch (err: any) {
    console.error("[generateTerritorialPackage Error]", err);
    return { success: false, error: err.message || "Error desconegut generant el paquet." };
  }
}

/**
 * Afegeix la tasca d'empaquetat a la cua de BullMQ per a execució asíncrona.
 * Delegació del 'múscul' segons GEMINI.md.
 */
export async function queueTerritorialPackageAction(municipalityId: string) {
  try {
    await packagerQueue.add('generate-package', { municipalityId }, {
      removeOnComplete: true,
      attempts: 3
    });
    return { success: true, message: "La publicació offline s'ha iniciat en segon pla." };
  } catch (err: any) {
    console.error("[queueTerritorialPackageAction]", err);
    return { success: false, error: "No s'ha pogut iniciar la tasca de background." };
  }
}

/**
 * Comprova si hi ha canvis en rutes o POIs posteriors a la darrera publicació.
 * Detecció de deltes per a optimització de la UI de l'Admin.
 */
export async function checkPendingChanges(municipalityId: string) {
  try {
    const muni = await (prisma.municipality as any).findUnique({
      where: { id: municipalityId },
      select: { lastPublishedAt: true }
    });

    if (!muni) return { hasChanges: false };

    const lastPub = muni.lastPublishedAt || new Date(0);

    // Comprovar si hi ha alguna ruta modificada després de lastPub
    const recentRoute = await prisma.route.findFirst({
      where: {
        municipalityId,
        updatedAt: { gt: lastPub }
      },
      select: { id: true }
    });

    if (recentRoute) return { hasChanges: true };

    // Comprovar si hi ha algun POI modificat després de lastPub
    const recentPoi = await prisma.poi.findFirst({
      where: {
        municipalityId,
        updatedAt: { gt: lastPub }
      },
      select: { id: true }
    });

    if (recentPoi) return { hasChanges: true };

    return { hasChanges: false };
  } catch (err) {
    console.error("[checkPendingChanges]", err);
    return { hasChanges: false };
  }
}

/**
 * Obté l'estat actual de l'empaquetat del municipi.
 * Usat per al polling des del frontend.
 */
export async function getPackagingStatus(municipalityId: string) {
  try {
    const muni = await (prisma.municipality as any).findUnique({
      where: { id: municipalityId },
      select: { 
        packagingStatus: true,
        lastPublishedAt: true
      }
    });

    if (!muni) return { status: 'IDLE' };
    return { 
      status: (muni.packagingStatus || 'IDLE') as 'IDLE' | 'PROCESSING' | 'ERROR',
      lastSync: muni.lastPublishedAt 
    };
  } catch (err) {
    console.error("[getPackagingStatus]", err);
    return { status: 'ERROR' };
  }
}
