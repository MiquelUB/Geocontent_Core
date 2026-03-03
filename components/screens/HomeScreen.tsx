import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Navigation, Star, Clock, MapPin, HelpCircle } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { motion } from "motion/react";
import MapLibreMap from '@/components/map/MapLibreMap';
import { PxxConfig } from "@/projects/active/config";
import { getLegends, getAppBranding } from "@/lib/actions";
import { calculateDistance } from "@/lib/location";

interface HomeScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onOpenHelp: () => void;
  brand?: any;
  userLocation?: { latitude: number; longitude: number } | null;
  error?: string | null;
}

export function HomeScreen({ onNavigate, onOpenHelp, brand: propBrand, userLocation, error: geoError }: HomeScreenProps) {
  // Use a sensible default if location is not yet available for first render (e.g. Sort center)
  const defaultLoc = { latitude: 42.4140, longitude: 0.9870 };
  const currentLoc = userLocation || defaultLoc;

  const [nearbyLegends, setNearbyLegends] = useState<any[]>([]);
  const [brand, setBrand] = useState<any>(propBrand);

  useEffect(() => {
    async function fetchData() {
      const [legendsData, brandData] = await Promise.all([
        getLegends(),
        !propBrand ? getAppBranding() : Promise.resolve(propBrand)
      ]);

      if (!propBrand) setBrand(brandData);

      if (legendsData) {
        const mapped = legendsData.map((l: any) => ({
          ...l,
          location: l.location_name || "Lugar",
          distance: calculateDistance(
            currentLoc.latitude,
            currentLoc.longitude,
            l.latitude,
            l.longitude
          ),
          image: l.image_url,
          hero: l.hero_image_url,
          rating: l.rating || 4.5,
          coordinates: { lat: l.latitude, lng: l.longitude }
        }));
        setNearbyLegends(mapped);
      }
    }
    fetchData();
  }, [currentLoc, propBrand]);

  return (
    <div className="screen bg-background">
      {/* Header amb logo */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-primary p-4 pb-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center overflow-hidden">
              {brand?.logoUrl ? (
                <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-lg font-serif font-bold text-primary">
                  {brand?.name?.[0] || PxxConfig.appName[0]}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-primary-foreground">
                {brand?.name || PxxConfig.appName}
              </h1>
              <p className="text-xs text-primary-foreground/80">{PxxConfig.appDescription}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenHelp}
              className="text-primary-foreground hover:bg-background/10"
              title="Ajuda"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-background/10"
            >
              <Navigation className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Mapa del Pallars (Mini) */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative h-64 mx-4 mt-4 rounded-lg overflow-hidden bg-gradient-to-br from-green-100 to-blue-100 shadow-md"
      >
        <div className="absolute inset-0 z-0">
          <MapLibreMap />
        </div>

        {/* Overlay per fer-lo clicable cap al mapa full */}
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={() => onNavigate('map')}
        ></div>

        {/* Etiqueta zona */}
        <div className="absolute bottom-4 left-4 bg-primary/95 backdrop-blur-sm rounded-lg px-3 py-2 z-20 flex items-center space-x-2 border border-white/10 shadow-lg">
          {geoError ? (
            <>
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }} className="w-2 h-2 rounded-full bg-red-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-200">
                {geoError}
              </p>
            </>
          ) : !userLocation ? (
            <>
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"
              />
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/90">
                Buscant senyal GPS...
              </p>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/90">
                Senyal GPS actiu
              </p>
            </>
          )}
        </div>
      </motion.div>

      {/* Llegendes properes */}
      <div className="p-4 pb-20"> {/* pb-20 per deixar espai al bottom nav */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between mb-4"
        >
          <h2 className="text-xl font-serif font-semibold text-primary">
            Llocs propers
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('legends')}
            className="text-secondary hover:bg-secondary/10"
          >
            Veure tot
          </Button>
        </motion.div>

        <div className="space-y-3">
          {nearbyLegends.map((legend, index) => (
            <motion.div
              key={legend.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + (index * 0.1) }}
              onClick={() => onNavigate('legend-detail', legend)}
              className="pallars-card cursor-pointer hover:shadow-lg transition-all"
            >
              <div className="flex space-x-3">
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={legend.image}
                    alt={legend.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-serif font-medium text-primary truncate">
                      {legend.title}
                    </h3>
                    <div className="flex items-center space-x-1 ml-2">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-muted-foreground">{legend.rating}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{legend.location}</span>
                    <span>•</span>
                    <span>{legend.distance}</span>
                  </div>

                  <p className="text-sm text-foreground/80 line-clamp-2 mb-2">
                    {legend.description}
                  </p>

                  <div className="flex items-center justify-between">
                    {legend.category && legend.category !== 'mountain' && (
                      <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full">
                        {legend.category}
                      </span>
                    )}
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>5 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
