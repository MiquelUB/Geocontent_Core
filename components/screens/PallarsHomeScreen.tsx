import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Navigation, Star, Clock, MapPin, HelpCircle } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { motion } from "motion/react";
import MapboxMap from "../map/MapboxMap";
import { Marker } from "react-map-gl/mapbox";
import { getLegends } from "@/lib/actions/content";
import { calculateDistance } from "@/lib/location";

interface PallarsHomeScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onOpenHelp: () => void;
  currentUser?: any;
}

export function PallarsHomeScreen({ onNavigate, onOpenHelp, currentUser }: PallarsHomeScreenProps) {
  const [userLocation] = useState({ lat: 42.4140, lng: 0.9870 }); // Centre Pallars
  const [nearbyLegends, setNearbyLegends] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const data = await getLegends();
      if (data) {
        const mapped = data.map((l: any) => ({
          id: l.id,
          title: l.title,
          location: l.location_name || "Pallars",
          distance: calculateDistance(
            userLocation.lat,
            userLocation.lng,
            l.latitude,
            l.longitude
          ),
          category: l.category,
          image: l.image_url,
          hero: l.hero_image_url,
          audio: l.audio_url,
          video: l.video_url,
          description: l.description,
          rating: l.rating || 4.5,
          coordinates: { lat: l.latitude, lng: l.longitude }
        }));
        setNearbyLegends(mapped);
      }
    }
    fetchData();

    // Actualitzar últim login si hi ha usuari
    // Actualitzar últim login si hi ha usuari
    if (currentUser?.id) {
      // updateLastLogin(currentUser.id); // Funció no existent
    }
  }, [userLocation, currentUser]);

  return (
    <div className="screen bg-background">
      {/* Header amb logo */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-pallars-green p-4 pb-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-pallars-cream rounded-full flex items-center justify-center">
              <span className="text-lg font-serif font-bold text-pallars-green">M</span>
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-pallars-cream">
                Mistic Pallars
              </h1>
              <p className="text-xs text-pallars-cream/80">Llegendes dels Pirineus</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenHelp}
              className="text-pallars-cream hover:bg-pallars-cream/10"
              title="Ajuda"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-pallars-cream hover:bg-pallars-cream/10"
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
        <MapboxMap
          center={[0.95, 42.4]}
          zoom={9}
          className="w-full h-full pointer-events-none" // Desactivar interacció per ser un preview
        >
          {/* Pins de llegendes properes */}
          {nearbyLegends.map((legend) => (
            <Marker
              key={legend.id}
              longitude={legend.coordinates.lng}
              latitude={legend.coordinates.lat}
              anchor="bottom"
            >
              <img
                src="/medieval_map_pin.png"
                alt="Map Pin"
                className="w-8 h-8 drop-shadow-md"
              />
            </Marker>
          ))}
        </MapboxMap>

        {/* Overlay per fer-lo clicable cap al mapa full */}
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={() => onNavigate('map')}
        ></div>

        {/* Etiqueta zona */}
        <div className="absolute bottom-4 left-4 bg-pallars-green/90 backdrop-blur-sm rounded-lg px-3 py-2 z-20">
          <p className="text-xs font-medium text-pallars-cream">
            Radi 10 km · Pallars Jussà i Sobirà
          </p>
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
          <h2 className="text-xl font-serif font-semibold text-pallars-green">
            Llegendes properes
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('legends')}
            className="text-pallars-brown hover:bg-pallars-brown/10"
          >
            Veure totes
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
                    <h3 className="font-serif font-medium text-pallars-green truncate">
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
                    <span className="text-xs bg-pallars-brown/10 text-pallars-brown px-2 py-1 rounded-full">
                      {legend.category}
                    </span>
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
