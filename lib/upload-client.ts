import { createClient } from '@/lib/database/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export async function uploadFileClient(file: File, bucket: string = 'geocontent') {
    const supabase = createClient();

    // Sanitize filename: remove spaces and non-standard characters
    const safeName = file.name.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${uuidv4()}_${safeName}`;

    // Normalize non-standard MIME types
    const MIME_NORMALIZATION: Record<string, string> = {
        'audio/x-m4a': 'audio/mp4',
        'audio/m4a': 'audio/mp4',
        'audio/x-aac': 'audio/aac',
        'video/x-m4v': 'video/mp4',
        'image/jpg': 'image/jpeg',
    };
    const contentType = MIME_NORMALIZATION[file.type] ?? file.type ?? 'application/octet-stream';

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
            contentType,
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('[uploadFileClient] Storage Error:', error);
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return publicUrl;
}
