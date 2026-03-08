'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Plus, Music, Film, ImageIcon, History, MapPin, FolderIcon, Upload, Link2, Trash2, MapIcon } from "lucide-react";
import iconsMapping from '@/lib/icons-mapping.json';
import { getAdminTheme } from "@/lib/adminTheme";
import { compressImage } from "@/lib/imageOptimization";

const BIOME_MAP: Record<string, string> = {
  mountain: 'Montanya',
  coast: 'Mar',
  city: 'City',
  interior: 'Interior',
  bloom: 'Blossom',
};

interface ManualPoiFormProps {
  poi?: any;
  onSave: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  routes?: any[];
  defaultRouteId?: string;
  municipalityTheme?: string;
}

interface VideoSlot {
  url: string;
  file: File | null;
  mode: 'url' | 'file';
}

const MAX_VIDEO_SLOTS = 3;
const MAX_VIDEO_SIZE_MB = 15;

export default function ManualPoiForm({ poi, onSave, onCancel, isLoading, routes = [], defaultRouteId, municipalityTheme }: ManualPoiFormProps) {
  const activeTheme = getAdminTheme(municipalityTheme);
  const [title, setTitle] = useState(poi?.title || '');
  const [description, setDescription] = useState(poi?.description || '');
  const [routeId, setRouteId] = useState(poi?.routeId || defaultRouteId || '');
  const [textContent, setTextContent] = useState(poi?.textContent || '');
  const [latitude, setLatitude] = useState(poi?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(poi?.longitude?.toString() || '');
  const [icon, setIcon] = useState(poi?.icon || '');
  const [poiType, setPoiType] = useState(poi?.type || 'CIVIL');
  const [manualQuiz, setManualQuiz] = useState<any>(poi?.manualQuiz || null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const [appThumbnail, setAppThumbnail] = useState(poi?.appThumbnail || '');
  const [header16x9, setHeader16x9] = useState(poi?.header16x9 || '');
  const [audioUrl, setAudioUrl] = useState(poi?.audioUrl || '');

  const [carouselImages, setCarouselImages] = useState<string[]>(poi?.carouselImages || []);
  const [carouselFiles, setCarouselFiles] = useState<(File | null)[]>(poi?.carouselImages?.map(() => null) || []);
  const [newCarouselUrl, setNewCarouselUrl] = useState('');
  const [newCarouselFile, setNewCarouselFile] = useState<File | null>(null);

  const [appThumbnailFile, setAppThumbnailFile] = useState<File | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const initVideoSlots = (): VideoSlot[] => {
    const existingUrls: string[] = poi?.videoUrls || (poi?.videoUrl ? [poi.videoUrl] : []);
    const slots: VideoSlot[] = existingUrls.slice(0, MAX_VIDEO_SLOTS).map((url: string) => ({
      url,
      file: null,
      mode: 'url' as const,
    }));
    return slots;
  };
  const [videoSlots, setVideoSlots] = useState<VideoSlot[]>(initVideoSlots);

  const handleAddVideoSlot = () => {
    if (videoSlots.length < MAX_VIDEO_SLOTS) {
      setVideoSlots([...videoSlots, { url: '', file: null, mode: 'url' }]);
    }
  };

  const handleRemoveVideoSlot = (index: number) => {
    setVideoSlots(videoSlots.filter((_, i) => i !== index));
  };

  const updateVideoSlot = (index: number, updates: Partial<VideoSlot>) => {
    setVideoSlots(videoSlots.map((slot, i) => i === index ? { ...slot, ...updates } : slot));
  };

  const handleVideoFileChange = (index: number, file: File | null) => {
    if (file && file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      alert(`El fitxer "${file.name}" supera el límit de ${MAX_VIDEO_SIZE_MB}MB.`);
      return;
    }
    updateVideoSlot(index, { file, url: file ? file.name : '' });
  };

  const handleAddCarouselImage = () => {
    if (carouselImages.length >= 4) return;

    if (newCarouselFile) {
      const blobUrl = URL.createObjectURL(newCarouselFile);
      setCarouselImages([...carouselImages, blobUrl]);
      setCarouselFiles([...carouselFiles, newCarouselFile]);
      setNewCarouselFile(null);
      setNewCarouselUrl('');
    } else if (newCarouselUrl) {
      setCarouselImages([...carouselImages, newCarouselUrl]);
      setCarouselFiles([...carouselFiles, null]);
      setNewCarouselUrl('');
    }
  };

  const handleRemoveCarouselImage = (index: number) => {
    const url = carouselImages[index];
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    setCarouselImages(carouselImages.filter((_, i) => i !== index));
    setCarouselFiles(carouselFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeId) {
      alert('Has d\'assignar el punt a una ruta. Selecciona una carpeta abans de guardar.');
      return;
    }
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('text_content', textContent);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('icon', icon);
    if (routeId) formData.append('route_id', routeId);

    // Compress images before appending to FormData
    if (appThumbnailFile) {
      const compressed = await compressImage(appThumbnailFile);
      formData.append('app_thumbnail_file', compressed);
    }
    if (headerFile) {
      const compressed = await compressImage(headerFile);
      formData.append('header_file', compressed);
    }
    if (audioFile) formData.append('audio_file', audioFile);

    formData.append('app_thumbnail', appThumbnail);
    formData.append('header_16x9', header16x9);
    formData.append('audio_url', audioUrl);

    const videoUrls: string[] = [];
    videoSlots.forEach((slot, idx) => {
      if (slot.file) {
        formData.append(`video_file_${idx}`, slot.file);
      }
      if (slot.url) {
        videoUrls.push(slot.url);
      }
    });
    formData.append('video_urls', JSON.stringify(videoUrls));
    formData.append('video_slot_count', videoSlots.length.toString());

    // Carousel: files and existing URLs
    const finalCarouselUrls: string[] = [];
    for (let i = 0; i < carouselImages.length; i++) {
      const url = carouselImages[i];
      const file = carouselFiles[i];
      if (file) {
        const compressed = await compressImage(file);
        formData.append(`carousel_file_${i}`, compressed);
      } else if (!url.startsWith('blob:')) {
        finalCarouselUrls.push(url);
      }
    }
    formData.append('carousel_images', JSON.stringify(finalCarouselUrls));
    formData.append('carousel_file_count', carouselImages.length.toString());
    formData.append('type', poiType);
    if (manualQuiz) formData.append('manual_quiz', JSON.stringify(manualQuiz));

    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="poiTitle" className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-stone-400" />
              Títol del Punt
            </Label>
            <Input id="poiTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Església de Sant Joan" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="routeId" className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4 text-stone-400" />
              Assignar a Carpeta (Ruta) <span className="text-red-500">*</span>
            </Label>
            <select
              id="routeId"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              required
              className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${!routeId ? 'border-red-300 bg-red-50/30' : 'border-input'}`}
            >
              <option value="" disabled>— Selecciona una ruta obligatòriament —</option>
              {routes.map((r: any) => (
                <option key={r.id} value={r.id}>{r.title || r.name}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="desc">Descripció Breu</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px]" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="poiType">Categoria</Label>
            <select
              id="poiType"
              value={poiType}
              onChange={(e) => setPoiType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {['RELIGIOS', 'DEFENSIU', 'CIVIL', 'NATURA', 'AIGUA', 'MIRADOR', 'LLEGENDA', 'PERSONA_ILLUSTRE', 'GUERRA_CIVIL'].map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="textContent">Text Històric</Label>
            <Textarea id="textContent" value={textContent} onChange={(e) => setTextContent(e.target.value)} className="min-h-[150px]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Latitud</Label>
              <Input type="number" step="0.000001" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>Longitud</Label>
              <Input type="number" step="0.000001" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-stone-400" />
                Foto Llistat
              </div>
              <Badge variant="outline" className="text-[9px]">1:1</Badge>
            </Label>
            <Input type="file" accept="image/*" onChange={(e) => setAppThumbnailFile(e.target.files?.[0] || null)} />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-stone-400" />
                Foto Header
              </div>
              <Badge variant="outline" className="text-[9px]">16:9</Badge>
            </Label>
            <Input type="file" accept="image/*" onChange={(e) => setHeaderFile(e.target.files?.[0] || null)} />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Music className="w-4 h-4 text-stone-400" />
              Àudio
            </Label>
            <Input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
          </div>

          <div className="grid gap-3 pt-2 border-t border-stone-100">
            <Label className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-stone-400" />
                Vídeos Reel
              </div>
              <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={handleAddVideoSlot}>
                Afegir Slot
              </Button>
            </Label>
            {videoSlots.map((slot, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Vídeo {idx + 1}</span>
                  <button type="button" onClick={() => handleRemoveVideoSlot(idx)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleVideoFileChange(idx, e.target.files?.[0] || null)}
                  className="h-9 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-stone-100">
        <Label>Carrusel (Max 4)</Label>
        <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/30 space-y-4">
          <Input type="file" accept="image/*" onChange={(e) => setNewCarouselFile(e.target.files?.[0] || null)} />
          <Button type="button" onClick={handleAddCarouselImage} disabled={!newCarouselFile || carouselImages.length >= 4}>
            Afegir al carrusel
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {carouselImages.map((url, idx) => (
            <div key={idx} className="relative aspect-square bg-stone-100 rounded-md overflow-hidden group">
              <img src={url} alt={`Carousel ${idx}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => handleRemoveCarouselImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 flex gap-4">
        <Button type="submit" disabled={isLoading} className={`flex-1 ${activeTheme.primary} ${activeTheme.hover} text-white`}>
          {isLoading ? 'Guardant...' : (poi ? 'Actualitzar Punt' : 'Crear Nou Punt')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel·lar</Button>
      </div>
    </form>
  );
}
