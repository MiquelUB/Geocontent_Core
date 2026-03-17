'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Plus, Music, Film, ImageIcon, History, MapPin, FolderIcon, Upload, Link2, Trash2, MapIcon, CloudUpload } from "lucide-react";
import iconsMapping from '@/lib/icons-mapping.json';
import { getAdminTheme } from "@/lib/adminTheme";
import { compressImage } from "@/lib/imageOptimization";
import { uploadFileClient } from "@/lib/upload-client";

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
const MAX_VIDEO_SIZE_MB = 10; // Reduït per evitar 413, recomanem usar VideoUploader si és més gran

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

  const [carouselImages, setCarouselImages] = useState<string[]>(() => {
    if (poi?.carouselImages && poi.carouselImages.length > 0) return poi.carouselImages;
    // Fallback per punts antics on les imatges anaven al camp "images"
    if (poi?.images && poi.images.length > 1) {
      return poi.images.slice(1);
    }
    return [];
  });
  const [carouselFiles, setCarouselFiles] = useState<(File | null)[]>(() =>
    new Array((poi?.carouselImages?.length || (poi?.images?.length > 1 ? poi.images.length - 1 : 0))).fill(null)
  );
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

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

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
    if (isLoading || isUploading) return;

    setIsUploading(true);
    setUploadStatus("Comprimint i pujant arxius...");

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('text_content', textContent);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('icon', icon);
    if (routeId) formData.append('route_id', routeId);
    formData.append('type', poiType);

    try {
      // 1. Upload App Thumbnail
      let finalAppThumbnail = appThumbnail;
      if (appThumbnailFile) {
        setUploadStatus("Pujant miniatura...");
        const compressed = await compressImage(appThumbnailFile);
        finalAppThumbnail = await uploadFileClient(compressed);
      }
      formData.append('app_thumbnail', finalAppThumbnail);

      // 2. Upload Header Image
      let finalHeader16x9 = header16x9;
      if (headerFile) {
        setUploadStatus("Pujant imatge de capçalera...");
        const compressed = await compressImage(headerFile);
        finalHeader16x9 = await uploadFileClient(compressed);
      }
      formData.append('header_16x9', finalHeader16x9);

      // 3. Upload Audio
      let finalAudioUrl = audioUrl;
      if (audioFile) {
        setUploadStatus("Pujant àudio...");
        finalAudioUrl = await uploadFileClient(audioFile);
      }
      formData.append('audio_url', finalAudioUrl);

      // 4. Upload Carousel Images
      setUploadStatus("Pujant imatges del carrusel...");
      const finalCarouselUrls: string[] = [];
      for (let i = 0; i < carouselImages.length; i++) {
        const url = carouselImages[i];
        const file = carouselFiles[i];
        if (file) {
          const compressed = await compressImage(file);
          const uploadedUrl = await uploadFileClient(compressed);
          finalCarouselUrls.push(uploadedUrl);
        } else if (!url.startsWith('blob:')) {
          finalCarouselUrls.push(url);
        }
      }
      formData.append('carousel_images', JSON.stringify(finalCarouselUrls));

      // 5. Upload Videos
      setUploadStatus("Pujant vídeos...");
      const finalVideoUrls: string[] = [];
      for (let i = 0; i < videoSlots.length; i++) {
        const slot = videoSlots[i];
        if (slot.file) {
          const uploadedUrl = await uploadFileClient(slot.file);
          finalVideoUrls.push(uploadedUrl);
        } else if (slot.url && slot.url.startsWith('http')) {
          finalVideoUrls.push(slot.url);
        }
      }
      formData.append('video_urls', JSON.stringify(finalVideoUrls));
      formData.append('video_slot_count', videoSlots.length.toString());

      if (manualQuiz) formData.append('manual_quiz', JSON.stringify(manualQuiz));

      setUploadStatus("Guardant informació al servidor...");
      console.log(">>> [ADMIN DEBUG] Enviant dades al servidor. Claus:", Array.from(formData.keys()));
      await onSave(formData);
    } catch (err: any) {
      alert("Error en la pujada client-side: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-100 rounded-lg mb-4">
        <div className="flex items-center gap-2 text-[10px] text-blue-600 font-bold uppercase tracking-wider">
          <CloudUpload className="w-3 h-3" />
          Mode Estalvi de Dades (Pujada Directa) Actiu
        </div>
        <div className="text-[9px] text-blue-400 italic">Evita errors 413 de tamany</div>
      </div>

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
            <Label className="flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-stone-400" />
              Símbol al Mapa (Icona)
            </Label>
            <div className="flex flex-wrap gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100 max-h-[160px] overflow-y-auto">
              {(() => {
                const biomeKey = municipalityTheme || 'mountain';
                const biome = BIOME_MAP[biomeKey] || 'Montanya';
                const availableIcons = (iconsMapping as any)[biome] || [];

                return availableIcons.map((iconName: string) => {
                  const iconUrl = `/icons/${biome}/${iconName}`;
                  const isSelected = icon === iconName;

                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setIcon(iconName)}
                      className={`relative w-12 h-12 rounded-lg border-2 transition-all p-1 bg-white hover:scale-105 ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-stone-200 opacity-60 grayscale hover:opacity-100 hover:grayscale-0'}`}
                    >
                      <img src={iconUrl} alt={iconName} className="w-full h-full object-contain" title={iconName} />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5 shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
            <p className="text-[10px] text-stone-400 italic px-1">Tria el símbol que apareixerà al mapa per aquest punt.</p>
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
                Vídeos Reel (Màx 10MB)
              </div>
              <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={handleAddVideoSlot}>
                Afegir Slot
              </Button>
            </Label>
            <p className="text-[10px] text-orange-600 font-medium px-1">Per a vídeos pesats, guarda el punt i usa la 'Consola HLS' de sota.</p>
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

      <div className="pt-6 border-t border-stone-100 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 font-bold text-stone-800">
            <span>🤖</span> Repte de Quiz (IA)
          </Label>
          {manualQuiz && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setManualQuiz(null)}
              className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              Eliminar Quiz
            </Button>
          )}
        </div>

        {manualQuiz ? (
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
            <div>
              <Label className="text-xs text-stone-500">Pregunta:</Label>
              <Input 
                value={manualQuiz.pregunta || ''} 
                onChange={e => setManualQuiz({...manualQuiz, pregunta: e.target.value})}
                className="bg-white text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {manualQuiz.opcions?.map((opt: string, idx: number) => (
                <div key={idx} className={`space-y-1 p-2 rounded-lg border ${idx === manualQuiz.correcta ? 'border-green-300 bg-green-50' : 'border-stone-200 bg-white'}`}>
                  <Label className="text-[10px] text-stone-400">Opció {String.fromCharCode(65+idx)} {idx === manualQuiz.correcta && "✓"}</Label>
                  <Input 
                    value={opt} 
                    onChange={e => {
                      const newOpts = [...manualQuiz.opcions];
                      newOpts[idx] = e.target.value;
                      setManualQuiz({...manualQuiz, opcions: newOpts});
                    }}
                    className="h-8 text-xs bg-white"
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className={`w-full h-6 text-[10px] mt-1 ${idx === manualQuiz.correcta ? 'text-green-600 font-bold' : 'text-stone-400'}`}
                    onClick={() => setManualQuiz({...manualQuiz, correcta: idx})}
                  >
                    {idx === manualQuiz.correcta ? 'Correcta' : 'Marcar Correcta'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-stone-400 italic">Aquest punt no té cap quiz assignat.</p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isGeneratingQuiz || !textContent || !title}
          onClick={async () => {
            setIsGeneratingQuiz(true);
            try {
              const res = await fetch('/api/ai/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content: textContent, type: poiType })
              });
              const data = await res.json();
              if (data.success && data.quiz) {
                setManualQuiz(data.quiz);
              } else {
                alert(data.error || "No s'ha pogut generar el quiz");
              }
            } catch (e) {
              console.error("Error generant quiz:", e);
              alert("Error de connexió");
            } finally {
              setIsGeneratingQuiz(false);
            }
          }}
          className="w-full text-xs"
        >
          {isGeneratingQuiz ? 'Generant...' : (manualQuiz ? 'Regenerar Quiz amb IA' : 'Generar Quiz amb IA')}
        </Button>
        {!textContent && <p className="text-[10px] text-amber-600">⚠️ Cal omplir el 'Text Històric' per generar el quiz.</p>}
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

      <div className="pt-6 flex flex-col gap-4">
        {isUploading && (
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center gap-4 animate-pulse">
            <CloudUpload className="w-8 h-8 text-primary animate-bounce" />
            <div className="flex-1">
              <div className="text-sm font-bold text-primary">{uploadStatus}</div>
              <div className="text-[10px] text-stone-500 italic">Estem enviant els arxius directament al núvol per evitar errors de tamany.</div>
            </div>
          </div>
        )}
        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading || isUploading} className={`flex-1 ${activeTheme.primary} ${activeTheme.hover} text-white py-6 h-auto text-lg font-serif`}>
            {isLoading || isUploading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {isUploading ? 'Pujant Multimèdia...' : 'Guardant...'}
              </>
            ) : (poi ? 'Actualitzar Punt Territorial' : 'Crear Nou Punt Territorial')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="py-6 h-auto px-8" disabled={isUploading}>Cancel·lar</Button>
        </div>
      </div>
    </form >
  );
}
