'use server'

import { createClient, supabaseAdmin } from '@/lib/database/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { cache } from 'react';
import { prisma } from "./database/prisma";
import { videoQueue } from "./queue/client";
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { generatePoiQuiz, generateFinalRouteQuiz } from './services/openrouter';

const GENERIC_ERROR_MESSAGE = "S'ha produït un error al processar la sol·licitud";

function logToFile(msg: string) {
  try {
    fs.appendFileSync(path.join(process.cwd(), 'server-debug.log'), `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) { }
}

// --- Validació de Dades (Zod) ---

const CreateLegendSchema = z.object({
  title: z.string().min(1, "El títol és obligatori"),
  description: z.string().optional(),
  category: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  route_id: z.string().uuid().optional().nullable(),
  text_content: z.string().optional(),
  carousel_images: z.string().optional().transform(val => {
    try { return val ? JSON.parse(val) : [] } catch { return [] }
  })
});

const CreatePoiSchema = z.object({
  title: z.string().min(1, "El títol és obligatori"),
  description: z.string().optional(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  route_id: z.string().uuid("La ID de ruta és obligatòria"),
  text_content: z.string().optional(),
  type: z.string().optional(),
  manual_quiz: z.string().optional().transform(val => {
    try { return val ? JSON.parse(val) : null } catch { return null }
  }),
  video_urls: z.string().optional().transform(val => {
    try { return val ? JSON.parse(val) : [] } catch { return [] }
  }),
  carousel_images: z.string().optional().transform(val => {
    try { return val ? JSON.parse(val) : [] } catch { return [] }
  }),
  icon: z.string().optional()
});

export async function getOrCreateMunicipalityByName(name: string): Promise<string> {
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  const existing = await prisma.municipality.findUnique({
    where: { slug }
  });
  if (existing) return existing.id;

  const created = await prisma.municipality.create({
    data: { name, slug }
  });
  return created.id;
}

export async function getDefaultMunicipalityId(): Promise<string | null> {
  try {
    const municipality = await prisma.municipality.findFirst({ select: { id: true } });
    return municipality?.id ?? null;
  } catch {
    return null;
  }
}

export async function getDefaultMunicipalityTheme(): Promise<string> {
  try {
    const municipality = await prisma.municipality.findFirst({ select: { themeId: true } });
    return (municipality as any)?.themeId || 'mountain';
  } catch {
    return 'mountain';
  }
}




export async function uploadFile(file: File, bucket: string = 'geocontent') {
  logToFile(`uploadFile called for: ${file.name} to bucket: ${bucket}`);
  // Sanitize filename: remove spaces and non-standard characters
  const safeName = file.name.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  const fileName = `${uuidv4()}_${safeName}`;

  logToFile(`[uploadFile] Starting upload: ${file.name} -> ${fileName} (${(file.size / 1024).toFixed(1)} KB)`);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use admin client for storage uploads to ensure success in admin context
    // RLS for storage is not triggered for admin client
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });

    if (error) {
      logToFile(`[uploadFile] Storage Error: ${JSON.stringify(error)}`);
      throw error;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);

    logToFile(`[uploadFile] SUCCESS: ${publicUrl}`);
    return publicUrl;
  } catch (err: any) {
    logToFile(`[uploadFile] CRASHED: ${err.message}`);
    throw err;
  }
}

export async function getLegends() {
  noStore();
  try {
    const routes = await prisma.route.findMany({
      where: {
        routePois: { some: {} }
      },
      include: {
        municipality: { select: { name: true } },
        routePois: {
          include: {
            poi: {
              include: { userUnlocks: true }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    const mapped = routes.map(r => mapRoute(r));
    console.log("[DEBUG getLegends] First route title:", mapped[0]?.title);
    console.log("[DEBUG getLegends] First POI textContent:", mapped[0]?.pois[0]?.textContent);
    return mapped;
  } catch (err: any) {
    console.error(" [Error in getLegends]:", err);
    return [];
  }
}

export async function getAdminLegends() {
  noStore();
  try {
    const routes = await prisma.route.findMany({
      include: {
        municipality: { select: { name: true } },
        routePois: {
          include: {
            poi: {
              include: { userUnlocks: true }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return routes.map(r => mapRoute(r));
  } catch (err: any) {
    console.error(" [Error in getAdminLegends]:", err);
    return [];
  }
}

function mapRoute(route: any) {
  const firstPoi = route.routePois?.[0]?.poi;
  const pois = route.routePois?.map((rp: any) => ({
    id: rp.poi.id,
    title: rp.poi.title,
    description: rp.poi.description || '',
    latitude: rp.poi.latitude,
    longitude: rp.poi.longitude,
    image_url: rp.poi.appThumbnail || rp.poi.images?.[0] || '',
    orderIndex: rp.orderIndex ?? 0,
    icon: rp.poi.icon || null,
    // NOUS CAMPS PER DETALL COMPLERT
    textContent: rp.poi.textContent || '',
    audioUrl: rp.poi.audioUrl || '',
    videoUrls: rp.poi.videoUrls || [],
    carouselImages: rp.poi.carouselImages || [],
    header16x9: rp.poi.header16x9 || '',
    is_recapture: rp.poi.isRecapture || false,
    appThumbnail: rp.poi.appThumbnail || '',
    images: rp.poi.images || [],
    videoMetadata: rp.poi.videoMetadata || {},
    manualQuiz: rp.poi.manualQuiz,
    type: rp.poi.type,
    userUnlocks: rp.poi.userUnlocks || [],
  })) ?? [];

  const muniName = (route.municipality?.name || route.municipality_name || '').replace(/^Ajuntament de /i, '');
  const title = route.title || route.name || route.slug || 'Sense Títol';

  return {
    id: route.id,
    title: title,
    description: route.description || '',
    category: route.themeId || '',
    location_name: muniName || route.location_name || '',
    latitude: firstPoi?.latitude ?? 0,
    longitude: firstPoi?.longitude ?? 0,
    image_url: route.thumbnail1x1 || firstPoi?.appThumbnail || firstPoi?.images?.[0] || '',
    hero_image_url: route.thumbnail1x1 || firstPoi?.header16x9 || '',
    audio_url: firstPoi?.audioUrl || '',
    video_url: firstPoi?.videoUrls?.[0] || '',
    icon: firstPoi?.icon || null,
    is_active: true,
    poiCount: pois.length,
    pois,
    thumbnail1x1: route.thumbnail1x1 || '',
    downloadRequired: route.downloadRequired || false,
    // Camps pel detall de la ruta (si s'usa com a POI únic)
    textContent: firstPoi?.textContent || '',
    videoUrls: firstPoi?.videoUrls || [],
    carouselImages: firstPoi?.carouselImages || [],
    header16x9: firstPoi?.header16x9 || '',
    images: firstPoi?.images || [],
    manualQuiz: firstPoi?.manualQuiz,
    userUnlocks: firstPoi?.userUnlocks || [],
  };
}




export async function createLegend(formData: FormData) {
  try {
    const validated = CreateLegendSchema.parse(Object.fromEntries(formData.entries()));

    const routeThumbnailFile = formData.get('thumbnail_file') as File || null
    const appThumbFile = formData.get('app_thumbnail_file') as File || null
    const headerFile = formData.get('header_file') as File || null
    const audioFile = formData.get('audio_file') as File || null
    const videoFile = formData.get('video_file') as File || null

    const routeThumbnail = routeThumbnailFile?.size > 0 ? await uploadFile(routeThumbnailFile) : (formData.get('thumbnail_1x1') as string || '')
    const appThumbnail = appThumbFile?.size > 0 ? await uploadFile(appThumbFile) : (formData.get('app_thumbnail') as string || '')
    const header16x9 = headerFile?.size > 0 ? await uploadFile(headerFile) : (formData.get('header_16x9') as string || '')
    const audio_url = audioFile?.size > 0 ? await uploadFile(audioFile) : (formData.get('audio_url') as string || '')
    const video_url = videoFile?.size > 0 ? await uploadFile(videoFile) : (formData.get('video_url') as string || '')

    const { title, description, category, latitude, longitude, route_id, text_content, carousel_images } = validated;

    const validThemes: any = ['mountain', 'coast', 'city', 'interior', 'bloom'];
    let themeId = category?.toLowerCase() as any;
    if (!validThemes.includes(themeId)) themeId = "mountain";

    const municipalityId = await getDefaultMunicipalityId();
    if (!municipalityId) return { success: false, error: GENERIC_ERROR_MESSAGE };

    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.route.create({
        data: {
          municipalityId,
          name: title,
          slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now(),
          description,
          themeId,
          thumbnail1x1: routeThumbnail || null,
          downloadRequired: formData.get('download_required') === 'true'
        }
      });

      const targetRouteId = route_id || route.id;

      const poi = await tx.poi.create({
        data: {
          municipalityId,
          title: title,
          description,
          latitude: latitude || 0,
          longitude: longitude || 0,
          images: appThumbnail ? [appThumbnail] : [],
          audioUrl: audio_url,
          videoUrls: video_url ? [video_url] : [],
          textContent: text_content,
          appThumbnail,
          header16x9,
          carouselImages: carousel_images as string[]
        }
      });

      await tx.routePoi.create({
        data: {
          routeId: targetRouteId,
          poiId: poi.id,
          orderIndex: 0
        }
      });

      return route;
    });

    return { success: true, id: result.id };
  } catch (err: any) {
    console.error("[createLegend error]", err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function updateRoute(id: string, formData: FormData) {
  const name = formData.get('title') as string
  const description = formData.get('description') as string || ''
  const location = formData.get('location') as string || ''
  const category = formData.get('category') as string || 'mountain'
  const thumbnailFile = formData.get('thumbnail_file') as File || null
  let thumbnail1x1 = formData.get('thumbnail_1x1') as string || ''

  if (thumbnailFile && thumbnailFile.size > 0) {
    thumbnail1x1 = await uploadFile(thumbnailFile);
  }

  const downloadRequired = formData.get('download_required') === 'true';
  const municipalityId = await getOrCreateMunicipalityByName(location);

  try {
    await prisma.$executeRaw`
            UPDATE routes 
            SET 
                name = ${name}, 
                description = ${description}, 
                municipality_id = ${municipalityId},
                theme_id = ${category},
                thumbnail1x1 = ${thumbnail1x1 || null},
                download_required = ${downloadRequired}
            WHERE id = ${id}
        `;
    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}


export async function createRoute(formData: FormData) {
  const name = formData.get('title') as string
  const description = formData.get('description') as string || ''
  const category = formData.get('category') as string || 'mountain'
  const thumbnailFile = formData.get('thumbnail_file') as File || null
  let thumbnail1x1 = formData.get('thumbnail_1x1') as string || ''

  if (thumbnailFile && thumbnailFile.size > 0) {
    thumbnail1x1 = await uploadFile(thumbnailFile);
  }

  const location = formData.get('location') as string || 'General'
  const downloadRequired = formData.get('download_required') === 'true';
  const municipalityId = await getOrCreateMunicipalityByName(location);

  try {
    const id = uuidv4();
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now();

    await prisma.$executeRaw`
      INSERT INTO routes (id, municipality_id, name, slug, description, theme_id, thumbnail1x1, download_required, created_at, updated_at)
      VALUES (
        ${id}, 
        ${municipalityId}, 
        ${name}, 
        ${slug}, 
        ${description}, 
        ${category}, 
        ${thumbnail1x1 || null},
        ${downloadRequired},
        NOW(),
        NOW()
      )
    `;
    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, id };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function createPoi(formData: FormData) {
  try {
    const validated = CreatePoiSchema.parse(Object.fromEntries(formData.entries()));
    const { title, description, latitude, longitude, route_id, text_content, video_urls, carousel_images, icon } = validated;

    const appThumbFile = formData.get('app_thumbnail_file') as File || null
    const headerFile = formData.get('header_file') as File || null
    const audioFile = formData.get('audio_file') as File || null

    const appThumbnail = appThumbFile?.size > 0 ? await uploadFile(appThumbFile) : (formData.get('app_thumbnail') as string || '')
    const header16x9 = headerFile?.size > 0 ? await uploadFile(headerFile) : (formData.get('header_16x9') as string || '')
    const audioUrl = audioFile?.size > 0 ? await uploadFile(audioFile) : (formData.get('audio_url') as string || '')

    // Multi-slot video uploads
    const videoSlotCount = parseInt(formData.get('video_slot_count') as string || '0', 10)
    const uploadedVideoUrls: string[] = []
    for (let i = 0; i < videoSlotCount; i++) {
      const file = formData.get(`video_file_${i}`) as File | null
      if (file && file.size > 0) {
        uploadedVideoUrls.push(await uploadFile(file))
      }
    }

    const finalVideoUrls = [
      ...uploadedVideoUrls,
      ...(video_urls as string[]).filter(u => u && u.startsWith('http') && !uploadedVideoUrls.includes(u))
    ]

    // Carousel file uploads
    const carouselFileCount = parseInt(formData.get('carousel_file_count') as string || '0', 10)
    const carouselUrlsFromForm = carousel_images as string[]
    const finalCarouselImages: string[] = []

    let urlIdx = 0
    for (let i = 0; i < carouselFileCount; i++) {
      const file = formData.get(`carousel_file_${i}`) as File | null
      if (file && file.size > 0) {
        finalCarouselImages.push(await uploadFile(file))
      } else {
        if (carouselUrlsFromForm[urlIdx]) {
          finalCarouselImages.push(carouselUrlsFromForm[urlIdx])
          urlIdx++
        }
      }
    }

    let municipalityId = await getDefaultMunicipalityId();

    // If assigned to a route, try to inherit its municipality instead of a hardcoded default
    if (route_id) {
      const parentRoute = await prisma.route.findUnique({
        where: { id: route_id },
        select: { municipalityId: true }
      });
      if (parentRoute?.municipalityId) {
        municipalityId = parentRoute.municipalityId;
      }
    }

    if (!municipalityId) return { success: false, error: GENERIC_ERROR_MESSAGE };

    const result = await prisma.$transaction(async (tx) => {
      const poi = await tx.poi.create({
        data: {
          municipalityId,
          title,
          description,
          latitude,
          longitude,
          images: appThumbnail ? [appThumbnail] : [],
          audioUrl,
          videoUrls: finalVideoUrls,
          textContent: text_content,
          type: validated.type ? (validated.type as any) : null,
          manualQuiz: validated.manual_quiz,
          appThumbnail,
          header16x9,
          icon,
          carouselImages: finalCarouselImages
        }
      });

      if (route_id) {
        const existingCount = await tx.routePoi.count({ where: { routeId: route_id } });
        await tx.routePoi.create({
          data: {
            routeId: route_id,
            poiId: poi.id,
            orderIndex: existingCount
          }
        });
      }
      return poi;
    });

    revalidatePath('/admin');
    return { success: true, id: result.id };
  } catch (err: any) {
    console.error('[createPoi error]', err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function updatePoi(id: string, formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const latitude = parseFloat(formData.get('latitude') as string);
  const longitude = parseFloat(formData.get('longitude') as string);

  const appThumbFile = formData.get('app_thumbnail_file') as File | null;
  const headerFile = formData.get('header_file') as File | null;
  const audioFile = formData.get('audio_file') as File | null;

  const appThumbnail = (appThumbFile?.size ?? 0) > 0 ? await uploadFile(appThumbFile!) : (formData.get('app_thumbnail') as string || '');
  const header16x9 = (headerFile?.size ?? 0) > 0 ? await uploadFile(headerFile!) : (formData.get('header_16x9') as string || '');
  const audioUrl = (audioFile?.size ?? 0) > 0 ? await uploadFile(audioFile!) : (formData.get('audio_url') as string || '');

  // Multi-slot video: same logic as createPoi
  const videoSlotCount = parseInt(formData.get('video_slot_count') as string || '0', 10);
  const urlsFromForm: string[] = JSON.parse(formData.get('video_urls') as string || '[]');
  const uploadedVideoUrls: string[] = [];
  for (let i = 0; i < videoSlotCount; i++) {
    const file = formData.get(`video_file_${i}`) as File | null;
    if (file && file.size > 0) {
      uploadedVideoUrls.push(await uploadFile(file));
    }
  }
  const videoUrls = [
    ...uploadedVideoUrls,
    ...urlsFromForm.filter(u => u && u.startsWith('http') && !uploadedVideoUrls.includes(u))
  ];

  const textContent = formData.get('text_content') as string || '';
  const icon = formData.get('icon') as string || null;

  // Carousel: handle files and existing URLs preserving order
  const carouselFileCount = parseInt(formData.get('carousel_file_count') as string || '0', 10);
  const carouselUrlsFromForm: string[] = JSON.parse(formData.get('carousel_images') as string || '[]');
  const finalCarouselImages: string[] = [];

  let urlIdx = 0;
  for (let i = 0; i < carouselFileCount; i++) {
    const file = formData.get(`carousel_file_${i}`) as File | null;
    if (file && file.size > 0) {
      finalCarouselImages.push(await uploadFile(file));
    } else {
      if (carouselUrlsFromForm[urlIdx]) {
        finalCarouselImages.push(carouselUrlsFromForm[urlIdx]);
        urlIdx++;
      }
    }
  }

  try {
    const type = formData.get('type') as string;
    const manualQuizStr = formData.get('manual_quiz') as string;
    let manualQuiz = null;
    try { if (manualQuizStr) manualQuiz = JSON.parse(manualQuizStr); } catch (e) { }

    await prisma.poi.update({
      where: { id },
      data: {
        title,
        description,
        latitude,
        longitude,
        audioUrl,
        videoUrls,
        textContent,
        appThumbnail,
        header16x9,
        icon,
        type: type ? (type as any) : null,
        manualQuiz,
        carouselImages: finalCarouselImages,
        images: appThumbnail ? [appThumbnail] : undefined,
      }
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error('[updatePoi error]', err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function updateLegend(id: string, formData: FormData) {
  const name = formData.get('title') as string;
  const description = formData.get('description') as string;
  const category = formData.get('category') as string;
  const latitude = parseFloat(formData.get('latitude') as string);
  const longitude = parseFloat(formData.get('longitude') as string);
  const video_url = formData.get('video_url') as string;
  const image_url = formData.get('image_url') as string;
  const audio_url = formData.get('audio_url') as string;

  // New Fields
  const textContent = formData.get('text_content') as string;
  const appThumbnail = formData.get('app_thumbnail') as string;
  const header16x9 = formData.get('header_16x9') as string;
  const carouselImages = formData.get('carousel_images') ? JSON.parse(formData.get('carousel_images') as string) : undefined;

  const validThemes: any = ['mountain', 'coast', 'city', 'interior', 'bloom'];
  let themeId = category?.toLowerCase() as any;
  if (!validThemes.includes(themeId)) themeId = undefined;

  try {
    await prisma.$transaction(async (tx) => {
      // Update Route
      await tx.route.update({
        where: { id },
        data: {
          name: name,
          description,
          themeId: themeId || undefined,
        }
      });

      // Update associated POIs
      const routePois = await tx.routePoi.findMany({
        where: { routeId: id },
        include: { poi: true }
      });

      for (const rp of routePois) {
        const poiUpdates: any = {
          title: name,
          description,
          latitude: !isNaN(latitude) ? latitude : undefined,
          longitude: !isNaN(longitude) ? longitude : undefined,
          audioUrl: audio_url || undefined,
          videoUrls: video_url ? [video_url] : undefined,
          textContent: textContent || undefined,
          appThumbnail: appThumbnail || undefined,
          header16x9: header16x9 || undefined,
          carouselImages: carouselImages || undefined
        };

        if (image_url) {
          poiUpdates.images = [image_url];
        }

        await tx.poi.update({
          where: { id: rp.poiId },
          data: poiUpdates
        });
      }
    });

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function deleteLegend(id: string) {
  try {
    await prisma.route.delete({
      where: { id }
    });
    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}




// New Route-Building Actions
export async function addPoiToRoute(routeId: string, poiId: string, orderIndex: number) {
  try {
    await prisma.routePoi.create({
      data: { routeId, poiId, orderIndex }
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function removePoiFromRoute(routeId: string, poiId: string) {
  try {
    await prisma.routePoi.delete({
      where: { routeId_poiId: { routeId, poiId } }
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function reorderRoutePois(routeId: string, poiIds: string[]) {
  try {
    await prisma.$transaction(
      poiIds.map((id, index) =>
        prisma.routePoi.update({
          where: { routeId_poiId: { routeId, poiId: id } },
          data: { orderIndex: index }
        })
      )
    );
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function getRouteWithPois(routeId: string) {
  noStore();
  try {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        routePois: {
          orderBy: { orderIndex: 'asc' },
          include: { poi: true }
        }
      }
    });
    if (!route) return null;
    return {
      id: route.id,
      name: (route as any).name || (route as any).title || '',
      pois: route.routePois.map((rp: any) => ({
        id: rp.poi.id,
        title: rp.poi.title,
        description: rp.poi.description,
        latitude: rp.poi.latitude,
        longitude: rp.poi.longitude,
        appThumbnail: rp.poi.appThumbnail || rp.poi.images?.[0] || '',
        header16x9: rp.poi.header16x9 || '',
        audioUrl: rp.poi.audioUrl || '',
        videoUrls: rp.poi.videoUrls || [],
        textContent: rp.poi.textContent || '',
        carouselImages: rp.poi.carouselImages || [],
        orderIndex: rp.orderIndex,
      }))
    };
  } catch (err: any) {
    console.error(err);
    return null;
  }
}

export async function getOrphanPois() {
  noStore();
  try {
    // POIs not linked to any route
    const pois = await prisma.poi.findMany({
      where: {
        routePois: { none: {} }
      },
      select: {
        id: true,
        title: true,
        description: true,
        latitude: true,
        longitude: true,
        appThumbnail: true,
        header16x9: true,
        audioUrl: true,
        videoUrls: true,
        textContent: true,
        carouselImages: true,
        images: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return pois.map((p: any) => ({
      ...p,
      appThumbnail: p.appThumbnail || p.images?.[0] || '',
    }));
  } catch (err: any) {
    console.error(err);
    return [];
  }
}



export async function loginOrRegister(name: string, email: string) {
  try {
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return { success: false, error: GENERIC_ERROR_MESSAGE };
    }

    const existingAuthUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existingAuthUser) {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', existingAuthUser.id)
        .single();

      if (existingProfile) {
        return { success: true, user: existingProfile };
      }

      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: existingAuthUser.id,
          username: name,
          role: 'user',
          xp: 0,
          level: 1
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { success: false, error: GENERIC_ERROR_MESSAGE };
      }
      return { success: true, user: newProfile };
    }

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: 'ChangeMe123!' + Math.random(),
      email_confirm: true,
      user_metadata: { username: name }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return { success: false, error: GENERIC_ERROR_MESSAGE };
    }

    if (!authUser.user) return { success: false, error: GENERIC_ERROR_MESSAGE };

    const { data: finalProfile, error: finalProfileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        username: name,
        role: 'user',
        xp: 0,
        level: 1
      })
      .select()
      .single();

    if (finalProfileError) {
      console.error('Final profile error:', finalProfileError);
      return { success: false, error: GENERIC_ERROR_MESSAGE };
    }

    return { success: true, user: finalProfile };
  } catch (err: any) {
    console.error('[loginOrRegister error]', err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function getUserProfile(userId: string) {
  noStore();
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const { count } = await supabaseAdmin
    .from('visited_legends')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    ...profile,
    visitedCount: count || 0,
    username: profile.display_name || profile.name || "Explorador",
    xp: profile.xp || 0
  };
}

/**
 * AI Quiz Generation Action
 */
export async function generateQuizForPoiAction(id: string) {
  try {
    const poi = await prisma.poi.findUnique({
      where: { id },
      select: { title: true, textContent: true, type: true }
    });

    if (!poi || !poi.textContent) {
      return { success: false, error: "No hi ha contingut per generar el quiz." };
    }

    const quiz = await generatePoiQuiz(poi.title, poi.textContent, (poi.type as any) || 'CIVIL');

    if (!quiz) return { success: false, error: "Error generant el quiz AI." };

    await prisma.poi.update({
      where: { id },
      data: { manualQuiz: quiz }
    });

    revalidatePath('/admin');
    return { success: true, quiz };
  } catch (err) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function closeRouteAndGenerateFinalQuiz(routeId: string) {
  try {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        routePois: {
          include: { poi: true },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!route) return { success: false, error: "Ruta no trobada." };

    const poisData = route.routePois.map(rp => ({
      title: rp.poi.title,
      content: rp.poi.textContent || rp.poi.description || ''
    }));

    if (poisData.length === 0) {
      return { success: false, error: "La ruta no té punts per analitzar." };
    }

    const finalQuiz = await generateFinalRouteQuiz(route.name || route.slug, poisData);

    if (!finalQuiz) return { success: false, error: "Error generant el Repte Final." };

    await prisma.route.update({
      where: { id: routeId },
      data: {
        status: 'CLOSED',
        finalQuiz: finalQuiz
      }
    });

    revalidatePath('/admin');
    return { success: true, finalQuiz };
  } catch (err) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function updateProfileAvatar(userId: string, avatarUrl: string) {
  const supabase = createClient(await cookies());
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (error) {
    console.error('Error updating avatar:', error);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }

  revalidatePath('/profile');
  return { success: true };
}


export async function recordVisit(userId: string, poiId: string) {
  try {
    const poi = await prisma.poi.findUnique({ where: { id: poiId } });
    if (!poi) return { success: false, error: "POI not found" };

    const existing = await prisma.userUnlock.findUnique({
      where: { userId_poiId: { userId, poiId } }
    });

    if (existing) return { success: true, message: 'Already visited' };

    await prisma.userUnlock.create({
      data: {
        userId,
        poiId,
        unlockedAt: new Date(),
        earnedXp: 50,
        progress: 0.2
      }
    });

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { xp: true, level: true }
    });

    if (profile) {
      const newXp = (profile.xp || 0) + 50;
      let newLevel = profile.level || 1;
      if (newXp >= 1000) newLevel = 4;
      else if (newXp >= 500) newLevel = 3;
      else if (newXp >= 200) newLevel = 2;
      else newLevel = 1;

      await prisma.profile.update({
        where: { id: userId },
        data: { xp: newXp, level: newLevel }
      });
      return { success: true, newXp, newLevel, leveledUp: newLevel > (profile.level || 1) };
    }
    return { success: true };
  } catch (err) {
    console.error('[recordVisit error]', err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
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


export async function getAllProfiles() {
  noStore();
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')

  if (error) {
    console.error('Error fetching all profiles:', error)
    return []
  }

  return data
}
export async function addVideoToPoi(poiId: string, formData: FormData) {
  const videoFile = formData.get('video') as File;
  if (!videoFile) return { success: false, error: "No s'ha pujat cap vídeo." };

  const validMimes = ['video/mp4', 'video/quicktime', 'video/webm'];
  if (!validMimes.includes(videoFile.type)) {
    return { success: false, error: "Format no suportat. Usa MP4, MOV o WebM." };
  }

  try {
    const poi = await prisma.poi.findUnique({
      where: { id: poiId }
    });

    if (!poi) return { success: false, error: "POI no trobat." };
    if (poi.videoUrls && poi.videoUrls.length > 0) {
      return { success: false, error: "Ja hi ha un vídeo Reel assignat. Utilitza l'editor manual per canviar-lo." };
    }

    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const tempDir = os.tmpdir();
    const fileName = `${uuidv4()}_${videoFile.name}`;
    const inputPath = path.join(tempDir, fileName);
    fs.writeFileSync(inputPath, buffer);

    const outputDir = path.join(process.cwd(), 'public', 'videos', poiId);

    await videoQueue.add('process-hls', {
      inputPath,
      outputDir,
      fileName: path.parse(fileName).name,
      poiId
    });

    return { success: true, message: "Vídeo en cua de processament HLS." };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function getMunicipalities() {
  noStore();
  try {
    return await prisma.municipality.findMany({
      orderBy: { name: 'asc' }
    });
  } catch (err) {
    console.error('Error fetching municipalities:', err);
    return [];
  }
}

export async function updateMunicipality(id: string, name: string, logoUrl?: string, themeId?: string) {
  logToFile(`updateMunicipality called (v2): ${id}, ${name}, ${themeId}`);

  if (!id) return { success: false, error: "ID missing" };

  try {
    // Check if exists first with raw
    const count = await prisma.$queryRaw<any[]>`SELECT count(*) FROM municipalities WHERE id = ${id}`;
    if (!count || count[0].count === 0) {
      logToFile('Update failed: Municipality not found');
      return { success: false, error: "Municipi no trobat" };
    }

    // Perform raw update
    await prisma.$executeRaw`
      UPDATE municipalities 
      SET 
        name = ${name}, 
        logo_url = ${logoUrl || null}, 
        theme_id = ${themeId || 'mountain'},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    logToFile(`Update SUCCESS for ${name} [${themeId}]`);

    // Explicit return to avoid ambiguous {}
    const response = { success: true, themeId, timestamp: Date.now() };

    revalidatePath('/admin');
    revalidatePath('/');

    return response;
  } catch (err: any) {
    logToFile(`Update CRASHED: ${err.message}`);
    console.error('❌ [SERVER] Update FAIL:', err);
    return { success: false, error: err.message };
  }
}


export const getAppBranding = cache(async () => {
  logToFile('getAppBranding called (raw SQL mode)');
  noStore();
  try {
    // We use raw SQL to ensure we bypass stale Prisma client field mappings
    const results = await prisma.$queryRaw<any[]>`SELECT * FROM public.municipalities ORDER BY created_at ASC LIMIT 1`;
    const brand = results[0] || null;

    if (brand) {
      // Map DB snake_case to camelCase manually for compatibility
      const mapped = {
        ...brand,
        logoUrl: brand.logo_url,
        themeId: brand.theme_id
      };
      logToFile(`Branding found (RAW): ${mapped.name} theme: ${mapped.themeId}`);
      return JSON.parse(JSON.stringify(mapped));
    }

    logToFile('Branding NOT FOUND in RAW query');
    return null;
  } catch (err: any) {
    logToFile(`Branding fetch FAILED (RAW): ${err.message}`);
    console.error('❌ [SERVER] RAW Branding fail:', err);
    return null;
  }
});

/**
 * Passport Logic Actions
 */

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
      availableStampImages = ['bolet.png']; // Safe fallback
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
                  select: { progress: true, unlockedAt: true, earnedXp: true }
                }
              }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return routes.map((route, routeIdx) => {
      const orderedPois = route.routePois.map(rp => {
        const unlock = rp.poi.userUnlocks[0] || null;
        return {
          id: rp.poi.id,
          title: rp.poi.title,
          isVisited: unlock !== null,
          isQuizDone: unlock !== null && (unlock.progress ?? 0) >= 1.0,
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
      const imgIndex = hashCode % (routeStampImages.length || 1);
      const stampImage = routeStampImages[imgIndex] || routeStampImages[0] || 'bolet.png';
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
      };
    });
  } catch (err) {
    console.error('[getPassportData error]', err);
    return [];
  }
}

/**
 * Quiz Completion Action
 */
export async function completePoiQuizAction(poiId: string, userId: string) {
  try {
    const poi = await prisma.poi.findUnique({ where: { id: poiId } });
    if (!poi) return { success: false, error: "POI no trobat." };

    // Update or create unlock with progress = 1.0
    await prisma.userUnlock.upsert({
      where: { userId_poiId: { userId, poiId } },
      create: {
        userId,
        poiId,
        unlockedAt: new Date(),
        earnedXp: 100,
        progress: 1.0
      },
      update: {
        progress: 1.0
      }
    });

    // Give some XP
    await prisma.profile.update({
      where: { id: userId },
      data: { xp: { increment: 100 } }
    });

    revalidatePath('/profile');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}
