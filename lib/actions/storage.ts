'use server'

import { getSupabaseAdmin } from '@/lib/database/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { prisma } from "../database/prisma";
import { videoQueue } from "../queue/client";
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { getUserProfile } from '@/lib/actions/auth';
import { GENERIC_ERROR_MESSAGE } from '@/lib/errors';

function logToFile(msg: string) {
  try {
    const logPath = path.join(os.tmpdir(), 'geocontent-server-debug.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) { }
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

    // Normalize non-standard MIME types rejected by Supabase Storage
    const MIME_NORMALIZATION: Record<string, string> = {
      'audio/x-m4a': 'audio/mp4',
      'audio/m4a': 'audio/mp4',
      'audio/x-aac': 'audio/aac',
      'video/x-m4v': 'video/mp4',
      'image/jpg': 'image/jpeg',
    };
    const contentType = MIME_NORMALIZATION[file.type] ?? file.type ?? 'application/octet-stream';

    // Use admin client for storage uploads to ensure success in admin context
    // RLS for storage is not triggered for admin client
    const { data, error } = await getSupabaseAdmin().storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      logToFile(`[uploadFile] Storage Error: ${JSON.stringify(error)}`);
      throw error;
    }

    const { data: { publicUrl } } = getSupabaseAdmin().storage
      .from(bucket)
      .getPublicUrl(data.path);

    logToFile(`[uploadFile] SUCCESS: ${publicUrl}`);
    return publicUrl;
  } catch (err: any) {
    logToFile(`[uploadFile] FATAL ERROR: ${err.message}`);
    console.error('uploadFile error:', err);
    throw err;
  }
}

export async function updateProfileAvatar(userId: string, avatarUrl: string) {
  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (error) {
    console.error('Error updating avatar:', error);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }

  const updatedProfile = await getUserProfile(userId);
  revalidatePath('/profile');
  return { success: true, user: updatedProfile };
}

export async function handleAvatarUploadAction(formData: FormData, userId: string) {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error("No file found");

    const avatarUrl = await uploadFile(file, 'geocontent');
    const result = await updateProfileAvatar(userId, avatarUrl);
    return result;
  } catch (err) {
    console.error('handleAvatarUploadAction error:', err);
    return { success: false, error: "Error al carregar l'avatar" };
  }
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
