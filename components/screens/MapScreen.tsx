import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { MapPin, Navigation, Info, X, ArrowLeft, Filter, HelpCircle } from 'lucide-react';
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { motion } from "motion/react";
import MapLibreMap from "../map/MapLibreMap";
import { Marker, Popup } from "react-map-gl/maplibre";

import { getLegends } from "@/lib/actions";
import { PxxConfig } from "@/projects/active/config";
import iconsMapping from '@/lib/icons-mapping.json';

const BIOME_MAP: Record<string, string> = {
  mountain: 'Montanya',
  coast: 'Mar',
  city: 'City',
  interior: 'Interior',
  bloom: 'Blossom',
};

const typeToIconName: Record<string, string> = {
  'RELIGIOS': 'Esglesia',
  'CIVIL': 'Casa',
  'DEFENSIU': 'Castell',
  'LLEGENDA': 'Castell',
  'AIGUA': 'Aigua',
  'MIRADOR': 'Vistes',
  'NATURA': 'Arbre',
  'GUERRA_CIVIL': 'Civil_war',
  'PERSONA_ILLUSTRE': 'Personatje',
};

function getPoiIconSrc(poi: any, globalBiome?: string) {
  // Ens assegurem que el bioma estigui normalitzat (lowercase)
  const category = globalBiome || (poi.category || 'mountain').toLowerCase();
  const biome = BIOME_MAP[category] || BIOME_MAP['mountain']; // Fallback a Montanya si no trobem el bioma

  // Si el POI ja té una icona definida a la base de dades
  if (poi.icon) {
    // Netegem el nom de l'icona (només el nom del fitxer sense extensió) i forcem .webp
    const baseName = poi.icon.split('.')[0];
    return `/icons/${biome}/${baseName}.webp`;
  }

  // Si no té icona, provem de mapar segons el 'type'
  const type = (poi.type || '').toUpperCase();
  const mappedName = typeToIconName[type] || 'punt_interest';

  // Verifiquem si el fitxer existeix al mapping
  const availableFiles = (iconsMapping as any)[biome] || [];
  const finalIcon = availableFiles.find((f: string) =>
    f.toLowerCase().startsWith(mappedName.toLowerCase())
  ) || 'punt_interest.webp';

  return `/icons/${biome}/${finalIcon}`;
}

interface MapScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onOpenHelp: () => void;
  focusLegend?: any;
  brand?: any;
  userLocation: { latitude: number; longitude: number } | null;
  error?: string | null;
}


export function MapScreen({ onNavigate, onOpenHelp, focusLegend, brand, userLocation, error: geoError }: MapScreenProps) {

  const [selectedLegend, setSelectedLegend] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategory, setActiveCategory] = useState("totes");
  const [legends, setLegends] = useState<any[]>([]);
  const [viewState, setViewState] = useState({
    longitude: 0.9870,
    latitude: 42.4140,
    zoom: 11
  });

  const [locations, setLocations] = useState<any[]>([{ id: "totes", label: "Totes" }]);
  const [hasInitialPosition, setHasInitialPosition] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const data = await getLegends();
      if (data) {
        const mapped = data.map((l: any) => ({
          ...l,
          location: l.location_name || "",
          coordinates: { lat: l.latitude, lng: l.longitude },
          image: l.image_url,
          hero: l.hero_image_url,
          audio: l.audio_url,
          video: l.video_url,
          color: "#3E4E3F",
        }));
        setLegends(mapped);

        // Extract unique locations (towns)
        const uniqueLocs = Array.from(new Set(mapped.map(l => l.location).filter(Boolean)));
        const locChips = [
          { id: "totes", label: "Totes", color: "#3E4E3F" },
          ...uniqueLocs.map(loc => ({ id: loc, label: loc, color: "#3E4E3F" }))
        ];
        setLocations(locChips);
      }
    }
    fetchData();
  }, []);

  // Gestió intel·ligent del reposicionament del mapa
  useEffect(() => {
    // Cas 1: Atenció a una llegenda específica (ex: venim del botó "Veure al Mapa" d'un POI)
    if (focusLegend) {
      setViewState({
        longitude: focusLegend.coordinates?.lng ?? focusLegend.longitude ?? 0.9870,
        latitude: focusLegend.coordinates?.lat ?? focusLegend.latitude ?? 42.4140,
        zoom: 14
      });
      setSelectedLegend(focusLegend);
      setHasInitialPosition(true); // Evitem que el GPS sobrescrigui aquest focus
    }
    // Cas 2: Posicionament inicial per GPS
    else if (userLocation && !hasInitialPosition) {
      setViewState({
        longitude: userLocation.longitude,
        latitude: userLocation.latitude,
        zoom: 12
      });
      setHasInitialPosition(true);
    }
  }, [focusLegend, userLocation, hasInitialPosition]);

  const filteredLegends = activeCategory === "totes"
    ? legends
    : legends.filter(legend => legend.location === activeCategory);

  // Generem una llista plana de tots els POIs de les rutes filtrades per mostrar al mapa
  const allMapPoints = filteredLegends.flatMap(legend =>
    legend.pois.map((poi: any) => ({
      ...poi,
      // Normalitzem pel popup i detall
      routeId: legend.id,
      routeName: legend.title,
      category: legend.category, // El bioma de la ruta
      location: legend.location,
      image: poi.image_url || legend.image,
      coordinates: { lat: poi.latitude, lng: poi.longitude }
    }))
  );

  return (
    <div className="screen-full bg-background flex flex-col h-full">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-primary/95 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('home')}
              className="text-primary-foreground hover:bg-background/10 p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center overflow-hidden shadow-sm">
              {brand?.logoUrl ? (
                <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-xl font-serif font-bold text-primary">
                  {brand?.name?.[0] || PxxConfig.appName[0]}
                </span>
              )}
            </div>
            <h1 className="text-lg font-serif font-bold text-primary-foreground">
              {brand?.name || PxxConfig.appName}
            </h1>
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
              onClick={() => setShowFilters(!showFilters)}
              className="text-primary-foreground hover:bg-background/10"
            >
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Filtres de categoria */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="mt-3 overflow-hidden"
          >
            <div className="flex gap-2 overflow-x-auto pb-2">
              {locations.map((loc) => (
                <Button
                  key={loc.id}
                  variant={activeCategory === loc.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(loc.id)}
                  className={`whitespace-nowrap flex-shrink-0 ${activeCategory === loc.id
                    ? "bg-background text-primary"
                    : "border-primary-foreground text-primary-foreground hover:bg-background/10"
                    }`}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: loc.color }}
                  ></div>
                  {loc.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {/* GPS Status Badge */}
        <div className="flex mt-2 items-center space-x-2">
          {geoError ? (
            <>
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }} className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[10px] text-red-100 uppercase font-bold tracking-wider italic">{geoError}</span>
            </>
          ) : !userLocation ? (
            <>
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-[10px] text-primary-foreground/70 uppercase font-bold tracking-wider italic">Buscant senyal GPS...</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-[10px] text-primary-foreground/70 uppercase font-bold tracking-wider">Senyal GPS actiu</span>
            </>
          )}
        </div>
      </div>

      {/* Mapa principal */}
      <div className="relative w-full h-full bg-gray-100">
        <MapLibreMap
          center={
            selectedLegend
              ? [
                selectedLegend.coordinates?.lng || selectedLegend.longitude || 0.9870,
                selectedLegend.coordinates?.lat || selectedLegend.latitude || 42.4140
              ]
              : (userLocation ? [userLocation.longitude, userLocation.latitude] : [0.9870, 42.4140])
          }
          zoom={selectedLegend ? 14 : 10} // Closer zoom for specific legend
          userLocation={userLocation}
        >

          {allMapPoints.map((poi, index) => (
            <Marker
              key={`${poi.id}-${index}`}
              longitude={poi.longitude}
              latitude={poi.latitude}
              anchor="bottom"
            >
              <div
                className="relative cursor-pointer hover:scale-110 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("POI CLICKED:", poi.title);
                  setSelectedLegend(poi);
                }}
              >
                {(() => {
                  const iconSrc = getPoiIconSrc(poi, brand?.themeId);
                  return iconSrc ? (
                    <img
                      src={iconSrc}
                      className="w-10 h-10 drop-shadow-md object-contain"
                      alt={poi.title}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.fallback-lucide')) {
                          const icon = document.createElement('div');
                          icon.className = 'fallback-lucide w-8 h-8 text-primary flex items-center justify-center';
                          icon.innerHTML = '📍';
                          parent.appendChild(icon);
                        }
                      }}
                    />
                  ) : (
                    <Navigation
                      className="w-8 h-8 text-primary drop-shadow-md"
                    />
                  );
                })()}
              </div>
            </Marker>
          ))}
        </MapLibreMap>



        {/* Popup de llegenda seleccionada */}
        {selectedLegend && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-4 left-4 right-4 z-50"
            onLayoutAnimationComplete={() => console.log("Popup rendered for:", selectedLegend.title)}
          >
            <div
              className="bg-white rounded-lg p-4 shadow-xl border border-gray-200 cursor-pointer active:scale-95 transition-transform"
              onClick={() => onNavigate('legend-detail', selectedLegend)}
            >
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={selectedLegend.image}
                    alt={selectedLegend.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-medium text-primary mb-1">
                    {selectedLegend.title}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="w-3 h-3" />
                    <span>{selectedLegend.location}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {selectedLegend.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLegend(null);
                        }}
                        className="text-xs"
                      >
                        Tancar
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-primary text-primary-foreground pointer-events-none"
                      >
                        Veure detall
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
