import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ArrowLeft, Play, Pause, Heart, Star, Share2, MapPin, Calendar, Volume2, Lock, History, Wifi, WifiOff, Navigation2 } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import ImageSlider from "../ui/ImageSlider";
import HlsVideoPlayer from "../ui/HlsVideoPlayer";
import { motion, useScroll, useTransform } from "motion/react";
import { recordVisit } from "@/lib/actions";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { downloadTerritorialPackage, isRouteCached, SyncProgress } from "@/lib/services/sync-service";
import { CheckCircle2, Download, Loader2, AlertCircle } from "lucide-react";
import PoiQuiz from "../quiz/PoiQuiz";

import { calculateDistance } from "@/lib/location";

interface LegendDetailScreenProps {
  legend: any;
  onNavigate: (screen: string, data?: any) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  currentUser?: any;
}

export function LegendDetailScreen({ legend, onNavigate, userLocation, currentUser }: LegendDetailScreenProps) {
  // Extract coordinates safely
  const lat = legend?.latitude ?? legend?.coordinates?.lat ?? 0;
  const lng = legend?.longitude ?? legend?.coordinates?.lng ?? 0;

  // Fallback for missing legend data
  const safeLegend = {
    ...legend,
    title: legend?.title || "Punt no trobat",
    description: legend?.description || "No s'ha pogut carregar la informació.",
    image: legend?.image || legend?.image_url || "",
    location: legend?.location || legend?.location_name || "Desconegut",
    categoryLabel: legend?.categoryLabel || legend?.category || "Desconegut",
    coordinates: { lat, lng },
    videoUrls: legend?.videoUrls || (legend?.video_url ? [legend.video_url] : []),
    manualQuiz: legend?.manualQuiz,
    userUnlocks: legend?.userUnlocks || []
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ready'>('idle');
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const network = useNetworkStatus();

  // Check if already cached on mount
  useEffect(() => {
    if (safeLegend.id && isRouteCached(safeLegend.id)) {
      setSyncStatus('ready');
    }
  }, [safeLegend.id]);

  // Parallax effect for hero
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Parse videoMetadata for low-res URLs
  const videoMetadata = safeLegend.videoMetadata || {};
  const videoVariants = videoMetadata.variants || [];

  const distanceStr = userLocation && (lat !== 0 || lng !== 0)
    ? calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      lat,
      lng
    )
    : null;

  // calculateDistance returns a string like "1.2 km" or "300 m", we need numeric meters for comparison
  const getNumericDistance = (distStr: string | null): number | null => {
    if (!distStr) return null;
    if (distStr.includes('km')) return parseFloat(distStr) * 1000;
    return parseFloat(distStr);
  };

  const distanceMeters = getNumericDistance(distanceStr);
  const UNLOCK_DISTANCE = 30; // metres

  // Convert Supabase URLs to go through local proxy (fixes CORS in dev)
  function proxifyUrl(url: string): string {
    if (!url) return '';
    if (url.includes('supabase.co/storage/')) {
      return `/api/img-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  }
  const isAlreadyVisited = safeLegend.userUnlocks?.some((u: any) => u.userId === currentUser?.id);
  const isRoute = safeLegend.pois && safeLegend.pois.length > 0;

  // ALWAYS UNLOCK FOR DEVELOPMENT DEBUGGING
  const isDev = process.env.NODE_ENV === 'development';
  const isUnlocked = isDev || isRoute || isAlreadyVisited || (distanceMeters !== null && distanceMeters <= UNLOCK_DISTANCE);

  // Record visit when unlocked
  useEffect(() => {
    if (isUnlocked && currentUser?.id && safeLegend.id) {
      // Fire and forget
      recordVisit(currentUser.id, safeLegend.id)
        .then(res => {
          if (res.success && res.newLevel) {
            console.log("Leveled up!", res.newLevel);
          }
        });
    }
  }, [isUnlocked, currentUser, safeLegend.id]);


  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleRating = (rating: number) => {
    setUserRating(rating);
  };

  const handleViewOnMap = () => {
    onNavigate('map', safeLegend);
  };

  const handleDownload = async () => {
    if (syncStatus === 'syncing') return;
    setSyncStatus('syncing');

    const pois = safeLegend.pois || [];
    const result = await downloadTerritorialPackage(safeLegend.id, pois, (p) => {
      setSyncProgress(p);
    });

    if (result.success) {
      setSyncStatus('ready');
    } else {
      setSyncStatus('idle');
      alert(`Error en la descàrrega: ${result.error}`);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: safeLegend.title,
      text: `Mira aquest punt de ruta: ${safeLegend.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error en compartir:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert("Enllaç copiat al porta-retalls per compartir!");
      } catch (err) {
        console.error("Fallada al copiar:", err);
      }
    }
  };

  return (
    <div className="screen bg-background min-h-screen">
      {/* Editorial Hero Image with Parallax */}
      <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden bg-stone-950">
        <motion.div
          style={{ y }}
          className="absolute inset-0 w-full h-full"
        >
          <ImageSlider
            images={
              (safeLegend.carouselImages?.length > 0
                ? safeLegend.carouselImages
                : (safeLegend.images?.length > 0 ? safeLegend.images : [safeLegend.header16x9 || safeLegend.image])
              ).map(proxifyUrl)
            }
            isRecapture={safeLegend.is_recapture}
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background pointer-events-none z-20"></div>

        {/* Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('legends')}
            className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-md rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFavorite(!isFavorite)}
              className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-md rounded-full"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-md rounded-full"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Title Overlay (Fades out on scroll) */}
        <motion.div
          style={{ opacity }}
          className="absolute bottom-12 left-6 right-6 z-10"
        >
          <div className="flex items-center text-white/80 font-medium tracking-widest uppercase text-xs mb-2">
            <MapPin className="w-3 h-3 mr-2" />
            {safeLegend.location}
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-4 leading-none drop-shadow-md">
            {safeLegend.title}
          </h1>
        </motion.div>
      </div>

      {/* Content "Paper" Sheet */}
      <div className="relative -mt-10 bg-background rounded-t-[2.5rem] z-20 px-8 py-10 min-h-[50vh] shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">


        {/* POIs del Recorregut */}
        {safeLegend.pois && safeLegend.pois.length > 0 && (
          <div className="mb-10">
            <h3 className="font-serif font-bold text-lg text-primary mb-5 flex items-center">
              <span className="w-8 h-px bg-primary/40 mr-3"></span>
              Punts del Recorregut
              <span className="ml-3 text-[10px] font-normal text-stone-400 uppercase tracking-wider">
                {safeLegend.pois.length} punts
              </span>
            </h3>
            <div className="space-y-3">
              {safeLegend.pois.map((poi: any, idx: number) => {
                const poiHasCoords = typeof poi.latitude === 'number' && typeof poi.longitude === 'number';
                const poiDistStr = userLocation && poiHasCoords
                  ? calculateDistance(userLocation.latitude, userLocation.longitude, poi.latitude, poi.longitude)
                  : null;
                const poiDistMeters = getNumericDistance(poiDistStr);
                const poiVisited = poi.userUnlocks?.some((u: any) => u.userId === currentUser?.id);
                const poiUnlocked = isDev || poiVisited || (poiDistMeters !== null && poiDistMeters <= UNLOCK_DISTANCE);
                const distLabel = poiDistStr;

                return (
                  <div
                    key={poi.id}
                    onClick={() => poiUnlocked && onNavigate('legend-detail', poi)}
                    className={`relative flex gap-3 rounded-2xl border p-3.5 transition-all duration-300 ${poiUnlocked
                      ? 'border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 shadow-sm'
                      : 'border-stone-100 bg-stone-50/60 cursor-default'
                      }`}
                  >
                    {/* Order index bubble */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${poiUnlocked ? 'bg-primary text-white' : 'bg-stone-200 text-stone-400'
                      }`}>
                      {idx + 1}
                    </div>

                    {/* POI Thumbnail — sempre visible, independent del desbloqueig */}
                    {poi.image_url ? (
                      <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-stone-100 self-start">
                        <ImageWithFallback
                          src={poi.image_url}
                          alt={poi.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center self-start ${poiUnlocked ? 'bg-primary/10' : 'bg-stone-100'
                        }`}>
                        <MapPin className={`w-5 h-5 ${poiUnlocked ? 'text-primary/40' : 'text-stone-300'}`} />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-serif font-bold text-sm leading-tight ${poiUnlocked ? 'text-stone-800' : 'text-stone-400'
                          }`}>
                          {poi.title}
                        </p>
                        {/* Distance / lock badge */}
                        {distLabel ? (
                          <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${poiUnlocked
                            ? 'bg-primary/10 text-primary'
                            : 'bg-stone-200 text-stone-400'
                            }`}>
                            {poiUnlocked
                              ? <MapPin className="w-2.5 h-2.5" />
                              : <Lock className="w-2.5 h-2.5" />}
                            {distLabel}
                          </span>
                        ) : (
                          <span className="flex-shrink-0 flex items-center gap-1 text-[10px] text-stone-300 bg-stone-100 px-2 py-0.5 rounded-full">
                            <Lock className="w-2.5 h-2.5" />
                            GPS off
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed line-clamp-2 ${poiUnlocked ? 'text-stone-500' : 'text-stone-300'
                        }`}>
                        {poi.description || 'Descobreix aquest punt in situ.'}
                      </p>
                    </div>

                    {/* Unlock CTA */}
                    {poiUnlocked && (
                      <div className="flex-shrink-0 self-center">
                        <Navigation2 className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Contenid Principal */}

        <div className="relative group overflow-hidden rounded-3xl min-h-[200px]">
          <div className={`prose prose-lg prose-stone max-w-none leading-relaxed font-serif transition-all duration-1000 z-10 relative ${isUnlocked ? 'text-foreground/90' : 'text-stone-300 blur-[8px] select-none scale-[0.98]'}`}>
            {isUnlocked ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="z-10 relative"
              >
                <p className="first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-primary first-letter:float-left first-letter:mr-3 first-letter:mt-[-8px]">
                  {safeLegend.textContent || safeLegend.description}
                </p>
                <div className="clear-both"></div>
              </motion.div>
            ) : (
              <div className="space-y-4 pt-4">
                <div className="h-6 bg-stone-100 rounded-full w-3/4"></div>
                <div className="h-6 bg-stone-50 rounded-full w-full"></div>
                <div className="h-6 bg-stone-50 rounded-full w-5/6"></div>
                <div className="h-6 bg-stone-50 rounded-full w-full"></div>
              </div>
            )}
          </div>

          {!isUnlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-background/40 backdrop-blur-[2px] rounded-3xl z-20">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="w-20 h-20 bg-white/80 backdrop-blur-xl rounded-full shadow-2xl border border-white/50 flex items-center justify-center text-primary mb-6 ring-8 ring-primary/5"
              >
                <Lock className="w-8 h-8" />
              </motion.div>
              <h4 className="font-serif text-xl font-bold text-primary mb-2">Contingut Protegit</h4>
              <p className="text-stone-500 text-sm max-w-[200px] leading-relaxed">
                {distanceMeters !== null ? (
                  <>Ets a <span className="text-primary font-bold">{distanceStr}</span> de la història. Trepitja el punt per desbloquejar-la.</>
                ) : (
                  <span className="italic opacity-60">Esperant senyal GPS per obrir el cadenat...</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Interaction Zone */}
      <div className="bg-muted/30 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-end mb-4">
          <span className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full ${network.isOnline
            ? (network.isSlowNetwork ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600')
            : 'bg-red-100 text-red-500'
            }`}>
            {network.isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {network.isOnline ? (network.isSlowNetwork ? 'Lenta' : 'Connectat') : 'Offline'}
          </span>
        </div>

        {/* Audio Player */}
        {safeLegend.audioUrl && (
          <div className={`p-4 rounded-xl flex items-center justify-between transition-colors ${isUnlocked
            ? 'bg-primary text-primary-foreground shadow-lg'
            : 'bg-stone-200 text-stone-500 cursor-not-allowed'
            }`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-white/20' : 'bg-black/10'}`}>
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">Àudio Guia</div>
                <div className="text-xs opacity-80">{isPlaying ? 'Reproduint...' : 'Clica per escoltar'}</div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayAudio}
              disabled={!isUnlocked}
              className={`hover:bg-white/20 rounded-full h-12 w-12 ${!isUnlocked && 'opacity-50'}`}
            >
              {isUnlocked ? (
                isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />
              ) : <Lock className="w-5 h-5" />}
            </Button>
            <audio ref={audioRef} src={safeLegend.audioUrl} onEnded={() => setIsPlaying(false)} />
          </div>
        )}

        {/* Punt d'Or (Sync Service for Offline) */}
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${syncStatus === 'ready' ? 'bg-emerald-500' : 'bg-primary/40'}`}>
                {syncStatus === 'ready' ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              </div>
              <div>
                <div className="font-bold text-xs uppercase tracking-tighter">Punt d'Or</div>
                <div className="text-[10px] text-muted-foreground">Paquet Offline</div>
              </div>
            </div>
            {syncStatus !== 'ready' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                disabled={syncStatus === 'syncing' || !network.isOnline}
                className="h-8 text-[10px] uppercase font-bold"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Baixant
                  </>
                ) : 'Baixar Ruta'}
              </Button>
            )}
          </div>

          {(safeLegend as any).downloadRequired && syncStatus !== 'ready' && (
            <div className="mt-1 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div className="text-[10px] leading-tight text-amber-800 font-medium font-sans">
                <span className="font-bold uppercase block mb-0.5 text-amber-900">Manca de cobertura</span>
                Es recomana baixar la ruta abans de començar per evitar pèrdua de dades.
              </div>
            </div>
          )}

          {syncStatus === 'syncing' && syncProgress && (
            <div className="mt-2 space-y-1">
              <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                />
              </div>
              <div className="text-[9px] text-stone-400 italic">
                {syncProgress.label}
              </div>
            </div>
          )}

          {syncStatus === 'ready' && (
            <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              Aquesta ruta està disponible sense connexió.
            </div>
          )}

          {!network.isOnline && syncStatus !== 'ready' && (
            <div className="text-[10px] text-red-500 italic mt-1">
              Connecta't per baixar el paquet territorial.
            </div>
          )}
        </div>

        {/* Multi-Video Section */}
        {safeLegend.videoUrls && safeLegend.videoUrls.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-stone-500 font-serif text-sm px-1">
              <Play className="w-3 h-3" />
              <span>Imatges en Moviment</span>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {safeLegend.videoUrls.map((videoUrl: string, idx: number) => {
                const variant = videoVariants[idx];
                const lowResSrc = variant?.lowResUrl || undefined;
                return (
                  <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden shadow-xl border border-white/20">
                    {isUnlocked ? (
                      <HlsVideoPlayer
                        src={videoUrl.endsWith('.m3u8') ? videoUrl : videoUrl}
                        lowBitrateSrc={lowResSrc}
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-stone-900/5 backdrop-blur-md rounded-xl flex flex-col items-center justify-center gap-4 text-stone-400 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-stone-900/10 to-transparent"></div>
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-2xl flex items-center justify-center text-white ring-4 ring-white/10">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div className="text-center z-10 px-6">
                          <span className="block text-[10px] uppercase tracking-[0.2em] font-black text-stone-500 mb-1">Cadenat Digital</span>
                          <p className="text-[11px] leading-tight text-stone-400">El vídeo es revelarà quan arribis a la localització.</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quiz Section */}
        {isUnlocked && safeLegend.manualQuiz && (
          <PoiQuiz
            poiId={safeLegend.id}
            userId={currentUser?.id}
            quiz={safeLegend.manualQuiz}
            isAlreadyCompleted={safeLegend.userUnlocks.some((u: any) => u.userId === currentUser?.id && u.progress >= 1.0)}
          />
        )}

        {/* Map Button */}
        <Button
          variant="outline"
          className="w-full py-6 border-primary text-primary hover:bg-primary/5 font-serif text-lg"
          onClick={handleViewOnMap}
        >
          <MapPin className="w-5 h-5 mr-2" />
          Veure al Mapa
        </Button>

      </div>
    </div>
  );
}

